import { compareSync, hashSync } from "bcrypt";
import { Handler, Router } from "express";
import { sign, verify } from "jsonwebtoken";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { admin } from "../drizzle/schema";
import { adminSchema } from "../drizzle/validators";

export default function AuthRouter(db: BetterSQLite3Database) {
  const router = Router();

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Missing username or password" });
      return;
    }

    const user = db.select().from(admin).get();
    if (!user) {
      res.status(409).json({ error: "Admin account not registered" });
      return;
    }

    if (user.username !== username) {
      res.status(404).json({ username: "username not found" });
      return;
    }

    const pass = compareSync(password, user.password);
    if (!pass) {
      res.status(403).json({ password: "password is incorrect" });
      return;
    }

    try {
      const token = sign(
        { username: user.username },
        process.env.TOKEN_KEY || "",
        { expiresIn: "24h" }
      );
      res.json({
        username: user.username,
        token,
      });
    } catch (error) {
      res.status(500).json(error);
    }
  });

  router.post("/register", async (req, res) => {
    const parsed = adminSchema.safeParse(req.body);
    if (parsed.success) {
      const user = db.select().from(admin).get();
      if (user) {
        res.status(409).json({ error: "Admin account already registered" });
        return;
      }

      try {
        db.insert(admin)
          .values({
            username: parsed.data.username,
            password: hashSync(parsed.data.password, 10),
          })
          .run();
        const token = sign(
          { username: parsed.data.username },
          process.env.TOKEN_KEY || "",
          { expiresIn: "24h" }
        );
        res.json({
          username: parsed.data.username,
          token,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to create admin user" });
        return;
      }
    } else {
      res.status(400).json({ ...parsed.error, error: "validation-error" });
    }
  });

  router.post("/validate", (req, res) => {
    try {
      verify(req.body.token, process.env.TOKEN_KEY || "");
      res.send();
    } catch (error) {
      res.status(403).send();
    }
  });

  return router;
}

export const withAuth: Handler = (req, res, next) => {
  try {
    const token: any = req.query.token;
    verify(token, process.env.TOKEN_KEY || "");
    next();
  } catch (error) {
    res.status(403).send();
  }
};
