import { InferModel } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const pins = sqliteTable("pins", {
  channel: integer("channel").primaryKey().notNull(),
  label: text("label").notNull(),
  onState: text("on_state", { enum: ["HIGH", "LOW"] }).notNull(),
});

export type Pin = InferModel<typeof pins>;
export type NewPin = Pin;

export const crons = sqliteTable("crons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cron: text("cron").notNull(),
  label: text("label").notNull(),
});

export type Cron = InferModel<typeof crons>;
export type NewCron = InferModel<typeof crons, "insert">;

export const sequences = sqliteTable("sequences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  lastRun: text("last_run"),
  active: text("active", { enum: ["activated", "deactivated"] })
    .notNull()
    .default("deactivated"),
});

export type Sequence = InferModel<typeof sequences>;
export type NewSequence = InferModel<typeof sequences, "insert">;

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channel: integer("channel")
    .references(() => pins.channel)
    .notNull(),
  duration: integer("duration").notNull(),
  offset: integer("offset").notNull(),
  sequenceId: integer("sequence_id")
    .references(() => sequences.id)
    .notNull(),
});

export type Order = InferModel<typeof orders>;
export type NewOrder = InferModel<typeof orders, "insert">;

export const sequencesEvents = sqliteTable("sequences_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  sequenceId: integer("sequence_id")
    .references(() => sequences.id)
    .notNull(),
  eventType: text("event_type", {
    enum: ["run", "stop", "finish", "activate", "deactivate"],
  }).notNull(),
});

export type SequenceEvent = InferModel<typeof sequencesEvents>;
export type NewSequenceEvent = InferModel<typeof sequencesEvents, "insert">;

export const cronSequences = sqliteTable("cron_sequence", {
  cronId: integer("cron_id")
    .references(() => crons.id)
    .notNull(),
  sequenceId: integer("sequence_id")
    .references(() => sequences.id)
    .notNull(),
});

export type CronSequence = InferModel<typeof cronSequences>;
export type NewCronSequence = InferModel<typeof cronSequences, "insert">;

export const admin = sqliteTable("admin", {
  username: text("username").primaryKey().notNull(),
  password: text("password").notNull(),
});

export type Admin = InferModel<typeof admin>;
export type NewAdmin = InferModel<typeof admin, "insert">;
