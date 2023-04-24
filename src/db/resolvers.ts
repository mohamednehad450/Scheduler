import JSONDb from "./JSONDb";
import {
  BaseCron,
  BaseSequence,
  BaseSequenceEvent,
  Cron,
  CronSequence,
  Sequence,
  SequenceEvent,
} from "./types";

export const resolveSequence =
  (
    cronSequenceDb: JSONDb<void, CronSequence>,
    cronDb: JSONDb<BaseCron["id"], BaseCron>
  ) =>
  (base: BaseSequence): Sequence => {
    const cronsIds = cronSequenceDb.findBy((cs) => cs.sequenceId === base.id);
    const crons = cronsIds.map(({ cronId }) => cronDb.findByKey(cronId));
    return {
      ...base,
      crons: crons.filter((c) => c) as BaseCron[],
    };
  };

export const resolveCron =
  (
    cronSequenceDb: JSONDb<void, CronSequence>,
    sequenceDb: JSONDb<BaseSequence["id"], BaseSequence>
  ) =>
  (cron: BaseCron): Cron => {
    const sequencesIds = cronSequenceDb.findBy((cs) => cs.cronId === cron.id);
    const sequences = sequencesIds
      .map(({ sequenceId }) => sequenceDb.findByKey(sequenceId))
      .filter((s) => s) as BaseSequence[];
    return {
      ...cron,
      sequences: sequences.map(({ id, name, active }) => ({
        id,
        name,
        active,
      })),
    };
  };

export const resolveSequenceEvent =
  (sequenceDb: JSONDb<BaseSequence["id"], BaseSequence>) =>
  (event: BaseSequenceEvent): SequenceEvent => {
    const seq = sequenceDb.findByKey(event.sequenceId);
    return {
      ...event,
      sequence: { name: seq?.name || "Not found or removed." },
    };
  };
