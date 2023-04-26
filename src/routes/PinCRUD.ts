import { Router } from "express";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { orders, pins } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { pinSchema } from "../drizzle/validators";
import { PinEmitter } from "./emitters";

export default function PinCRUD(
  db: BetterSQLite3Database,
  emitter: PinEmitter
): Router {
  const router = Router();
  // List all objects
  router.get("/", (req, res) => {
    try {
      res.json(
        db.transaction((tx) => {
          return tx.select().from(pins).all();
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
        const item = tx.select().from(pins).where(eq(pins.channel, id)).get();
        return item || undefined;
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
      const parsed = pinSchema.safeParse(req.body);
      if (parsed.success) {
        const result = db.transaction((tx) => {
          if (
            tx
              .select()
              .from(pins)
              .where(eq(pins.channel, parsed.data.channel || -1))
              .get()
          )
            return undefined;
          const pin = tx.insert(pins).values(parsed.data).returning().get();
          emitter.emit("insert", pin);
          return pin;
        });
        if (!result) {
          res.status(400);
          res.json({ error: "pin-already-exist" });
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
        tx.delete(orders).where(eq(orders.channel, id)).run();
        return tx.delete(pins).where(eq(pins.channel, id)).run();
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
      const parsed = pinSchema.omit({ channel: true }).safeParse(req.body);
      if (parsed.success) {
        const result = db.transaction((tx) => {
          const newPin = tx.update(pins).set(parsed.data).returning().get();
          if (!newPin) return undefined;
          emitter.emit("update", newPin);
          return newPin;
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
      const parsed = pinSchema
        .omit({ channel: true })
        .partial()
        .safeParse(req.body);

      if (parsed.success) {
        const result = db.transaction((tx) => {
          const oldPin = tx
            .select()
            .from(pins)
            .where(eq(pins.channel, id))
            .get();
          if (!oldPin) return undefined;

          const newPin = tx.update(pins).set(parsed.data).returning().get();
          emitter.emit("update", newPin);
          return newPin;
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
