import { Router } from "express";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { Cron, cronSequences, crons, sequences } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { SQLiteTransaction } from "drizzle-orm/sqlite-core";
import Database from "better-sqlite3";
import { CronEmitter } from "./emitters";
import { cronSchema } from "../drizzle/validators";

export const resolveCron = (
  base: Cron,
  tx: BetterSQLite3Database | SQLiteTransaction<"sync", Database.RunResult>
) => {
  return {
    ...base,
    sequences: tx
      .select({
        id: sequences.id,
        name: sequences.name,
        active: sequences.active,
      })
      .from(cronSequences)
      .leftJoin(crons, eq(cronSequences.cronId, crons.id))
      .leftJoin(sequences, eq(cronSequences.sequenceId, sequences.id))
      .where(eq(crons.id, base.id))
      .all()
      .map((s) => ({ ...s, active: s.active === "activated" })),
  };
};

export const deleteCron = (
  id: Cron["id"],
  db: BetterSQLite3Database | SQLiteTransaction<"sync", Database.RunResult>
) => {
  db.delete(cronSequences).where(eq(cronSequences.cronId, id)).run();
  return db.delete(crons).where(eq(crons.id, id)).run();
};

export default function CronCRUD(
  db: BetterSQLite3Database,
  emitter: CronEmitter
): Router {
  const router = Router();
  // List all objects
  router.get("/", (req, res) => {
    try {
      res.json(
        db.transaction((tx) => {
          const bases = tx.select().from(crons).all();
          return bases.map((b) => resolveCron(b, tx));
        })
      );
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  // Get object
  router.get("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400);
      res.json({ error: "invalid-id" });
      return;
    }
    try {
      const result = db.transaction((tx) => {
        const item = tx.select().from(crons).where(eq(crons.id, id)).get();
        if (item) return resolveCron(item, tx);
        return undefined;
      });

      if (!result) {
        res.status(404);
        res.json({ error: "not-found" });
        return;
      }

      res.json(result);
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  // Create new object
  router.post("/", (req, res) => {
    try {
      const parsed = cronSchema.omit({ id: true }).safeParse(req.body);
      if (parsed.success) {
        const result = db.transaction((tx) => {
          const newCron = tx
            .insert(crons)
            .values(parsed.data)
            .returning()
            .get();
          emitter.emit("insert", newCron);
          return resolveCron(newCron, tx);
        });
        res.json(result);
      } else {
        res.status(400);
        res.json({ ...parsed.error, error: "validation-error" });
      }
    } catch (error: any) {
      res.status(500);
      res.json(error);
    }
  });

  // Delete an object
  router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400);
      res.json({ error: "invalid-id" });
      return;
    }
    try {
      const result = db.transaction((tx) => {
        return deleteCron(id, tx);
      });
      if (result.changes < 1) {
        res.status(404);
        res.json({ error: "not-found" });
        return;
      }

      emitter.emit("remove", id);
      res.send();
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  // Updates an object completely
  router.put("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400);
      res.json({ error: "invalid-id" });
      return;
    }

    try {
      const parsed = cronSchema.omit({ id: true }).safeParse(req.body);
      if (parsed.success) {
        const result = db.transaction((tx) => {
          const newCron = tx
            .update(crons)
            .set(parsed.data)
            .where(eq(crons.id, id))
            .returning()
            .get();
          emitter.emit("update", newCron);
          return resolveCron(newCron, tx);
        });
        if (!result) {
          res.status(404);
          res.json({ error: "not-found" });
          return;
        }
        res.json(result);
      } else {
        res.status(400);
        res.json({ ...parsed.error, error: "validation-error" });
      }
    } catch (error: any) {
      res.status(500);
      res.json(error);
    }
  });

  // Updates an object
  router.patch("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400);
      res.json({ error: "invalid-id" });
      return;
    }
    try {
      const parsed = cronSchema
        .omit({ id: true })
        .partial()
        .safeParse(req.body);

      if (parsed.success) {
        const result = db.transaction((tx) => {
          const oldCron = tx.select().from(crons).where(eq(crons.id, id)).get();
          if (!oldCron) return undefined;
          const newCron = tx
            .update(crons)
            .set(parsed.data)
            .where(eq(crons.id, id))
            .returning()
            .get();
          emitter.emit("update", newCron);
          return resolveCron(newCron, tx);
        });
        if (!result) {
          res.status(404);
          res.json({ error: "not-found" });
          return;
        }

        res.json(result);
      } else {
        res.status(400);
        res.json({ ...parsed.error, error: "validation-error" });
      }
    } catch (error: any) {
      res.status(500);
      res.json(error);
    }
  });

  return router;
}
