import { createInsertSchema } from "drizzle-zod";
import { pins, crons, sequences, orders, Sequence, admin } from "./schema";
import { z } from "zod";
import { time } from "cron";
import {
  overlappingOrdersValidator,
  ValidChannel,
  isValidChannel,
} from "./helpers";

export const pinSchema = createInsertSchema(pins, {
  channel: z.custom<ValidChannel>(isValidChannel),
});

const baseOrderSchema = createInsertSchema(orders, {
  duration: z.number().min(10),
  offset: z.number().min(0),
  channel: z.custom<ValidChannel>(isValidChannel),
}).pick({
  duration: true,
  offset: true,
  channel: true,
});

type Order = z.infer<typeof baseOrderSchema>;

const ordersSchema = z
  .array(baseOrderSchema)
  .pipe(z.custom<Order[]>(overlappingOrdersValidator));

export const sequenceSchema = createInsertSchema(sequences, {
  active: z
    .boolean()
    .default(false)
    .transform<Sequence["active"]>((data) =>
      data ? "activated" : "deactivated"
    ),
}).extend({
  orders: ordersSchema,
});

export const cronSchema = createInsertSchema(crons, {
  cron: z.string().pipe(
    z.custom<string>((data) => {
      try {
        time(data as string);
        return true;
      } catch (error) {
        return false;
      }
    }, "invalid-cron-expression")
  ),
});

export const adminSchema = createInsertSchema(admin, {
  username: z.string().min(0).max(128),
  password: z
    .string()
    .regex(
      /^(?=[^A-Z]*[A-Z])(?=[^a-z]*[a-z])(?=[^0-9]*[0-9]).{6,}$/,
      "weak password"
    ),
});
