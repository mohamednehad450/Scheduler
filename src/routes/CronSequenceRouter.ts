import { Router } from "express";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { cronSequences, crons, sequences } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { resolveSequence } from "./SequenceCRUD";
import { resolveCron } from "./CronCRUD";

export default function CronSequenceRouter(db: BetterSQLite3Database) {
  const router = Router();
  // Link a Sequence to a list of crons
  router.post("/sequence/:id", (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400);
      res.json({ error: "invalid-id" });
      return;
    }

    try {
      const sequence = db
        .select()
        .from(sequences)
        .where(eq(sequences.id, id))
        .get();
      if (!sequence) {
        res.status(404);
        res.json({ error: "not-found" });
        return;
      }
      const parsed = z.array(z.number()).safeParse(req.body);
      if (parsed.success) {
        try {
          const result = db.transaction((tx) => {
            tx.delete(cronSequences)
              .where(eq(cronSequences.sequenceId, id))
              .run();
            parsed.data.length &&
              tx
                .insert(cronSequences)
                .values(
                  parsed.data.map((cronId) => ({
                    cronId,
                    sequenceId: sequence.id,
                  }))
                )
                .run();
            return resolveSequence(sequence, tx);
          });
          res.json(result);
        } catch (error) {
          res.status(400);
          res.json({ error: "invalid-cron-ids" });
        }
      } else {
        res.status(400);
        res.json({ ...parsed.error, error: "validation-error" });
        return;
      }
    } catch (error: any) {
      res.status(500);
      res.json(error);
    }
  });
  // Link a cron to a list of Sequences
  router.post("/cron/:id", (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400);
      res.json({ error: "invalid-id" });
      return;
    }
    try {
      const cron = db.select().from(crons).where(eq(crons.id, id)).get();
      if (!cron) {
        res.status(404);
        res.json({ error: "not-found" });
        return;
      }
      const parsed = z.array(z.number()).safeParse(req.body);
      if (parsed.success) {
        try {
          const result = db.transaction((tx) => {
            tx.delete(cronSequences).where(eq(cronSequences.cronId, id)).run();
            parsed.data.length &&
              tx
                .insert(cronSequences)
                .values(
                  parsed.data.map((sequenceId) => ({
                    sequenceId,
                    cronId: cron.id,
                  }))
                )
                .run();
            return resolveCron(cron, tx);
          });
          res.json(result);
        } catch (error) {
          res.status(400);
          res.json({ error: "invalid-sequence-ids", err: error });
        }
      } else {
        res.status(400);
        res.json({ ...parsed.error, error: "validation-error" });
        return;
      }
    } catch (error: any) {
      res.status(500);
      res.json(error);
    }
  });

  return router;
}
