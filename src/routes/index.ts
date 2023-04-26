import { Express } from "express";
import { Server } from "socket.io";
import SchedulerIO from "./SchedulerIO";
import AuthRouter, { withAuth } from "./AuthRouter";
import CronSequenceRouter from "./CronSequenceRouter";
import DeviceRouter from "./DeviceRouter";
import SequenceCRUD from "./SequenceCRUD";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { CronEmitter, PinEmitter, SequenceEmitter } from "./emitters";
import PinCRUD from "./PinCRUD";
import CronCRUD from "./CronCRUD";
import SequenceEventCRUD from "./SequenceEventCRUD";

const routes = {
  SEQUENCE: "/sequence",
  PIN: "/pin",
  CRON: "/cron",
  EVENTS: {
    SEQUENCE: "/event/sequence",
  },
  LINK: "/link",
  // /link/cron/:id and /link/sequence/:id are created with cronSequenceLink
  AUTH: "/auth",
  ACTION: "/action",
};

export default (app: Express, io: Server, db: BetterSQLite3Database) => {
  const sequenceEmitter = new SequenceEmitter();
  const pinEmitter = new PinEmitter();
  const cronEmitter = new CronEmitter();

  const sequenceCRUD = SequenceCRUD(db, sequenceEmitter);
  const pinCRUD = PinCRUD(db, pinEmitter);
  const cronCRUD = CronCRUD(db, cronEmitter);
  const sequenceEventCRUD = SequenceEventCRUD(db);
  const cronSequenceLink = CronSequenceRouter(db);
  const authRouter = AuthRouter(db);

  app.use(routes.SEQUENCE, withAuth, sequenceCRUD);
  app.use(routes.EVENTS.SEQUENCE, withAuth, sequenceEventCRUD);
  app.use(routes.CRON, withAuth, cronCRUD);
  app.use(routes.PIN, withAuth, pinCRUD);
  app.use(routes.LINK, withAuth, cronSequenceLink);
  app.use(routes.AUTH, authRouter);
  SchedulerIO(io, db, { sequenceEmitter, pinEmitter, cronEmitter }).then(
    (scheduler) => {
      app.use(routes.ACTION, withAuth, DeviceRouter(scheduler));
    }
  );
};
