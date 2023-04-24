import { AppDB } from "../db";
import PinManager from "./PinManager";
import CronManager from "./CronManager";
import { Pin, BaseCron, BaseSequence, SequenceEvent } from "../db/types";
import EventEmitter from "events";
import { activationLogger, runSequence, triggerCron } from "./utils";
import { PinManagerEvents } from "./helpers";

interface SchedulerInterface<K> {
  start: () => Promise<void>;
  run: (id: K) => Promise<string | undefined | BaseSequence>;
  running: () => K[];
  stop: (id: K) => Promise<void>;
  channelsStatus: () => Promise<{ [key: Pin["channel"]]: boolean }>;
  getReservedPins: () => { pin: Pin; sequenceId: BaseSequence["id"] }[];
  resetPinManager: () => Promise<void>;
}

class Scheduler
  extends EventEmitter
  implements SchedulerInterface<BaseSequence["id"]>
{
  pinManager: PinManager;
  db: AppDB;
  cleanup?: () => void;

  constructor(db: AppDB) {
    super();
    this.db = db;
    this.pinManager = new PinManager();
  }

  start = async () => {
    const [pins, cronTriggers, initialActivationStatus] = [
      this.db.pinDb.findAll(),
      this.db.cronDb.findAll(),
      this.db.sequenceDb.findAll(),
    ];

    await this.pinManager.start(pins);

    const cronManager = new CronManager(
      cronTriggers.map(({ id, cron }) => ({ id, cron })),
      (id) => triggerCron(id, this.db, this.pinManager)
    );

    const insertCron = ({ id, cron }: BaseCron) => {
      cronManager.insert(id, cron);
      cronManager.start(id);
    };
    const updateCron = (crons: BaseCron[]) => {
      crons.map(({ id, cron }) => cronManager.update(id, cron));
    };
    const removeCron = (ids: BaseCron["id"][]) => {
      ids.map((id) => cronManager.remove(id));
    };

    // PinDb life cycle
    this.db.pinDb.addListener("insert", this.pinManager.insert);
    this.db.pinDb.addListener("update", this.resetPinManager);
    this.db.pinDb.addListener("remove", this.resetPinManager);

    // CronDB life cycle
    this.db.cronDb.addListener("update", updateCron);
    this.db.cronDb.addListener("insert", insertCron);
    this.db.cronDb.addListener("remove", removeCron);

    const eventHandler =
      (event: SequenceEvent["eventType"]) => (id: BaseSequence["id"]) => {
        const date = new Date().toISOString();
        this.emit(event, id, date);

        try {
          this.db.sequenceEventDb.insert({
            sequenceId: id,
            eventType: event,
            date,
          } as any);
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
      this.db
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
      this.db.pinDb.removeListener("insert", this.pinManager.insert);
      this.db.pinDb.removeListener("update", this.resetPinManager);
      this.db.pinDb.removeListener("remove", this.resetPinManager);

      // Clean CronDB life cycle
      this.db.cronDb.removeListener("update", updateCron);
      this.db.cronDb.removeListener("insert", insertCron);
      this.db.cronDb.removeListener("remove", removeCron);

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

  run = async (id: BaseSequence["id"]) => {
    const sequence = this.db.sequenceDb.findByKey(id);
    if (!sequence) return; // Not found

    const result = runSequence(sequence, this.pinManager, this.db);
    if (typeof result === "string") return result; // Failed to run

    return result && this.db.resolvers.resolveSequence(result);
  };
  stop = async (id: BaseSequence["id"]) => this.pinManager.stop(id);
  resetPinManager = async () => {
    this.pinManager.cleanup && (await this.pinManager.cleanup());
    const pins = this.db.pinDb.findAll();
    await this.pinManager.start(pins);
  };
  getReservedPins: () => { pin: Pin; sequenceId: BaseSequence["id"] }[] = () =>
    this.pinManager.getReservedPins();
  channelsStatus: () => Promise<{ [key: number]: boolean }> = () =>
    this.pinManager.channelsStatus();
  running = () => this.pinManager.running();
}

export default Scheduler;
