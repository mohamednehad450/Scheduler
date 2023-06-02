import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  Cron,
  cronSequences,
  crons,
  orders,
  sequences,
  sequencesEvents,
} from "../drizzle/schema";
import { and, eq } from "drizzle-orm";
import { SequenceEmitter } from "../routes/emitters";
import { GpioManager, Sequence } from "./helpers";

function triggerCron(
  cronId: Cron["id"],
  db: BetterSQLite3Database,
  manager: GpioManager
) {
  const sequenceIds = db
    .select({
      id: sequences.id,
    })
    .from(cronSequences)
    .leftJoin(crons, eq(cronSequences.cronId, crons.id))
    .leftJoin(sequences, eq(cronSequences.sequenceId, sequences.id))
    .where(and(eq(crons.id, cronId), eq(sequences.active, "activated")))
    .orderBy(sequences.lastRun)
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

  try {
    shouldRun.forEach((s) => runSequence(s, manager, db));
  } catch (error) {
    console.error(
      `Failed to update sequences on Cronjob trigger (id:${cronId})`,
      error
    );
  }
}

function runSequence(
  sequence: Sequence,
  manager: GpioManager,
  db: BetterSQLite3Database
) {
  const result = manager.run(sequence);
  if (!result.ok) return result.err;
  return db
    .update(sequences)
    .set({ lastRun: new Date().toISOString() })
    .where(eq(sequences.id, sequence.id || -1))
    .run();
}

const activationLogger = (
  initialStatus: { [key: Sequence["id"]]: Sequence["active"] },
  db: BetterSQLite3Database,
  sequenceEmitter: SequenceEmitter
) => {
  const status = initialStatus;
  const updater = async (sequence: Omit<Sequence, "orders">) => {
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

export { triggerCron, runSequence, activationLogger };
