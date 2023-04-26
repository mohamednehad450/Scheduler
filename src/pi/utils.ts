import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  Cron,
  Order,
  Sequence,
  cronSequences,
  crons,
  orders,
  sequences,
  sequencesEvents,
} from "../drizzle/schema";
import PinManager from "./PinManager";
import gpio from "rpi-gpio";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { sequenceSchema } from "../drizzle/validators";
import { SequenceEmitter } from "../routes/emitters";

type GpioConfig = {
  validPins: readonly [
    3,
    5,
    7,
    8,
    10,
    11,
    12,
    13,
    15,
    16,
    18,
    19,
    21,
    22,
    23,
    24,
    26,
    29,
    31,
    32,
    33,
    35,
    36,
    37,
    38,
    40
  ];
  boardMode: typeof gpio.promise.MODE_BCM;
};

const config: GpioConfig = {
  validPins: [
    3, 5, 7, 8, 10, 11, 12, 13, 15, 16, 18, 19, 21, 22, 23, 24, 26, 29, 31, 32,
    33, 35, 36, 37, 38, 40,
  ] as const,
  boardMode: gpio.MODE_RPI,
};

const triggerCron = (
  cronId: Cron["id"],
  db: BetterSQLite3Database,
  pm: PinManager
) => {
  const sequenceIds = db
    .select({
      id: sequences.id,
    })
    .from(cronSequences)
    .leftJoin(crons, eq(cronSequences.cronId, crons.id))
    .leftJoin(sequences, eq(cronSequences.sequenceId, sequences.id))
    .where(and(eq(crons.id, cronId), eq(sequences.active, "activated")))
    .all();

  const shouldRun = sequenceIds.map(({ id }) => {
    return {
      ...db
        .select()
        .from(sequences)
        .where(eq(sequences.id, id || -1))
        .get(),
      orders: db
        .select({
          duration: orders.duration,
          offset: orders.offset,
          channel: orders.channel,
        })
        .from(orders)
        .where(eq(orders.sequenceId, id || -1))
        .all(),
    };
  });
  shouldRun.sort((s1, s2) => {
    if (!s1.lastRun && s2.lastRun) return 0;
    if (!s1.lastRun) return 1;
    if (!s2.lastRun) return -1;
    return Date.parse(s1.lastRun) > Date.parse(s2.lastRun) ? 1 : -1;
  });

  try {
    shouldRun.forEach((s) => runSequence(s, pm, db));
  } catch (error) {
    console.error(
      `Failed to update sequences on Cronjob trigger (id:${cronId})`,
      error
    );
  }
};

const runSequence = (
  s: Sequence & {
    orders: { duration: number; offset: number; channel: number }[];
  },
  pm: PinManager,
  db: BetterSQLite3Database
) => {
  const err = pm.run(s);
  if (err) return err;
  return db
    .update(sequences)
    .set({ lastRun: new Date().toISOString() })
    .where(eq(sequences.id, s.id || -1))
    .run();
};

const activationLogger = (
  initialStatus: { [key: Sequence["id"]]: Sequence["active"] },
  db: BetterSQLite3Database,
  sequenceEmitter: SequenceEmitter
) => {
  const status = initialStatus;
  const updater = async (sequence: Sequence) => {
    if (sequence.active !== status[sequence.id]) {
      status[sequence.id] = sequence.active;
      return db
        .insert(sequencesEvents)
        .values({
          eventType:
            sequence.active === "activated" ? "activate" : "deactivate",
          sequenceId: sequence.id,
          date: new Date().toISOString(),
        })
        .run();
    }
  };
  sequenceEmitter.addListener("update", updater);
  return () => sequenceEmitter.removeListener("update", updater);
};

function logArgs(func: string, ...args: any) {
  console.log({
    time: new Date().toLocaleTimeString(),
    func,
    args: JSON.stringify(args),
  });
}

if (process.env.NODE_ENV === "development") {
  console.warn("rpi-gpio running in dev mode");

  const channelState = new Map<number, boolean>();

  gpio.promise.destroy = async (...args) => logArgs("destroy", args);

  gpio.promise.setup = async (c, state, ...args) => {
    channelState.set(c, state === "high");
    logArgs("setup", c, state, args);
    return true;
  };
  gpio.setMode = (...args) => logArgs("setMode", args);

  gpio.promise.read = async (c, ...args) => {
    logArgs("read", c, ...args);
    return !!channelState.get(c);
  };

  gpio.promise.write = async (c, bool, ...args) => {
    channelState.set(c, bool);
    logArgs("write", c, bool, args);
    gpio.emit("change", c, bool);
  };
}

process.on("SIGTERM", async () => await gpio.promise.destroy());

export { gpio, config, triggerCron, runSequence, activationLogger };
export type { GpioConfig };
