import JSONDb from "./JSONDb";
import { BaseCron, BaseSequence, Cron, CronSequence, Sequence } from "./types";

interface CronSequenceLinkInterface {
  linkSequence: (
    sequenceId: BaseSequence["id"],
    cronsIds: BaseCron["id"][]
  ) => BaseSequence | undefined;
  linkCron: (
    cronId: BaseCron["id"],
    sequencesIds: BaseSequence["id"][]
  ) => BaseCron | undefined;
}

class CronSequenceLink implements CronSequenceLinkInterface {
  db: JSONDb<void, CronSequence>;
  sequenceDb: JSONDb<BaseSequence["id"], BaseSequence>;
  cronDb: JSONDb<BaseCron["id"], BaseCron>;

  constructor(
    db: JSONDb<void, CronSequence>,
    sequenceDb: JSONDb<BaseSequence["id"], BaseSequence>,
    cronDb: JSONDb<BaseCron["id"], BaseCron>
  ) {
    this.db = db;
    this.cronDb = cronDb;
    this.sequenceDb = sequenceDb;
  }

  linkSequence = (
    sequenceId: BaseSequence["id"],
    cronsIds: BaseCron["id"][]
  ) => {
    const exists = this.sequenceDb.exists(sequenceId);
    if (!exists) return;

    const existingCron = cronsIds
      .map(this.cronDb.findByKey)
      .filter((c) => c) as BaseCron[];
    this.db.deleteBy((cs) => cs.sequenceId === sequenceId);

    for (const cron of existingCron) {
      this.db.insert({
        cronId: cron.id,
        sequenceId,
      });
    }

    return this.sequenceDb.findByKey(sequenceId);
  };

  linkCron = (cronId: BaseCron["id"], sequencesIds: BaseSequence["id"][]) => {
    const exists = this.cronDb.exists(cronId);
    if (!exists) return;

    const existingSequences = sequencesIds
      .map(this.sequenceDb.findByKey)
      .filter((c) => c) as BaseSequence[];

    this.db.deleteBy((cs) => cs.cronId === cronId);

    for (const sequence of existingSequences) {
      this.db.insert({
        sequenceId: sequence.id,
        cronId,
      });
    }

    return this.cronDb.findByKey(cronId);
  };
}

export default CronSequenceLink;
