import PinManager from "./PinManager";
import CronManager from "./CronManager";
import EventEmitter from "events";
import { activationLogger, runSequence, triggerCron } from "./utils";
import { PinManagerEvents } from "./helpers";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  Pin,
  Sequence,
  Cron,
  crons,
  pins,
  sequences,
  SequenceEvent,
  sequencesEvents,
  orders,
} from "../drizzle/schema";
import { CronEmitter, PinEmitter, SequenceEmitter } from "../routes/emitters";
import { eq } from "drizzle-orm";
import { resolveSequence } from "../routes/SequenceCRUD";

interface SchedulerInterface<K> {
  start: () => Promise<void>;
  run: (
    id: K
  ) => Promise<string | undefined | ReturnType<typeof resolveSequence>>;
  running: () => K[];
  stop: (id: K) => Promise<void>;
  channelsStatus: () => Promise<{ [key: Pin["channel"]]: boolean }>;
  getReservedPins: () => { pin: Pin; sequenceId: Sequence["id"] }[];
  resetPinManager: () => Promise<void>;
}

class Scheduler
  extends EventEmitter
  implements SchedulerInterface<Sequence["id"]>
{
  pinManager: PinManager;
  db: BetterSQLite3Database;
  emitters: {
    sequenceEmitter: SequenceEmitter;
    pinEmitter: PinEmitter;
    cronEmitter: CronEmitter;
  };
  cleanup?: () => void;

  constructor(
    db: BetterSQLite3Database,
    emitters: {
      sequenceEmitter: SequenceEmitter;
      pinEmitter: PinEmitter;
      cronEmitter: CronEmitter;
    }
  ) {
    super();
    this.db = db;
    this.pinManager = new PinManager();
    this.emitters = emitters;
  }

  start = async () => {
    const [allPins, cronTriggers, initialActivationStatus] = [
      this.db.select().from(pins).all(),
      this.db.select().from(crons).all(),
      this.db.select().from(sequences).all(),
    ];

    await this.pinManager.start(allPins);

    const cronManager = new CronManager(
      cronTriggers.map(({ id, cron }) => ({ id, cron })),
      (id) => triggerCron(id, this.db, this.pinManager)
    );

    const insertCron = ({ id, cron }: Cron) => {
      cronManager.insert(id, cron);
      cronManager.start(id);
    };
    const updateCron = ({ cron, id }: Cron) => {
      cronManager.update(id, cron);
    };
    const removeCron = (id: Cron["id"]) => {
      cronManager.remove(id);
    };

    // PinDb life cycle
    this.emitters.pinEmitter.addListener("insert", this.pinManager.insert);
    this.emitters.pinEmitter.addListener("update", this.resetPinManager);
    this.emitters.pinEmitter.addListener("remove", this.resetPinManager);

    // CronDB life cycle
    this.emitters.cronEmitter.addListener("update", updateCron);
    this.emitters.cronEmitter.addListener("insert", insertCron);
    this.emitters.cronEmitter.addListener("remove", removeCron);

    const eventHandler =
      (event: SequenceEvent["eventType"]) => (id: Sequence["id"]) => {
        const date = new Date().toISOString();
        this.emit(event, id, date);
        try {
          this.db
            .insert(sequencesEvents)
            .values({
              sequenceId: id,
              eventType: event,
              date,
            })
            .run();
        } catch (error) {
          console.error(
            `Failed to emit SequenceEvent (id:${id}, event:${event}), database error`,
            error
          );
        }
      };

    const channelChange: PinManagerEvents["channelChange"] = (change) =>
      this.emit("channelChange", change);
    const stop = eventHandler("stop");
    const run = eventHandler("run");
    const finish = eventHandler("finish");
    const activationLoggerCleanup = activationLogger(
      initialActivationStatus.reduce(
        (acc, cur) => ({ ...acc, [cur.id]: cur.active }),
        {}
      ),
      this.db,
      this.emitters.sequenceEmitter
    );

    // PinManager events pass through
    this.pinManager.addListener("channelChange", channelChange);
    this.pinManager.addListener("stop", stop);
    this.pinManager.addListener("run", run);
    this.pinManager.addListener("finish", finish);

    // Start All Cron jobs
    cronManager.startAll();

    this.cleanup = () => {
      // Clean PinDb life cycle
      this.emitters.pinEmitter.removeListener("insert", this.pinManager.insert);
      this.emitters.pinEmitter.removeListener("update", this.resetPinManager);
      this.emitters.pinEmitter.removeListener("remove", this.resetPinManager);

      // Clean CronDB life cycle
      this.emitters.cronEmitter.removeListener("update", updateCron);
      this.emitters.cronEmitter.removeListener("insert", insertCron);
      this.emitters.cronEmitter.removeListener("remove", removeCron);

      // Clean PinManager events pass through
      this.pinManager.removeListener("channelChange", channelChange);
      this.pinManager.removeListener("stop", stop);
      this.pinManager.removeListener("run", run);
      this.pinManager.removeListener("finish", finish);
      activationLoggerCleanup();

      // Stop all Cron jobs
      cronManager.stopAll();
    };
  };

  run = async (id: Sequence["id"]) => {
    const sequence = this.db
      .select()
      .from(sequences)
      .where(eq(sequences.id, id))
      .get();
    if (!sequence) return; // Not found
    const result = runSequence(
      {
        ...sequence,
        orders: this.db
          .select()
          .from(orders)
          .where(eq(orders.sequenceId, sequence.id))
          .all(),
      },
      this.pinManager,
      this.db
    );
    if (typeof result === "string") return result; // Failed to run

    return result && resolveSequence(sequence, this.db);
  };
  stop = async (id: Sequence["id"]) => this.pinManager.stop(id);
  resetPinManager = async () => {
    this.pinManager.cleanup && (await this.pinManager.cleanup());
    const allPins = this.db.select().from(pins).all();
    await this.pinManager.start(allPins);
  };
  getReservedPins: () => { pin: Pin; sequenceId: Sequence["id"] }[] = () =>
    this.pinManager.getReservedPins();
  channelsStatus: () => Promise<{ [key: number]: boolean }> = () =>
    this.pinManager.channelsStatus();
  running = () => this.pinManager.running();
}

export default Scheduler;
