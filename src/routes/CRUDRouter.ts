import { Router } from "express";
import { DbInterface } from "../db/misc";

export default function CRUDRouter<K, BaseT, T extends BaseT>(
  db: DbInterface<K, BaseT>,
  resolver?: (item: BaseT) => T,
  stringToKey?: (s: string) => K
) {
  const router = Router();
  // List all objects
  router.get("/", (req, res) => {
    try {
      const list = resolver ? db.findAll().map(resolver) : db.findAll();
      res.json(list);
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  // Get object
  router.get("/:id", (req, res) => {
    try {
      const id = stringToKey
        ? stringToKey(req.params.id)
        : (req.params.id as any);
      const item = db.findByKey(id);
      if (item) {
        res.json(resolver ? resolver(item) : item);
        return;
      }
      res.status(404);
      res.json({ error: "NOT FOUND" });
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  // Create new object
  router.post("/", (req, res) => {
    try {
      const item = db.insert(req.body);
      res.json(resolver ? resolver(item) : item);
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

  // Delete an object
  router.delete("/:id", (req, res) => {
    try {
      const id = stringToKey
        ? stringToKey(req.params.id)
        : (req.params.id as any);
      db.deleteByKey(id);
      res.json();
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  // Updates an object completely
  router.put("/:id", (req, res) => {
    try {
      const id = stringToKey
        ? stringToKey(req.params.id)
        : (req.params.id as any);
      const item = db.update(id, req.body);
      if (!item) {
        res.status(404);
        res.json({ error: "NOT FOUND" });
        return;
      }
      res.json(resolver ? resolver(item) : item);
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

  // Updates an object
  router.patch("/:id", (req, res) => {
    try {
      const id = stringToKey
        ? stringToKey(req.params.id)
        : (req.params.id as any);
      const item = db.update(id, req.body);
      if (!item) {
        res.status(404);
        res.json({ error: "NOT FOUND" });
        return;
      }
      res.json(resolver ? resolver(item) : item);
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
