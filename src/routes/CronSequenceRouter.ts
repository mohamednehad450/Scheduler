import { Router } from "express";
import CronSequenceLink from "../db/CronSequenceLink";

export default function cronSequenceLink(cronSequence: CronSequenceLink) {
  const router = Router();
  // Link a Sequence to a list of crons
  router.post("/sequence/:id", (req, res) => {
    try {
      const sequence = cronSequence.linkSequence(req.params.id, req.body);
      if (!sequence) {
        res.status(404);
        res.json({ error: "NOT FOUND" });
        return;
      }
      res.json(sequence);
    } catch (error: any) {
      if (error.isJoi) {
        res.status(400);
        res.json({ ...error, error: "VALIDATION ERROR" });
        return;
      }
      res.status(500);
      res.json(error);
    }
  });
  // Link a cron to a list of Sequences
  router.post("/cron/:id", (req, res) => {
    try {
      const cron = cronSequence.linkCron(req.params.id, req.body);
      if (!cron) {
        res.status(404);
        res.json({ error: "NOT FOUND" });
        return;
      }
      res.json(cron);
    } catch (error: any) {
      if (error.isJoi) {
        res.status(400);
        res.json({ ...error, error: "VALIDATION ERROR" });
        return;
      }
      res.status(500);
      res.json(error);
    }
  });

  return router;
}
