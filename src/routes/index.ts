import express from "express";
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
import path from "node:path";

const routes = {
  SEQUENCE: "/api/sequence",
  PIN: "/api/pin",
  CRON: "/api/cron",
  EVENTS: {
    SEQUENCE: "/api/event/sequence",
  },
  LINK: "/api/link",
  // /link/cron/:id and /link/sequence/:id are created with cronSequenceLink
  AUTH: "/api/auth",
  ACTION: "/api/action",
};

export default (
  app: express.Express,
  io: Server,
  db: BetterSQLite3Database
) => {
  const sequenceEmitter = new SequenceEmitter();
  const pinEmitter = new PinEmitter();
  const cronEmitter = new CronEmitter();

  const sequenceCRUD = SequenceCRUD(db, sequenceEmitter);
  const pinCRUD = PinCRUD(db, pinEmitter);
  const cronCRUD = CronCRUD(db, cronEmitter);
  const sequenceEventCRUD = SequenceEventCRUD(db);
  const cronSequenceLink = CronSequenceRouter(db);
  const authRouter = AuthRouter(db);

  SchedulerIO(io, db, { sequenceEmitter, pinEmitter, cronEmitter }).then(
    (scheduler) => {
      app.use(routes.SEQUENCE, withAuth, sequenceCRUD);
      app.use(routes.EVENTS.SEQUENCE, withAuth, sequenceEventCRUD);
      app.use(routes.CRON, withAuth, cronCRUD);
      app.use(routes.PIN, withAuth, pinCRUD);
      app.use(routes.LINK, withAuth, cronSequenceLink);
      app.use(routes.AUTH, authRouter);
      app.use(routes.ACTION, withAuth, DeviceRouter(scheduler));
      const FRONTEND_DIR = process.env["FRONTEND_DIR"];
      if (FRONTEND_DIR) {
        app.use(express.static(FRONTEND_DIR));
        app.use((req, res) => {
          res.sendFile(path.join(FRONTEND_DIR, "index.html"), (err) => {
            console.error(err);
            console.error("Failed to serve frontend");
          });
        });
      } else {
        console.warn("Missing frontend path from the environment");
        console.error("Frontend static files not loaded");
      }
    }
  );
};
