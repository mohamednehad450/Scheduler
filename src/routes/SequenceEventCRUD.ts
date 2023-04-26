import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { Router } from "express";
import { sequences, sequencesEvents } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";

const PER_PAGE = 20;
const parsePagination = (page?: any, perPage?: any) => {
  const p = page ? parseInt(page) : 1;
  const perP = perPage ? parseInt(perPage) : PER_PAGE;
  return {
    page: isNaN(p) ? 1 : p,
    perPage: isNaN(perP) ? PER_PAGE : perP,
  };
};

export default function SequenceEventCRUD(db: BetterSQLite3Database) {
  const router = Router();
  // List all Events
  router.get("/", (req, res) => {
    try {
      const pagination = parsePagination(req.query.page, req.query.perPage);
      const events = db
        .select({
          sequence: { name: sequences.name },
          id: sequencesEvents.id,
          date: sequencesEvents.date,
          sequenceId: sequencesEvents.sequenceId,
          eventType: sequencesEvents.eventType,
        })
        .from(sequencesEvents)
        .leftJoin(sequences, eq(sequencesEvents.sequenceId, sequences.id))
        .orderBy(desc(sequencesEvents.date))
        .offset((pagination.page - 1) * pagination.perPage)
        .limit(pagination.perPage)
        .all();
      res.json({
        events,
        page: {
          current: pagination.page,
          perPage: pagination.perPage,
          total: db.select().from(sequencesEvents).all().length,
        },
      });
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  // List Events by Sequence
  router.get("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400);
      res.json({ error: "invalid-id" });
      return;
    }
    try {
      const pagination = parsePagination(req.query.page, req.query.perPage);
      console.log(pagination);

      const events = db
        .select({
          sequence: { name: sequences.name },
          id: sequencesEvents.id,
          date: sequencesEvents.date,
          sequenceId: sequencesEvents.sequenceId,
          eventType: sequencesEvents.eventType,
        })
        .from(sequencesEvents)
        .leftJoin(sequences, eq(sequencesEvents.sequenceId, sequences.id))
        .orderBy(desc(sequencesEvents.date))
        .where(eq(sequencesEvents.sequenceId, id))
        .offset((pagination.page - 1) * pagination.perPage)
        .limit(pagination.perPage)
        .all();

      res.json({
        events,
        page: {
          current: pagination.page,
          perPage: pagination.perPage,
          total: db
            .select()
            .from(sequencesEvents)
            .where(eq(sequencesEvents.sequenceId, id))
            .all().length,
        },
      });
    } catch (error) {
      res.status(500);
      console.log(error);

      res.json(error);
    }
  });

  // Delete Events by Sequence
  router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400);
      res.json({ error: "invalid-id" });
      return;
    }
    try {
      db.delete(sequencesEvents)
        .where(eq(sequencesEvents.sequenceId, id))
        .run();
      res.json();
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  // Delete all Events
  router.delete("/", (_, res) => {
    try {
      db.delete(sequencesEvents).run();
      res.json();
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  return router;
}
