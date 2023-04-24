import { DbInterface, ForeignDbLink } from "./misc";
import {
  BaseCron,
  BaseSequence,
  BaseSequenceEvent,
  CronSequence,
  Pin,
} from "./types";

type DbLinker<K, T, FK, FT> = (
  db: DbInterface<FK, FT>
) => ForeignDbLink<K, T, FK, FT>;

const pinSequenceLink: DbLinker<
  Pin["channel"],
  Pin,
  BaseSequence["id"],
  BaseSequence
> = (db) => ({
  db,
  onDelete: (sequence, channel) => ({
    ...sequence,
    orders: sequence.orders.filter((o) => o.channel !== channel),
  }),
  onUpdate: (sequence, { channel }, oldChannel) => {
    if (!oldChannel) return sequence;
    return {
      ...sequence,
      orders: sequence.orders.map((o) =>
        o.channel === oldChannel ? { ...o, channel } : o
      ),
    };
  },
  predict: ({ foreignItem: sequence, key: channel, oldKey: oldChannel }) =>
    sequence.orders.some((o) => o.channel === (oldChannel || channel)),
});

const sequenceEventLink: DbLinker<
  BaseSequence["id"],
  BaseSequence,
  BaseSequenceEvent["id"],
  BaseSequenceEvent
> = (db) => ({
  db,
  predict: ({ foreignItem, key, oldKey }) =>
    foreignItem.sequenceId === (oldKey || key),
  onDelete: "CASCADE",
  onUpdate: (event, sequence, oldKey) =>
    oldKey ? { ...event, sequenceId: sequence.id } : event,
});

const cronCSLink: DbLinker<BaseCron["id"], BaseCron, void, CronSequence> = (
  db
) => ({
  db,
  predict: ({ foreignItem, key, oldKey }) =>
    foreignItem.cronId === (oldKey || key),
  onDelete: "CASCADE",
  // CronSequence links are immutable since Cron and Sequence keys are
  // onUpdate: (cs, cron, oldKey) => oldKey ? ({ ...cs, cronId: cron.id }) : cs
});

const sequenceCSLink: DbLinker<
  BaseSequence["id"],
  BaseSequence,
  void,
  CronSequence
> = (db) => ({
  db,
  predict: ({ foreignItem, key, oldKey }) =>
    foreignItem.sequenceId === (oldKey || key),
  onDelete: "CASCADE",
  // CronSequence links are immutable since Cron and Sequence keys are
  // onUpdate: (cs, sequence, oldKey) => oldKey ? ({ ...cs, sequenceId: sequence.id }) : cs
});

export { pinSequenceLink, sequenceEventLink, cronCSLink, sequenceCSLink };
