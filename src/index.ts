import { config } from "dotenv";
config();
import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import routes from "./routes";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const bodyParser = require("body-parser");

const dbFolder = process.env["DATABASE_FOLDER"] || "database";

if (!existsSync(dbFolder)) {
  mkdirSync(dbFolder);
}

const sqlite = Database(join(dbFolder, "sqlite.db"));
const db = drizzle(sqlite);

migrate(db, {
  migrationsFolder: "./migrations",
});

const PORT = process.env.PORT || 8000;

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Enable Cors
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "*");
  next();
});

routes(app, io, db);
httpServer.listen(PORT);
