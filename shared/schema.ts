import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  bio: text("bio"),
  title: text("title"),
  profilePicture: text("profile_picture"),
  globalPositionScaling: integer("global_position_scaling").default(100),
  globalMaxContracts: integer("global_max_contracts"),
  globalBlockedTickers: text("global_blocked_tickers").array(),
  onboardingStep: integer("onboarding_step").default(0),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  dailyTradingStreak: integer("daily_trading_streak").default(0),
  safeTradingDays: integer("safe_trading_days").default(0),
  riskEducationCompleted: boolean("risk_education_completed").default(false),
  autoCopyEnabled: boolean("auto_copy_enabled").default(true),
  copyExitsEnabled: boolean("copy_exits_enabled").default(true),
  copyModificationsEnabled: boolean("copy_modifications_enabled").default(true),
  bidirectionalSyncEnabled: boolean("bidirectional_sync_enabled").default(false),
  notifyTrades: boolean("notify_trades").default(true),
  notifyErrors: boolean("notify_errors").default(true),
  notifyConnection: boolean("notify_connection").default(true),
  showReviewedNotifications: boolean("show_reviewed_notifications").default(true),
  copyGroupsUngroupedName: text("copy_groups_ungrouped_name").default("Ungrouped"),
  activityQueueSort: text("activity_queue_sort").default("recent"),
  activityQueueAuditFocus: text("activity_queue_audit_focus").default("all"),
  copyGroupHealthReviewFilter: text("copy_group_health_review_filter").default("all"),
  copyGroupHealthReviewsJson: text("copy_group_health_reviews_json"),
  riskFollowUpReviewsJson: text("risk_follow_up_reviews_json"),
  badges: text("badges").array().default(sql`ARRAY[]::text[]`),
  lastActiveDate: timestamp("last_active_date"),
  dailyLossLimit: decimal("daily_loss_limit", { precision: 12, scale: 2 }),
  maxDailyDrawdown: decimal("max_daily_drawdown", { precision: 12, scale: 2 }),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  bio: true,
});

export const updateUserProfileSchema = createInsertSchema(users).pick({
  bio: true,
  title: true,
  profilePicture: true,
});

export const updateGlobalRiskSettingsSchema = createInsertSchema(users).pick({
  globalPositionScaling: true,
  globalMaxContracts: true,
  globalBlockedTickers: true,
});

export const updateUserSettingsSchema = createInsertSchema(users).pick({
  autoCopyEnabled: true,
  copyExitsEnabled: true,
  copyModificationsEnabled: true,
  bidirectionalSyncEnabled: true,
  notifyTrades: true,
  notifyErrors: true,
  notifyConnection: true,
  showReviewedNotifications: true,
  copyGroupsUngroupedName: true,
  activityQueueSort: true,
  activityQueueAuditFocus: true,
  copyGroupHealthReviewFilter: true,
  copyGroupHealthReviewsJson: true,
  riskFollowUpReviewsJson: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type UpdateGlobalRiskSettings = z.infer<typeof updateGlobalRiskSettingsSchema>;
export type UpdateUserSettings = z.infer<typeof updateUserSettingsSchema>;
export type User = typeof users.$inferSelect;

export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  accountType: text("account_type").notNull(),
  tradovateUsername: text("tradovate_username"),
  tradovateAccountId: text("tradovate_account_id"),
  tradovateEnvironment: text("tradovate_environment"),
  tradeifyUsername: text("tradeify_username"),
  tradeifyAccountId: text("tradeify_account_id"),
  tradeifyApiKey: text("tradeify_api_key"),
  rithmicUsername: text("rithmic_username"),
  rithmicAccountId: text("rithmic_account_id"),
  rithmicPassword: text("rithmic_password"),
  rithmicEnvironment: text("rithmic_environment"),
  rithmicSystemName: text("rithmic_system_name"),
  rithmicExchange: text("rithmic_exchange"),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  isConnected: boolean("is_connected").default(false),
  balance: decimal("balance", { precision: 12, scale: 2 }),
  openPositions: integer("open_positions").default(0),
  pnl: decimal("pnl", { precision: 12, scale: 2 }).default('0'),
  // ── Risk mode ────────────────────────────────────────────────────────
  riskMode: text("risk_mode").default("global"),   // 'global' | 'custom'
  // ── Position limits ──────────────────────────────────────────────────
  positionScaling: integer("position_scaling").default(100),
  copySizingMode: text("copy_sizing_mode").default("MULTIPLIER"),
  fixedQuantity: integer("fixed_quantity"),
  reverseCopying: boolean("reverse_copying").default(false),
  maxContracts: integer("max_contracts"),
  maxOpenPositions: integer("max_open_positions"),
  allowedDirections: text("allowed_directions").default("both"), // 'both'|'long_only'|'short_only'
  // ── Loss limits ──────────────────────────────────────────────────────
  maxDailyLoss: decimal("max_daily_loss", { precision: 12, scale: 2 }),
  maxDailyLossPct: decimal("max_daily_loss_pct", { precision: 5, scale: 2 }),
  maxWeeklyLoss: decimal("max_weekly_loss", { precision: 12, scale: 2 }),
  maxWeeklyLossPct: decimal("max_weekly_loss_pct", { precision: 5, scale: 2 }),
  maxDrawdownPct: decimal("max_drawdown_pct", { precision: 5, scale: 2 }),
  maxConsecutiveLosses: integer("max_consecutive_losses"),
  // ── Trade filters ────────────────────────────────────────────────────
  blockedTickers: text("blocked_tickers").array(),
  allowedTickers: text("allowed_tickers").array(),        // whitelist (overrides blocked)
  maxTradesPerDay: integer("max_trades_per_day"),
  minAccountBalance: decimal("min_account_balance", { precision: 12, scale: 2 }),
  // ── Schedule ─────────────────────────────────────────────────────────
  tradingStartTime: text("trading_start_time"),            // 'HH:MM' UTC
  tradingEndTime: text("trading_end_time"),                // 'HH:MM' UTC
  tradingDays: text("trading_days").array(),               // ['mon','tue','wed','thu','fri']
  cooldownAfterLoss: integer("cooldown_after_loss"),       // minutes
  // ── Breach action ────────────────────────────────────────────────────
  onBreachAction: text("on_breach_action").default("pause"), // 'pause'|'alert'|'close_and_pause'
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

export const watchlistItems = pgTable("watchlist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  ticker: text("ticker").notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertWatchlistItemSchema = createInsertSchema(watchlistItems).omit({
  id: true,
  addedAt: true,
});

export type InsertWatchlistItem = z.infer<typeof insertWatchlistItemSchema>;
export type WatchlistItem = typeof watchlistItems.$inferSelect;

export const copyGroupActivityEvents = pgTable("copy_group_activity_events", {
  eventId: varchar("event_id").primaryKey(),
  userId: varchar("user_id").notNull(),
  groupId: varchar("group_id").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  severity: text("severity").notNull(),
  category: text("category").notNull(),
  message: text("message").notNull(),
  intentId: varchar("intent_id"),
  followerAccountId: varchar("follower_account_id"),
  detailsJson: text("details_json"),
});

export type CopyGroupActivityEvent = typeof copyGroupActivityEvents.$inferSelect;
export type InsertCopyGroupActivityEvent = typeof copyGroupActivityEvents.$inferInsert;

export const copyGroupRegistrations = pgTable("copy_group_registrations", {
  groupId: varchar("group_id").primaryKey(),
  userId: varchar("user_id").notNull(),
  groupJson: text("group_json").notNull(),
  followersJson: text("followers_json").notNull(),
  boardJson: text("board_json"),
  runtimeStateJson: text("runtime_state_json"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CopyGroupRegistration = typeof copyGroupRegistrations.$inferSelect;
export type InsertCopyGroupRegistration = typeof copyGroupRegistrations.$inferInsert;

export const positionSyncReviews = pgTable("position_sync_reviews", {
  reviewKey: varchar("review_key").primaryKey(),
  userId: varchar("user_id").notNull(),
  groupId: varchar("group_id").notNull(),
  followerAccountId: varchar("follower_account_id").notNull(),
  status: text("status").notNull(),
  note: text("note"),
  operatorName: text("operator_name"),
  operatorHistoryJson: text("operator_history_json"),
  reviewedAt: timestamp("reviewed_at"),
  simulatedAt: timestamp("simulated_at"),
  simulationId: text("simulation_id"),
  simulationFingerprint: text("simulation_fingerprint"),
  simulationSourceGeneratedAt: timestamp("simulation_source_generated_at"),
  simulationPlanJson: text("simulation_plan_json"),
  approvedAt: timestamp("approved_at"),
  handedOffAt: timestamp("handed_off_at"),
  completedManuallyAt: timestamp("completed_manually_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type PositionSyncReview = typeof positionSyncReviews.$inferSelect;
export type InsertPositionSyncReview = typeof positionSyncReviews.$inferInsert;

export const riskFollowUpReviews = pgTable("risk_follow_up_reviews", {
  reviewKey: varchar("review_key").primaryKey(),
  userId: varchar("user_id").notNull(),
  accountId: varchar("account_id").notNull(),
  status: text("status").notNull(),
  note: text("note"),
  operatorName: text("operator_name"),
  operatorHistoryJson: text("operator_history_json"),
  reviewedAt: timestamp("reviewed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RiskFollowUpReview = typeof riskFollowUpReviews.$inferSelect;
export type InsertRiskFollowUpReview = typeof riskFollowUpReviews.$inferInsert;

export const executionFollowUpReviews = pgTable("execution_follow_up_reviews", {
  reviewKey: varchar("review_key").primaryKey(),
  userId: varchar("user_id").notNull(),
  historyId: varchar("history_id").notNull(),
  status: text("status").notNull(),
  note: text("note"),
  operatorName: text("operator_name"),
  operatorHistoryJson: text("operator_history_json"),
  reviewedAt: timestamp("reviewed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ExecutionFollowUpReview = typeof executionFollowUpReviews.$inferSelect;
export type InsertExecutionFollowUpReview = typeof executionFollowUpReviews.$inferInsert;

export const copyGroupAlertReviews = pgTable("copy_group_alert_reviews", {
  reviewKey: varchar("review_key").primaryKey(),
  userId: varchar("user_id").notNull(),
  storyKey: varchar("story_key").notNull(),
  groupId: varchar("group_id").notNull(),
  status: text("status").notNull(),
  note: text("note"),
  operatorName: text("operator_name"),
  operatorHistoryJson: text("operator_history_json"),
  reviewedAt: timestamp("reviewed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CopyGroupAlertReview = typeof copyGroupAlertReviews.$inferSelect;
export type InsertCopyGroupAlertReview = typeof copyGroupAlertReviews.$inferInsert;

export const rithmicReadinessReviews = pgTable("rithmic_readiness_reviews", {
  reviewKey: varchar("review_key").primaryKey(),
  userId: varchar("user_id").notNull(),
  storyKey: varchar("story_key").notNull(),
  accountId: varchar("account_id").notNull(),
  status: text("status").notNull(),
  note: text("note"),
  operatorName: text("operator_name"),
  operatorHistoryJson: text("operator_history_json"),
  reviewedAt: timestamp("reviewed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RithmicReadinessReview = typeof rithmicReadinessReviews.$inferSelect;
export type InsertRithmicReadinessReview = typeof rithmicReadinessReviews.$inferInsert;
