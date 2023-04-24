import JSONDb from "./JSONDb";
import { BaseCron, BaseSequence, Pin } from "./types";

type ForeignKeyValidator<K, T, FK> = (db: JSONDb<K, T>) => (fk: FK) => void;

const channelsExistsValidator: ForeignKeyValidator<
  Pin["channel"],
  Pin,
  Set<Pin["channel"]>
> = (db) => (channels) => {
  const pins = Array.from(channels)
    .map((channel) => ({
      exists: db.exists(channel),
      channel,
    }))
    .filter((pin) => !pin.exists);

  if (pins.length) {
    throw new Error(
      `Channels: [${pins.map((p) => p.channel).join(", ")}] are not defined`
    );
  }
};

const sequenceExistsValidator: ForeignKeyValidator<
  BaseSequence["id"],
  BaseSequence,
  BaseSequence["id"]
> = (db) => (sequenceId) => {
  if (!db.exists(sequenceId))
    throw new Error(`Sequence: ${sequenceId} doesn't exist.`);
};

const cronExistsValidator: ForeignKeyValidator<
  BaseCron["id"],
  BaseCron,
  BaseCron["id"]
> = (db) => (cronId) => {
  if (!db.exists(cronId)) throw new Error(`Cron: ${cronId} doesn't exist.`);
};

export {
  channelsExistsValidator,
  sequenceExistsValidator,
  cronExistsValidator,
};
