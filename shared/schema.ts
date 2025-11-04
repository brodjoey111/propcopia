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
  globalPositionScaling: integer("global_position_scaling").default(100),
  globalMaxContracts: integer("global_max_contracts"),
  globalBlockedTickers: text("global_blocked_tickers").array(),
  onboardingStep: integer("onboarding_step").default(0),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  dailyTradingStreak: integer("daily_trading_streak").default(0),
  safeTradingDays: integer("safe_trading_days").default(0),
  riskEducationCompleted: boolean("risk_education_completed").default(false),
  badges: text("badges").array().default(sql`ARRAY[]::text[]`),
  lastActiveDate: timestamp("last_active_date"),
  dailyLossLimit: decimal("daily_loss_limit", { precision: 12, scale: 2 }),
  maxDailyDrawdown: decimal("max_daily_drawdown", { precision: 12, scale: 2 }),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const updateUserProfileSchema = createInsertSchema(users).pick({
  bio: true,
  profilePicture: true,
});

export const updateGlobalRiskSettingsSchema = createInsertSchema(users).pick({
  globalPositionScaling: true,
  globalMaxContracts: true,
  globalBlockedTickers: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type UpdateGlobalRiskSettings = z.infer<typeof updateGlobalRiskSettingsSchema>;
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
  riskMode: text("risk_mode").default("global"),
  positionScaling: integer("position_scaling").default(100),
  maxContracts: integer("max_contracts"),
  blockedTickers: text("blocked_tickers").array(),
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

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  likes: true,
  comments: true,
  timestamp: true,
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull(),
  followingId: varchar("following_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true,
  timestamp: true,
});

export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type Follow = typeof follows.$inferSelect;

export const traderPositions = pgTable("trader_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  symbol: text("symbol").notNull(),
  quantity: integer("quantity").notNull(),
  entryPrice: decimal("entry_price", { precision: 12, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 12, scale: 2 }),
  unrealizedPnl: decimal("unrealized_pnl", { precision: 12, scale: 2 }),
  realizedPnl: decimal("realized_pnl", { precision: 12, scale: 2 }).default('0'),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertTraderPositionSchema = createInsertSchema(traderPositions).omit({
  id: true,
  timestamp: true,
  unrealizedPnl: true,
});

export type InsertTraderPosition = z.infer<typeof insertTraderPositionSchema>;
export type TraderPosition = typeof traderPositions.$inferSelect;

export const dailySummaries = pgTable("daily_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  date: timestamp("date").notNull(),
  totalPnl: decimal("total_pnl", { precision: 12, scale: 2 }).default('0'),
  drawdown: decimal("drawdown", { precision: 12, scale: 2 }).default('0'),
  tradesExecuted: integer("trades_executed").default(0),
  riskLimitRespected: boolean("risk_limit_respected").default(true),
  streakMaintained: boolean("streak_maintained").default(true),
});

export const insertDailySummarySchema = createInsertSchema(dailySummaries).omit({
  id: true,
});

export type InsertDailySummary = z.infer<typeof insertDailySummarySchema>;
export type DailySummary = typeof dailySummaries.$inferSelect;
