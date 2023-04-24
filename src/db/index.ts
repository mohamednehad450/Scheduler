import JSONDb from "./JSONDb";
import AdminManager from "./AdminManager";
import CronSequenceLink from "./CronSequenceLink";
import {
  cronCSLink,
  pinSequenceLink,
  sequenceCSLink,
  sequenceEventLink,
} from "./dbLinks";
import {
  sequenceValidators,
  cronValidators,
  pinsValidators,
  sequenceEventsValidators,
} from "./validators";
import {
  channelsExistsValidator,
  cronExistsValidator,
  sequenceExistsValidator,
} from "./foreignKeysValidators";
import {
  resolveCron,
  resolveSequence,
  resolveSequenceEvent,
} from "./resolvers";

import type {
  Admin,
  BaseCron,
  BaseSequence,
  BaseSequenceEvent,
  Cron,
  CronSequence,
  Pin,
  Sequence,
  SequenceEvent,
} from "./types";

type AppDB = {
  sequenceDb: JSONDb<BaseSequence["id"], BaseSequence>;
  pinDb: JSONDb<Pin["channel"], Pin>;
  cronDb: JSONDb<BaseCron["id"], BaseCron>;
  cronSequenceDb: JSONDb<void, CronSequence>;
  sequenceEventDb: JSONDb<BaseSequenceEvent["id"], BaseSequenceEvent>;
  adminManager: AdminManager;
  cronSequenceLink: CronSequenceLink;
  resolvers: {
    resolveCron: (base: BaseCron) => Cron;
    resolveSequence: (base: BaseSequence) => Sequence;
    resolveSequenceEvent: (base: BaseSequenceEvent) => SequenceEvent;
  };
};

const dbFolder = process.env.DATABASE_FOLDER || "database";

const initDb = async (): Promise<AppDB> => {
  const sequenceDb = new JSONDb<BaseSequence["id"], BaseSequence>(
    dbFolder,
    "sequences",
    sequenceValidators,
    (s) => s.id
  );
  const pinDb = new JSONDb<Pin["channel"], Pin>(
    dbFolder,
    "pins",
    pinsValidators,
    (p) => p.channel
  );
  const cronDb = new JSONDb<BaseCron["id"], BaseCron>(
    dbFolder,
    "crons",
    cronValidators,
    (s) => s.id
  );
  const adminDb = new JSONDb<Admin["username"], Admin>(
    dbFolder,
    "admin",
    {},
    (u) => u.username
  );
  const sequenceEventDb = new JSONDb<
    BaseSequenceEvent["id"],
    BaseSequenceEvent
  >(dbFolder, "sequencesEvents", sequenceEventsValidators, (s) => s.id);
  const cronSequenceDb = new JSONDb<void, CronSequence>(
    dbFolder,
    "cronSequence",
    {},
    (s) => s.sequenceId + s.cronId
  );

  sequenceDb.setDefaultSort((s1, s2) => (s1.name > s2.name ? 1 : -1));
  pinDb.setDefaultSort((p1, p2) => (p1.channel > p2.channel ? 1 : -1));
  cronDb.setDefaultSort((c1, c2) => (c1.label > c2.label ? 1 : -1));
  sequenceEventDb.setDefaultSort((e1, e2) =>
    Date.parse(e1.date) > Date.parse(e2.date) ? -1 : 1
  );

  sequenceDb.init();
  pinDb.init();
  cronDb.init();
  adminDb.init();
  sequenceEventDb.init();
  cronSequenceDb.init();

  pinDb.linkForeignDb(pinSequenceLink(sequenceDb));
  sequenceDb.linkForeignDb(sequenceEventLink(sequenceEventDb));
  sequenceDb.linkForeignDb(sequenceCSLink(cronSequenceDb));
  cronDb.linkForeignDb(cronCSLink(cronSequenceDb));

  const channelsValidator = channelsExistsValidator(pinDb);
  sequenceDb.addForeignKeyValidator((s) =>
    channelsValidator(new Set(s.orders.map((o) => o.channel)))
  );

  const sequenceValidator = sequenceExistsValidator(sequenceDb);
  sequenceEventDb.addForeignKeyValidator((e) =>
    sequenceValidator(e.sequenceId)
  );
  cronSequenceDb.addForeignKeyValidator((cs) =>
    sequenceValidator(cs.sequenceId)
  );

  const cronValidator = cronExistsValidator(cronDb);
  cronSequenceDb.addForeignKeyValidator((cs) => cronValidator(cs.cronId));

  const cronSequenceLink = new CronSequenceLink(
    cronSequenceDb,
    sequenceDb,
    cronDb
  );
  const adminManager = new AdminManager(adminDb);

  return {
    sequenceDb,
    pinDb,
    cronDb,
    cronSequenceDb,
    adminManager,
    sequenceEventDb,
    cronSequenceLink,
    resolvers: {
      resolveCron: resolveCron(cronSequenceDb, sequenceDb),
      resolveSequence: resolveSequence(cronSequenceDb, cronDb),
      resolveSequenceEvent: resolveSequenceEvent(sequenceDb),
    },
  };
};

export { initDb };
export type { AppDB };
