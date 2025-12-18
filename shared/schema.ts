import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const queryHistory = pgTable("query_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sql: text("sql").notNull(),
  fusionUrl: text("fusion_url").notNull(),
  username: text("username").notNull(),
  executedAt: timestamp("executed_at").defaultNow(),
  results: json("results"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const fusionQuerySchema = z.object({
  fusionUrl: z.string().url("Please enter a valid Fusion URL"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  sql: z.string().min(1, "SQL query is required"),
  rows: z.number().int().min(1).max(100000).default(5000),
  bindVariables: z.record(z.string()).optional(),
});

export const insertQueryHistorySchema = createInsertSchema(queryHistory).omit({
  id: true,
  executedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type FusionQuery = z.infer<typeof fusionQuerySchema>;
export type QueryHistory = typeof queryHistory.$inferSelect;
export type InsertQueryHistory = z.infer<typeof insertQueryHistorySchema>;
