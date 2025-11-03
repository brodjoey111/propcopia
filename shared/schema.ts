import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  bio: text("bio"),
  profilePicture: text("profile_picture"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const updateUserProfileSchema = createInsertSchema(users).pick({
  bio: true,
  profilePicture: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type User = typeof users.$inferSelect;

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  accountType: text("account_type").notNull(),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  isConnected: boolean("is_connected").default(false),
  balance: decimal("balance", { precision: 12, scale: 2 }),
  positionScaling: integer("position_scaling").default(100),
  lastSync: timestamp("last_sync"),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  lastSync: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  masterAccountId: varchar("master_account_id").notNull(),
  symbol: text("symbol").notNull(),
  action: text("action").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 12, scale: 4 }),
  status: text("status").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  timestamp: true,
});

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
