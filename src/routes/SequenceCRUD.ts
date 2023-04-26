import { Router } from "express";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  Sequence,
  cronSequences,
  crons,
  orders,
  sequences,
  sequencesEvents,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { SQLiteTransaction } from "drizzle-orm/sqlite-core";
import Database from "better-sqlite3";
import { sequenceSchema } from "../drizzle/validators";
import { SequenceEmitter } from "./emitters";

export const resolveSequence = (
  base: Sequence,
  tx: BetterSQLite3Database | SQLiteTransaction<"sync", Database.RunResult>
) => {
  return {
    ...base,
    active: base.active === "activated",
    crons: tx
      .select({
        id: crons.id,
        cron: crons.cron,
        label: crons.label,
      })
      .from(cronSequences)
      .leftJoin(crons, eq(cronSequences.cronId, crons.id))
      .leftJoin(sequences, eq(cronSequences.sequenceId, sequences.id))
      .where(eq(sequences.id, base.id))
      .all(),
    orders: tx
      .select({
        duration: orders.duration,
        offset: orders.offset,
        channel: orders.channel,
      })
      .from(orders)
      .where(eq(orders.sequenceId, base.id))
      .all(),
  };
};

export const deleteSequence = (
  id: Sequence["id"],
  db: BetterSQLite3Database | SQLiteTransaction<"sync", Database.RunResult>
) => {
  db.delete(cronSequences).where(eq(cronSequences.sequenceId, id)).run();
  db.delete(orders).where(eq(orders.sequenceId, id)).run();
  db.delete(sequencesEvents).where(eq(sequencesEvents.sequenceId, id)).run();
  return db.delete(sequences).where(eq(sequences.id, id)).run();
};

export default function SequenceCRUD(
  db: BetterSQLite3Database,
  emitter: SequenceEmitter
): Router {
  const router = Router();
  // List all objects
  router.get("/", (req, res) => {
    try {
      res.json(
        db.transaction((tx) => {
          const bases = tx.select().from(sequences).all();
          return bases.map((b) => resolveSequence(b, tx));
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
        const item = tx
          .select()
          .from(sequences)
          .where(eq(sequences.id, id))
          .get();
        if (item) return resolveSequence(item, tx);
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
      const parsed = sequenceSchema.omit({ id: true }).safeParse(req.body);
      if (parsed.success) {
        const result = db.transaction((tx) => {
          const { orders: os, ...base } = parsed.data;
          const newSeq = tx
            .insert(sequences)
            .values({ ...base })
            .returning()
            .get();
          if (os && os.length) {
            tx.insert(orders)
              .values(os.map((o) => ({ ...o, sequenceId: newSeq.id })))
              .run();
          }
          emitter.emit("insert", newSeq);
          return resolveSequence(newSeq, tx);
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
        return deleteSequence(id, tx);
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
      const parsed = sequenceSchema.omit({ id: true }).safeParse(req.body);
      if (parsed.success) {
        const result = db.transaction((tx) => {
          const { orders: os, ...base } = parsed.data;
          const newSeq = tx
            .update(sequences)
            .set(base)
            .where(eq(sequences.id, id))
            .returning()
            .get();

          // Not found
          if (!newSeq) return undefined;

          // Remove old orders
          tx.delete(orders).where(eq(orders.sequenceId, id));

          // Create new orders
          if (os.length) {
            tx.insert(orders)
              .values(os.map((o) => ({ ...o, sequenceId: newSeq.id })))
              .run();
          }
          emitter.emit("update", newSeq);
          return resolveSequence(newSeq, tx);
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
      const parsed = sequenceSchema
        .omit({ id: true })
        .partial()
        .safeParse(req.body);

      if (parsed.success) {
        const result = db.transaction((tx) => {
          const oldSeq = tx
            .select()
            .from(sequences)
            .where(eq(sequences.id, id))
            .get();
          if (!oldSeq) return undefined;

          const { orders: os, ...newBase } = parsed.data;
          const base = { ...oldSeq, ...newBase };
          const newSeq = tx
            .update(sequences)
            .set(base)
            .where(eq(sequences.id, id))
            .returning()
            .get();

          // newSeq should always be defined
          // if (!newSeq) return undefined

          // Replace old orders if received new ones
          if (os && os.length) {
            tx.delete(orders).where(eq(orders.sequenceId, id)).run();
            tx.insert(orders)
              .values(os.map((o) => ({ ...o, sequenceId: newSeq.id })))
              .run();
          }
          emitter.emit("update", newSeq);
          return resolveSequence(newSeq, tx);
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
