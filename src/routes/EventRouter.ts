import { Router } from "express";
import { DbInterface } from "../db/misc";

const PER_PAGE = 20;
const parsePagination = (page?: any, perPage?: any) => {
  const p = page ? parseInt(page) : 1;
  const perP = perPage ? parseInt(perPage) : PER_PAGE;
  return {
    page: isNaN(p) ? p : 1,
    perPage: isNaN(perP) ? perP : PER_PAGE,
  };
};

export default function EventRouter<K, BaseT, T>(
  db: DbInterface<K, BaseT>,
  emitterKey: (item: BaseT) => K,
  resolver?: (item: BaseT) => T,
  stringToKey?: (s: string) => K
) {
  const router = Router();
  // List all Events
  router.get("/", (req, res) => {
    try {
      const pagination = parsePagination(req.query.page, req.query.perPage);
      const events = resolver
        ? db.findAll(pagination).map(resolver)
        : db.findAll(pagination);
      res.json({
        events,
        page: {
          current: pagination.page,
          perPage: pagination.perPage,
          total: db.count(),
        },
      });
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  // List Events by Emitter
  router.get("/:id", (req, res) => {
    try {
      const pagination = parsePagination(req.query.page, req.query.perPage);
      const id = stringToKey
        ? stringToKey(req.params.id)
        : (req.params.id as any);
      const predict = (item: BaseT) => emitterKey(item) === id;
      const events = resolver
        ? db.findBy(predict, pagination).map(resolver)
        : db.findBy(predict, pagination);
      res.json({
        events,
        page: {
          current: pagination.page,
          perPage: pagination.perPage,
          total: db.countBy(predict),
        },
      });
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  // Delete Events by Emitter
  router.delete("/:id", (req, res) => {
    try {
      const id = stringToKey
        ? stringToKey(req.params.id)
        : (req.params.id as any);
      const predict = (item: BaseT) => emitterKey(item) === id;
      db.deleteBy(predict);
      res.json();
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  // Delete all Events
  router.delete("/", (_, res) => {
    try {
      db.deleteAll();
      res.json();
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  });

  return router;
}
