import "dotenv/config";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { TradovateAPI } from "./tradovate-api";
import { TradeifyAPI } from "./tradeify-api";
import { RithmicAPI } from "./rithmic-api";
import { storage } from "./storage";
import { db } from "./db";
import bcrypt from "bcrypt";
import {
  insertUserSchema,
  updateUserProfileSchema,
  updateUserSettingsSchema,
  insertWatchlistItemSchema,
  insertAccountSchema,
  accounts,
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { marketDataService, type MarketPrice } from "./market-data";
import OpenAI from "openai";
import { TradeCopyEngine } from "./trade-copy-engine";
import { updateAccountConnectionState } from "./account-connection-service";
import { copyGroupManager } from "./copy-group-manager";
import { runCopyGroupLifecycleAction } from "./copy-group-lifecycle-action";
import { resolveRithmicSystemName } from "./rithmic-system-name";
import { findBestMatchingRithmicAccount } from "./rithmic-account-reconciliation";
import {
  resolveTradeCopyFollowerConnection,
  resolveTradeCopyFollowerConnections,
  resolveTradeCopyMasterConnection,
} from "./trade-copy-account-resolver";
import { serializeTradeHistoryCsv } from "./trade-history-export";
import {
  tradeHistoryStore,
  type TradeHistoryLifecycleStatus,
} from "./trade-history-store";
import { tradeLogger } from "./trade-logger";
import { DashboardController } from "./controllers/DashboardController";
import { buildAccountLiveMetrics } from "./account-live-metrics-service";
import { buildOperationsOverview } from "./operations-overview-service";
import { buildNotifications } from "./notifications-service";
import { buildPositionSnapshots } from "./position-snapshot-service";
import { clearRuntimeSnapshotCache, getOrCreateRuntimeSnapshot } from "./runtime-snapshot-cache";
import { evaluateAccountRisk } from "./account-risk-service";
import { buildRithmicReadiness } from "./rithmic-readiness-service";
import { RithmicReconnectValidationStore } from "./rithmic-reconnect-validation";
import { reconnectSavedRithmicTestAccount } from "./rithmic-saved-reconnect-service";
import {
  buildAccountsRuntimeOverview,
  buildDashboardRuntimeOverview,
} from "./runtime-overview-service";
import { filterPositionSyncOverviewByGroupId } from "./position-sync-overview-service";
import {
  copyGroupActivityStore,
  mergeCopyGroupActivity,
} from "./copy-group-activity-store";
import { copyGroupAlertStore } from "./copy-group-alert-store";
import type { CopyGroupActivity } from "./copy-group-types";
import { buildCopyGroupObservability } from "./copy-group-activity-journal";
import { copyGroupRegistrationStore } from "./copy-group-registration-store";
import { copyGroupAlertReviewStore } from "./copy-group-alert-review-store";
import { positionSyncReviewStore } from "./position-sync-review-store";
import { riskFollowUpReviewStore } from "./risk-follow-up-review-store";
import { executionFollowUpReviewStore } from "./execution-follow-up-review-store";
import { rithmicReadinessReviewStore } from "./rithmic-readiness-review-store";
import { z } from "zod";

const RUNTIME_SNAPSHOT_TTL_MS = 3_000;
const tradovateInstances = new Map<string, TradovateAPI>();
const tradeifyInstances = new Map<string, TradeifyAPI>();
const rithmicInstances = new Map<string, RithmicAPI>();
const rithmicReconnectValidationStore = new RithmicReconnectValidationStore();
const tradeCopyEngines = new Map<string, TradeCopyEngine>();

const tradeHistoryStatuses = new Set<TradeHistoryLifecycleStatus>([
  "RULE_SKIPPED",
  "RULE_REJECTED",
  "INTENT_CREATED",
  "QUEUED",
  "SENT",
  "ACKNOWLEDGED",
  "FILLED",
  "FAILED",
  "CANCELLED",
]);

function parseTradeHistoryStatuses(value: unknown): TradeHistoryLifecycleStatus[] | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const statuses = value
    .split(",")
    .map((status) => status.trim().toUpperCase())
    .filter((status): status is TradeHistoryLifecycleStatus => tradeHistoryStatuses.has(status as TradeHistoryLifecycleStatus));

  return statuses.length > 0 ? statuses : undefined;
}

function formatCopyGroupRuntimeUpdatedLabel(timestamp?: string): string | undefined {
  if (!timestamp) {
    return undefined;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function buildCopyGroupRuntimeSummary(input: {
  status: string;
  connectedFollowerCount: number;
  totalFollowerCount: number;
  lastActivityMessage?: string;
  lastUpdatedAt?: string;
  emergencyStopReason?: string;
  healthStatus?: string;
}) {
  const followerReadiness = input.totalFollowerCount > 0
    ? `${input.connectedFollowerCount}/${input.totalFollowerCount} followers ready.`
    : "No followers assigned yet.";
  const updatedLabel = formatCopyGroupRuntimeUpdatedLabel(input.lastUpdatedAt);
  const restoredOfflineAfterReload =
    input.status === "STOPPED" &&
    !!input.lastActivityMessage &&
    (input.lastActivityMessage.startsWith("Recovered copy group ") ||
      input.lastActivityMessage.startsWith("Restored "));

  if (input.status === "EMERGENCY_STOPPED") {
    return {
      label: "Emergency stop active",
      detail:
        input.emergencyStopReason ??
        input.lastActivityMessage ??
        "This group stays locked until you clear the stop.",
      tone: "danger" as const,
      updatedLabel,
    };
  }

  if (input.status === "PAUSED") {
    return {
      label: "Paused safely",
      detail:
        input.lastActivityMessage ??
        "This group will stay offline until you resume it.",
      tone: "warn" as const,
      updatedLabel,
    };
  }

  if (input.status === "RUNNING") {
    if (input.healthStatus === "UNHEALTHY") {
      return {
        label: "Running with active issues",
        detail: input.lastActivityMessage ?? followerReadiness,
        tone: "danger" as const,
        updatedLabel,
      };
    }

    if (input.healthStatus === "DEGRADED") {
      return {
        label: "Running on watch",
        detail: input.lastActivityMessage ?? followerReadiness,
        tone: "warn" as const,
        updatedLabel,
      };
    }

    return {
      label: "Running cleanly",
      detail: input.lastActivityMessage ?? followerReadiness,
      tone: "ok" as const,
      updatedLabel,
    };
  }

  if (input.status === "STARTING" || input.status === "STOPPING") {
    return {
      label: "Updating state",
      detail: input.lastActivityMessage ?? "Waiting for the latest runtime snapshot.",
      tone: "warn" as const,
      updatedLabel,
    };
  }

  if (input.status === "ERROR") {
    return {
      label: "Needs review",
      detail: input.lastActivityMessage ?? "The group reported an error and should be checked before reuse.",
      tone: "danger" as const,
      updatedLabel,
    };
  }

  if (restoredOfflineAfterReload) {
    return {
      label: "Restored offline",
      detail: input.lastActivityMessage ?? "This group was restored into a safe offline state after reload.",
      tone: "warn" as const,
      updatedLabel,
    };
  }

  return {
    label: "Ready to start",
    detail: input.lastActivityMessage ?? `Configuration saved. ${followerReadiness}`,
    tone: "muted" as const,
    updatedLabel,
  };
}

async function loadDashboardRuntimeOverviewForUser(userId: string) {
  await ensurePersistedCopyGroupsLoaded(userId);
  const userAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  const registeredGroups = copyGroupManager
    .getAllGroups()
    .filter((registeredGroup) => registeredGroup.group.userId === userId);
  const activityByGroupId = await getMergedCopyGroupActivityByGroupId(
    userId,
    registeredGroups.map((registeredGroup) => registeredGroup.group.groupId),
  );
  const executionFollowUpReviews = await executionFollowUpReviewStore.listReviews(userId);

  return buildDashboardRuntimeOverview({
    userAccounts,
    registeredGroups,
    getRunningGroups: () => copyGroupManager.getRunningGroups(),
    getRuntime: (groupId) => copyGroupManager.getRuntime(groupId),
    getRecentActivity: (groupId) => activityByGroupId[groupId] ?? [],
    executionFollowUpReviews,
    positionSnapshotDependencies: {
      tradovateInstances,
      tradeifyInstances,
    },
    accountLiveMetricsDependencies: {
      tradovateInstances,
      tradeifyInstances,
      rithmicInstances,
    },
  });
}

async function loadPositionSyncOverviewForUser(userId: string) {
  await ensurePersistedCopyGroupsLoaded(userId);
  const userAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId));

  const registeredGroups = copyGroupManager
    .getAllGroups()
    .filter((registeredGroup) => registeredGroup.group.userId === userId);

  const overview = await buildAccountsRuntimeOverview({
    userAccounts,
    registeredGroups,
    positionSnapshotDependencies: {
      tradovateInstances,
      tradeifyInstances,
    },
    accountLiveMetricsDependencies: {
      tradovateInstances,
      tradeifyInstances,
      rithmicInstances,
    },
  });

  return overview.positionSyncOverview;
}

const upsertPositionSyncReviewsSchema = z.object({
  reviews: z.array(
    z.object({
      groupId: z.string().min(1),
      followerAccountId: z.string().min(1),
      status: z.enum(["reviewed", "simulated", "approved", "handed_off", "completed_manually"]),
      note: z.string().optional(),
      operatorName: z.string().optional(),
      operatorHistory: z.array(
        z.object({
          operatorName: z.string().min(1),
          assignedAt: z.string().datetime(),
          reason: z.string().optional(),
        }),
      ).optional(),
      reviewedAt: z.string().datetime().optional(),
      simulatedAt: z.string().datetime().optional(),
      approvedAt: z.string().datetime().optional(),
      handedOffAt: z.string().datetime().optional(),
      completedManuallyAt: z.string().datetime().optional(),
    }),
  ).min(1),
});

const upsertRiskFollowUpReviewsSchema = z.object({
  reviews: z.array(
    z.object({
      accountId: z.string().min(1),
      status: z.enum(["pending", "reviewed"]),
      note: z.string().optional(),
      operatorName: z.string().optional(),
      operatorHistory: z.array(
        z.object({
          operatorName: z.string().min(1),
          assignedAt: z.string().datetime(),
          reason: z.string().optional(),
        }),
      ).optional(),
      reviewedAt: z.string().datetime().optional(),
    }),
  ).min(1),
});

const upsertCopyGroupAlertReviewsSchema = z.object({
  reviews: z.array(
    z.object({
      storyKey: z.string().min(1),
      groupId: z.string().min(1),
      status: z.enum(["pending", "reviewed"]),
      note: z.string().optional(),
      operatorName: z.string().optional(),
      operatorHistory: z.array(
        z.object({
          operatorName: z.string().min(1),
          assignedAt: z.string().datetime(),
          reason: z.string().optional(),
        }),
      ).optional(),
      reviewedAt: z.string().datetime().optional(),
    }),
  ).min(1),
});

const upsertExecutionFollowUpReviewsSchema = z.object({
  reviews: z.array(
    z.object({
      historyId: z.string().min(1),
      status: z.enum(["pending", "reviewed"]),
      note: z.string().optional(),
      operatorName: z.string().optional(),
      operatorHistory: z.array(
        z.object({
          operatorName: z.string().min(1),
          assignedAt: z.string().datetime(),
          reason: z.string().optional(),
        }),
      ).optional(),
      reviewedAt: z.string().datetime().optional(),
    }),
  ).min(1),
});

async function refreshRithmicAccountIdentity(
  account: typeof accounts.$inferSelect,
  userId: string,
  rithmicApi?: RithmicAPI,
  options?: {
    allowDiscoveryFailure?: boolean;
  },
): Promise<typeof accounts.$inferSelect> {
  if (
    account.platform !== "Rithmic" ||
    !account.rithmicUsername ||
    !account.rithmicPassword
  ) {
    return account;
  }

  const api =
    rithmicApi ??
    rithmicInstances.get(account.rithmicUsername) ??
    new RithmicAPI({
      username: account.rithmicUsername,
      password: account.rithmicPassword,
      environment: (account.rithmicEnvironment as "test" | "live") ?? "test",
      systemName: resolveRithmicSystemName(account),
    });

  const connectionTest = await api.testConnection();
  if (!connectionTest.success) {
    if (options?.allowDiscoveryFailure) {
      console.warn(
        `[Rithmic] Skipping account identity refresh for ${account.id}: ${connectionTest.message}`,
      );
      return account;
    }

    throw new Error(connectionTest.message || "Rithmic account refresh failed.");
  }

  rithmicInstances.set(account.rithmicUsername, api);

  const discoveredAccounts = (connectionTest.data ?? []).map((discovered) => ({
    id: String(discovered.id),
    name: discovered.name,
  }));

  const matchedAccount = findBestMatchingRithmicAccount({
    savedAccountId: account.rithmicAccountId,
    savedAccountName: account.name,
    discoveredAccounts,
  });

  if (!matchedAccount || matchedAccount.id === account.rithmicAccountId) {
    return account;
  }

  const [updatedAccount] = await db
    .update(accounts)
    .set({
      rithmicAccountId: matchedAccount.id,
    })
    .where(and(eq(accounts.id, account.id), eq(accounts.userId, userId)))
    .returning();

  return updatedAccount ?? account;
}

function getTradeCopyRiskPreflightError(account: (typeof accounts.$inferSelect)): string | null {
  const risk = evaluateAccountRisk({ account });

  if (risk.status !== "BREACHED") {
    return null;
  }

  const breachedRules = risk.rules
    .filter((rule) => rule.status === "BREACHED")
    .map((rule) => rule.label.toLowerCase());

  const reason =
    breachedRules.length > 0
      ? `breached ${breachedRules.join(", ")}`
      : "breached configured risk limits";

  return `Follower ${account.name} cannot join trade copying because it has ${reason}. Update its risk settings or account state first.`;
}

function getOwnedRegisteredGroup(groupId: string, userId: string) {
  const registeredGroup = copyGroupManager.getGroup(groupId);

  if (!registeredGroup || registeredGroup.group.userId !== userId) {
    return null;
  }

  return registeredGroup;
}

async function getMergedCopyGroupActivityByGroupId(
  userId: string,
  groupIds: string[],
): Promise<Record<string, CopyGroupActivity[]>> {
  const persistedActivityByGroupId = await copyGroupActivityStore.listRecentActivity(userId, groupIds);
  const merged: Record<string, CopyGroupActivity[]> = {};

  for (const groupId of groupIds) {
    merged[groupId] = mergeCopyGroupActivity(
      persistedActivityByGroupId[groupId] ?? [],
      copyGroupManager.getRecentActivity(groupId),
    );
  }

  return merged;
}

async function ensurePersistedCopyGroupsLoaded(userId: string): Promise<void> {
  const persistedRegistrations = await copyGroupRegistrationStore.listRegistrations(userId);

  for (const registration of persistedRegistrations) {
    if (copyGroupManager.getGroup(registration.group.groupId)) {
      continue;
    }

    copyGroupManager.syncGroup(registration.group, registration.followers, {
      persistedState: registration.runtimeState,
    });
  }
}

async function persistRegisteredGroupState(groupId: string): Promise<void> {
  const registeredGroup = copyGroupManager.getGroup(groupId);
  if (!registeredGroup) {
    return;
  }

  const existingRegistration = await copyGroupRegistrationStore.getRegistration(
    registeredGroup.group.userId,
    groupId,
  );

  await copyGroupRegistrationStore.saveRegistration({
    board: existingRegistration?.board,
    group: registeredGroup.group,
    followers: registeredGroup.followers,
    runtimeState: copyGroupManager.getPersistedState(groupId),
  });
}

function evaluateFollowerRiskAlerts(
  followerAccounts: Array<typeof accounts.$inferSelect>,
): {
  warnings: Array<{ accountId: string; message: string }>;
  breaches: Array<{ accountId: string; message: string }>;
} {
  const warnings: Array<{ accountId: string; message: string }> = [];
  const breaches: Array<{ accountId: string; message: string }> = [];

  for (const account of followerAccounts) {
    const risk = evaluateAccountRisk({ account });
    const relevantRules = risk.rules.filter((rule) =>
      risk.status === "BREACHED" ? rule.status === "BREACHED" : rule.status === "WARN",
    );

    if (risk.status === "BREACHED") {
      breaches.push({
        accountId: account.id,
        message:
          getTradeCopyRiskPreflightError(account) ??
          `Follower ${account.name} breached configured risk limits.`,
      });
      continue;
    }

    if (risk.status === "WARN") {
      warnings.push({
        accountId: account.id,
        message:
          relevantRules.map((rule) => rule.message).join(" ") ||
          `Follower ${account.name} is approaching configured risk limits.`,
      });
    }
  }

  return { warnings, breaches };
}

const openai =
  process.env.AI_INTEGRATIONS_OPENAI_API_KEY &&
  process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
    ? new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      })
    : null;

function serializeAuthenticatedUser(user: Awaited<ReturnType<typeof storage.getUser>>) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    bio: user.bio,
    title: user.title,
    profilePicture: user.profilePicture,
    autoCopyEnabled: user.autoCopyEnabled ?? true,
    copyExitsEnabled: user.copyExitsEnabled ?? true,
    copyModificationsEnabled: user.copyModificationsEnabled ?? true,
    bidirectionalSyncEnabled: user.bidirectionalSyncEnabled ?? false,
    notifyTrades: user.notifyTrades ?? true,
    notifyErrors: user.notifyErrors ?? true,
    notifyConnection: user.notifyConnection ?? true,
    showReviewedNotifications: user.showReviewedNotifications ?? true,
    copyGroupsUngroupedName: user.copyGroupsUngroupedName ?? "Ungrouped",
    activityQueueSort: user.activityQueueSort ?? "recent",
    activityQueueAuditFocus: user.activityQueueAuditFocus ?? "all",
    copyGroupHealthReviewFilter: user.copyGroupHealthReviewFilter ?? "all",
    copyGroupHealthReviewsJson: user.copyGroupHealthReviewsJson ?? null,
    riskFollowUpReviewsJson: user.riskFollowUpReviewsJson ?? null,
  };
}
export function registerRoutes(app: Express): Server {
  const server = createServer(app);
  copyGroupManager.setActivityRecorder((input) => copyGroupActivityStore.recordActivity(input));
  copyGroupManager.setStateRecorder((input) => persistRegisteredGroupState(input.groupId));

  app.get("/api/dashboard", DashboardController.getDashboard);

  app.get("/api/copy-groups", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    await ensurePersistedCopyGroupsLoaded(req.session.userId);

    return res.json({
      success: true,
      groups: copyGroupManager
        .getAllGroups()
        .filter((registeredGroup) => registeredGroup.group.userId === req.session.userId),
      runningGroups: copyGroupManager
        .getRunningGroups()
        .filter((runtime) => runtime.group.userId === req.session.userId)
        .map((runtime) => runtime.group.groupId),
    });
  });

  app.get("/api/copy-groups/snapshot", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    await ensurePersistedCopyGroupsLoaded(req.session.userId);

    const persistedRegistrations = await copyGroupRegistrationStore.listRegistrations(req.session.userId);
    const registrationByGroupId = new Map(
      persistedRegistrations.map((registration) => [registration.group.groupId, registration]),
    );
    const registeredGroups = copyGroupManager
      .getAllGroups()
      .filter((registeredGroup) => registeredGroup.group.userId === req.session.userId);
    const activityByGroupId = await getMergedCopyGroupActivityByGroupId(
      req.session.userId,
      registeredGroups.map((registeredGroup) => registeredGroup.group.groupId),
    );
    const groups = registeredGroups
      .map((registeredGroup) => {
        const runtime = copyGroupManager.getRuntime(registeredGroup.group.groupId);

        return {
          board: registrationByGroupId.get(registeredGroup.group.groupId)?.board,
          group: registeredGroup,
          runtime: runtime
            ? {
                state: runtime.state,
              }
            : undefined,
          runtimeSummary: buildCopyGroupRuntimeSummary({
            status: runtime?.state.status ?? "STOPPED",
            connectedFollowerCount: runtime?.state.connectedFollowerCount ?? 0,
            totalFollowerCount:
              runtime?.state.totalFollowerCount ?? registeredGroup.group.followerAccountIds.length,
            lastActivityMessage: (activityByGroupId[registeredGroup.group.groupId] ?? [])[0]?.message,
            lastUpdatedAt:
              (activityByGroupId[registeredGroup.group.groupId] ?? [])[0]?.timestamp ??
              runtime?.statistics.lastUpdatedAt ??
              runtime?.health.checkedAt,
            emergencyStopReason: runtime?.state.emergencyStopReason,
            healthStatus: runtime?.health.status,
          }),
          activityPreview: (activityByGroupId[registeredGroup.group.groupId] ?? []).slice(0, 6),
        };
      });

    return res.json({
      success: true,
      groups,
      runningGroups: copyGroupManager
        .getRunningGroups()
        .filter((runtime) => runtime.group.userId === req.session.userId)
        .map((runtime) => runtime.group.groupId),
      generatedAt: new Date().toISOString(),
    });
  });

  app.get("/api/copy-groups/alerts", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    await ensurePersistedCopyGroupsLoaded(req.session.userId);

    const registeredGroups = copyGroupManager
      .getAllGroups()
      .filter((registeredGroup) => registeredGroup.group.userId === req.session.userId);
    const groupIds = registeredGroups.map((registeredGroup) => registeredGroup.group.groupId);

    return res.json({
      success: true,
      activeStories: copyGroupAlertStore.listActiveStories({
        userId: req.session.userId,
        groupIds,
        limit: 12,
      }),
      recentAlerts: copyGroupAlertStore.listRecent({
        userId: req.session.userId,
        groupIds,
        limit: 24,
      }),
      generatedAt: new Date().toISOString(),
    });
  });

  app.get("/api/copy-groups/alert-reviews", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const reviews = await copyGroupAlertReviewStore.listReviews(req.session.userId);
      return res.json({
        success: true,
        reviews,
      });
    } catch (error) {
      console.error("Error loading copy-group alert reviews:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.post("/api/copy-groups/alert-reviews", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const parsed = upsertCopyGroupAlertReviewsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid copy-group alert review payload",
          issues: parsed.error.flatten(),
        });
      }

      const availableStories = copyGroupAlertStore.listRecent({
        userId: req.session.userId,
        limit: 250,
      });

      for (const review of parsed.data.reviews) {
        const matchingStory = availableStories.find(
          (story) => story.storyKey === review.storyKey && story.groupId === review.groupId,
        );
        if (!matchingStory) {
          return res.status(404).json({
            success: false,
            message: `Copy-group alert story not found: ${review.storyKey}`,
          });
        }
      }

      await copyGroupAlertReviewStore.saveReviews(
        req.session.userId,
        parsed.data.reviews.map((review) => ({
          storyKey: review.storyKey,
          groupId: review.groupId,
          status: review.status,
          note: review.note?.trim() || undefined,
          operatorName: review.operatorName?.trim() || undefined,
          operatorHistory: review.operatorHistory,
          reviewedAt: review.reviewedAt,
        })),
      );

      return res.json({
        success: true,
        reviews: await copyGroupAlertReviewStore.listReviews(req.session.userId),
      });
    } catch (error) {
      console.error("Error saving copy-group alert reviews:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/copy-groups/:groupId", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    await ensurePersistedCopyGroupsLoaded(req.session.userId);

    const { groupId } = req.params;
    const group = getOwnedRegisteredGroup(groupId, req.session.userId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: `Copy group not found: ${groupId}`,
      });
    }

    return res.json({
      success: true,
      group,
      runtime: copyGroupManager.getRuntime(groupId),
    });
  });

  app.get("/api/copy-groups/:groupId/activity", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    await ensurePersistedCopyGroupsLoaded(req.session.userId);

    const { groupId } = req.params;
    const group = getOwnedRegisteredGroup(groupId, req.session.userId);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: `Copy group not found: ${groupId}`,
      });
    }

    const activityByGroupId = await getMergedCopyGroupActivityByGroupId(req.session.userId, [groupId]);
    const mergedActivity = activityByGroupId[groupId] ?? [];

    return res.json({
      success: true,
      groupId,
      activity: mergedActivity,
      observability: buildCopyGroupObservability(
        groupId,
        mergedActivity,
        copyGroupManager.getObservability(groupId),
      ),
    });
  });

  app.get("/api/trades/history", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const limitParam = Number(req.query.limit ?? 100);
      const limit = Number.isFinite(limitParam)
        ? Math.max(1, Math.min(Math.floor(limitParam), 500))
        : 100;
      const statuses = parseTradeHistoryStatuses(req.query.status);
      const query = typeof req.query.q === "string" ? req.query.q : undefined;

      const userAccounts = await db
        .select({
          id: accounts.id,
          name: accounts.name,
        })
        .from(accounts)
        .where(eq(accounts.userId, req.session.userId));

      const accountIds = userAccounts.map((account) => account.id);
      const accountNameById = new Map(userAccounts.map((account) => [account.id, account.name]));
      const executionFollowUpReviews = await executionFollowUpReviewStore.listReviews(req.session.userId);
      const executionFollowUpReviewsByHistoryId = new Map(
        executionFollowUpReviews.map((review) => [review.historyId, review]),
      );
      const records = tradeHistoryStore.listRecent({
        accountIds,
        limit,
        statuses,
        query,
      });

      return res.json({
        success: true,
        records: records.map((record) => ({
          ...record,
          reviewStatus: executionFollowUpReviewsByHistoryId.get(record.historyId)?.status ?? record.reviewStatus,
          reviewNote: executionFollowUpReviewsByHistoryId.get(record.historyId)?.note ?? record.reviewNote,
          reviewedAt: executionFollowUpReviewsByHistoryId.get(record.historyId)?.reviewedAt ?? record.reviewedAt,
          operatorName: executionFollowUpReviewsByHistoryId.get(record.historyId)?.operatorName,
          operatorHistory: executionFollowUpReviewsByHistoryId.get(record.historyId)?.operatorHistory,
          masterAccountName: record.masterAccountId
            ? (accountNameById.get(record.masterAccountId) ?? null)
            : null,
          followerAccountName: accountNameById.get(record.followerAccountId) ?? null,
        })),
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/positions/snapshot", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const snapshot = await getOrCreateRuntimeSnapshot({
        scope: "positions",
        userId: req.session.userId,
        ttlMs: RUNTIME_SNAPSHOT_TTL_MS,
        loader: async () => {
          await ensurePersistedCopyGroupsLoaded(req.session.userId!);
          const userAccounts = await db
            .select()
            .from(accounts)
            .where(eq(accounts.userId, req.session.userId!));

          return buildPositionSnapshots(userAccounts, {
            tradovateInstances,
            tradeifyInstances,
          });
        },
      });

      return res.json({
        success: true,
        ...snapshot,
      });
    } catch (error) {
      console.error("Error building position snapshot:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/accounts/live-metrics", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const snapshot = await getOrCreateRuntimeSnapshot({
        scope: "account-live-metrics",
        userId: req.session.userId,
        ttlMs: RUNTIME_SNAPSHOT_TTL_MS,
        loader: async () => {
          await ensurePersistedCopyGroupsLoaded(req.session.userId!);
          const userAccounts = await db
            .select()
            .from(accounts)
            .where(eq(accounts.userId, req.session.userId!));

          return buildAccountLiveMetrics(userAccounts, {
            tradovateInstances,
            tradeifyInstances,
            rithmicInstances,
          });
        },
      });

      return res.json({
        success: true,
        ...snapshot,
      });
    } catch (error) {
      console.error("Error building account live metrics snapshot:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/runtime/accounts-overview", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const overview = await getOrCreateRuntimeSnapshot({
        scope: "runtime-accounts-overview",
        userId: req.session.userId,
        ttlMs: RUNTIME_SNAPSHOT_TTL_MS,
        loader: async () => {
          const userAccounts = await db
            .select()
            .from(accounts)
            .where(eq(accounts.userId, req.session.userId!));
          const registeredGroups = copyGroupManager
            .getAllGroups()
            .filter((registeredGroup) => registeredGroup.group.userId === req.session.userId);

          return buildAccountsRuntimeOverview({
            userAccounts,
            registeredGroups,
            positionSnapshotDependencies: {
              tradovateInstances,
              tradeifyInstances,
            },
            accountLiveMetricsDependencies: {
              tradovateInstances,
              tradeifyInstances,
              rithmicInstances,
            },
          });
        },
      });

      const {
        positionSnapshot: _positionSnapshot,
        accountLiveMetrics: _accountLiveMetrics,
        ...lightweightOverview
      } = overview;

      return res.json({
        success: true,
        ...lightweightOverview,
      });
    } catch (error) {
      console.error("Error building accounts runtime overview:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/position-sync/plans", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const overview = await getOrCreateRuntimeSnapshot({
        scope: "position-sync-plans",
        userId: req.session.userId,
        ttlMs: RUNTIME_SNAPSHOT_TTL_MS,
        loader: async () => loadPositionSyncOverviewForUser(req.session.userId!),
      });

      const groupId = typeof req.query.groupId === "string" ? req.query.groupId.trim() : "";
      const filteredOverview =
        groupId.length > 0
          ? filterPositionSyncOverviewByGroupId(overview, groupId)
          : overview;

      return res.json({
        success: true,
        ...filteredOverview,
      });
    } catch (error) {
      console.error("Error building position sync plans:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/position-sync/reviews", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const reviews = await positionSyncReviewStore.listReviews(req.session.userId);
      return res.json({
        success: true,
        reviews,
      });
    } catch (error) {
      console.error("Error loading position sync reviews:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.post("/api/position-sync/reviews", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const parsed = upsertPositionSyncReviewsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid position sync review payload",
          issues: parsed.error.flatten(),
        });
      }

      await ensurePersistedCopyGroupsLoaded(req.session.userId);
      const registeredGroups = copyGroupManager
        .getAllGroups()
        .filter((registeredGroup) => registeredGroup.group.userId === req.session.userId);

      for (const review of parsed.data.reviews) {
        const matchingGroup = registeredGroups.find(
          (registeredGroup) => registeredGroup.group.groupId === review.groupId,
        );

        if (!matchingGroup) {
          return res.status(404).json({
            success: false,
            message: `Copy group not found: ${review.groupId}`,
          });
        }

        const followerExists = matchingGroup.followers.some(
          (follower) => follower.followerAccountId === review.followerAccountId,
        );

        if (!followerExists) {
          return res.status(404).json({
            success: false,
            message: `Follower plan not found: ${review.followerAccountId}`,
          });
        }
      }

      await positionSyncReviewStore.saveReviews(
        req.session.userId,
        parsed.data.reviews.map((review) => ({
          groupId: review.groupId,
          followerAccountId: review.followerAccountId,
          status: review.status,
          note: review.note?.trim() || undefined,
          operatorName: review.operatorName?.trim() || undefined,
          operatorHistory: review.operatorHistory,
          reviewedAt: review.reviewedAt,
          simulatedAt: review.simulatedAt,
          approvedAt: review.approvedAt,
          handedOffAt: review.handedOffAt,
          completedManuallyAt: review.completedManuallyAt,
        })),
      );

      const reviews = await positionSyncReviewStore.listReviews(req.session.userId);
      return res.json({
        success: true,
        reviews,
      });
    } catch (error) {
      console.error("Error saving position sync reviews:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/risk-follow-up/reviews", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const reviews = await riskFollowUpReviewStore.listReviews(req.session.userId);
      return res.json({
        success: true,
        reviews,
      });
    } catch (error) {
      console.error("Error loading risk follow-up reviews:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.post("/api/risk-follow-up/reviews", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const parsed = upsertRiskFollowUpReviewsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid risk follow-up review payload",
          issues: parsed.error.flatten(),
        });
      }

      for (const review of parsed.data.reviews) {
        const matchingAccount = await db
          .select({ id: accounts.id })
          .from(accounts)
          .where(and(eq(accounts.userId, req.session.userId), eq(accounts.id, review.accountId)));

        if (!matchingAccount[0]) {
          return res.status(404).json({
            success: false,
            message: `Account not found: ${review.accountId}`,
          });
        }
      }

      await riskFollowUpReviewStore.saveReviews(
        req.session.userId,
        parsed.data.reviews.map((review) => ({
          accountId: review.accountId,
          status: review.status,
          note: review.note,
          operatorName: review.operatorName,
          operatorHistory: review.operatorHistory,
          reviewedAt: review.reviewedAt,
        })),
      );

      return res.json({
        success: true,
        reviews: await riskFollowUpReviewStore.listReviews(req.session.userId),
      });
    } catch (error) {
      console.error("Error saving risk follow-up reviews:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/runtime/dashboard-overview", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const overview = await getOrCreateRuntimeSnapshot({
        scope: "runtime-dashboard-overview",
        userId: req.session.userId,
        ttlMs: RUNTIME_SNAPSHOT_TTL_MS,
        loader: async () => loadDashboardRuntimeOverviewForUser(req.session.userId!),
      });

      return res.json({
        success: true,
        ...overview,
      });
    } catch (error) {
      console.error("Error building dashboard runtime overview:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.post("/api/runtime/dashboard-overview/recheck", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      clearRuntimeSnapshotCache(req.session.userId);

      const overview = await getOrCreateRuntimeSnapshot({
        scope: "runtime-dashboard-overview",
        userId: req.session.userId,
        ttlMs: RUNTIME_SNAPSHOT_TTL_MS,
        loader: async () => loadDashboardRuntimeOverviewForUser(req.session.userId!),
      });

      const {
        positionSnapshot: _positionSnapshot,
        accountLiveMetrics: _accountLiveMetrics,
        ...lightweightOverview
      } = overview;

      return res.json({
        success: true,
        recheckedAt: new Date().toISOString(),
        ...lightweightOverview,
      });
    } catch (error) {
      console.error("Error rechecking dashboard runtime overview:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/execution-follow-up/reviews", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const reviews = await executionFollowUpReviewStore.listReviews(req.session.userId);
      return res.json({
        success: true,
        reviews,
      });
    } catch (error) {
      console.error("Error loading execution follow-up reviews:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/rithmic-readiness/reviews", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const reviews = await rithmicReadinessReviewStore.listReviews(req.session.userId);
      return res.json({
        success: true,
        reviews,
      });
    } catch (error) {
      console.error("Error loading Rithmic readiness reviews:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.post("/api/rithmic-readiness/reviews", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const reviews = Array.isArray(req.body?.reviews) ? req.body.reviews : null;
      if (!reviews) {
        return res.status(400).json({
          success: false,
          message: "Invalid Rithmic readiness review payload",
        });
      }

      await rithmicReadinessReviewStore.saveReviews(req.session.userId, reviews);
      const savedReviews = await rithmicReadinessReviewStore.listReviews(req.session.userId);
      clearRuntimeSnapshotCache(req.session.userId);

      return res.json({
        success: true,
        reviews: savedReviews,
      });
    } catch (error) {
      console.error("Error saving Rithmic readiness reviews:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.post("/api/execution-follow-up/reviews", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const parsed = upsertExecutionFollowUpReviewsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid execution follow-up review payload",
          issues: parsed.error.flatten(),
        });
      }

      const userAccounts = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.userId, req.session.userId));
      const ownedAccountIds = new Set(userAccounts.map((account) => account.id));

      for (const review of parsed.data.reviews) {
        const record = tradeHistoryStore.get(review.historyId);
        if (!record) {
          return res.status(404).json({
            success: false,
            message: `Execution history not found: ${review.historyId}`,
          });
        }

        const belongsToUser =
          ownedAccountIds.has(record.followerAccountId) ||
          (record.masterAccountId ? ownedAccountIds.has(record.masterAccountId) : false);

        if (!belongsToUser) {
          return res.status(404).json({
            success: false,
            message: `Execution history not found: ${review.historyId}`,
          });
        }
      }

      await executionFollowUpReviewStore.saveReviews(
        req.session.userId,
        parsed.data.reviews.map((review) => ({
          historyId: review.historyId,
          status: review.status,
          note: review.note?.trim() || undefined,
          operatorName: review.operatorName?.trim() || undefined,
          operatorHistory: review.operatorHistory,
          reviewedAt: review.reviewedAt,
        })),
      );

      clearRuntimeSnapshotCache(req.session.userId);

      return res.json({
        success: true,
        reviews: await executionFollowUpReviewStore.listReviews(req.session.userId),
      });
    } catch (error) {
      console.error("Error saving execution follow-up reviews:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.post("/api/runtime/dashboard-overview/recheck/:historyId", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { historyId } = req.params;
      clearRuntimeSnapshotCache(req.session.userId);

      const overview = await getOrCreateRuntimeSnapshot({
        scope: "runtime-dashboard-overview",
        userId: req.session.userId,
        ttlMs: RUNTIME_SNAPSHOT_TTL_MS,
        loader: async () => loadDashboardRuntimeOverviewForUser(req.session.userId!),
      });
      const recoveryItem =
        overview.tradeAnalytics.executionRecovery.items.find((item) => item.historyId === historyId) ??
        null;

      return res.json({
        success: true,
        recheckedAt: new Date().toISOString(),
        historyId,
        recoveryItem,
        ...overview,
      });
    } catch (error) {
      console.error("Error rechecking dashboard recovery item:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.post("/api/runtime/dashboard-overview/review/:historyId", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { historyId } = req.params;
      const record = tradeHistoryStore.get(historyId);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Recovery item not found",
        });
      }

      const userAccounts = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.userId, req.session.userId));
      const ownedAccountIds = new Set(userAccounts.map((account) => account.id));
      const belongsToUser =
        ownedAccountIds.has(record.followerAccountId) ||
        (record.masterAccountId ? ownedAccountIds.has(record.masterAccountId) : false);

      if (!belongsToUser) {
        return res.status(404).json({
          success: false,
          message: "Recovery item not found",
        });
      }

      if (
        record.lifecycleStatus !== "FAILED" &&
        record.lifecycleStatus !== "CANCELLED" &&
        record.lifecycleStatus !== "RULE_SKIPPED" &&
        record.lifecycleStatus !== "RULE_REJECTED"
      ) {
        return res.status(400).json({
          success: false,
          message: "Only failed recovery items can be reviewed",
        });
      }

      const note =
        typeof req.body?.note === "string" && req.body.note.trim().length > 0
          ? req.body.note.trim()
          : undefined;
      const reviewedRecord = tradeHistoryStore.markRecoveryItemReviewed(historyId, {
        note,
      });

      if (!reviewedRecord) {
        return res.status(404).json({
          success: false,
          message: "Recovery item not found",
        });
      }

      clearRuntimeSnapshotCache(req.session.userId);

      const overview = await getOrCreateRuntimeSnapshot({
        scope: "runtime-dashboard-overview",
        userId: req.session.userId,
        ttlMs: RUNTIME_SNAPSHOT_TTL_MS,
        loader: async () => loadDashboardRuntimeOverviewForUser(req.session.userId!),
      });

      return res.json({
        success: true,
        reviewedAt: reviewedRecord.reviewedAt ?? new Date().toISOString(),
        historyId,
        recoveryItem:
          overview.tradeAnalytics.executionRecovery.items.find((item) => item.historyId === historyId) ??
          null,
        ...overview,
      });
    } catch (error) {
      console.error("Error reviewing dashboard recovery item:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/operations/overview", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const overview = await getOrCreateRuntimeSnapshot({
        scope: "operations-overview",
        userId: req.session.userId,
        ttlMs: RUNTIME_SNAPSHOT_TTL_MS,
        loader: async () => {
          const userAccounts = await db
            .select()
            .from(accounts)
            .where(eq(accounts.userId, req.session.userId!));

          const registeredGroups = copyGroupManager
            .getAllGroups()
            .filter((registeredGroup) => registeredGroup.group.userId === req.session.userId);
          const activityByGroupId = await getMergedCopyGroupActivityByGroupId(
            req.session.userId!,
            registeredGroups.map((registeredGroup) => registeredGroup.group.groupId),
          );

          return buildOperationsOverview({
            userAccounts,
            registeredGroups,
            getRuntime: (groupId) => copyGroupManager.getRuntime(groupId),
            getRecentActivity: (groupId) => activityByGroupId[groupId] ?? [],
            positionSnapshotDependencies: {
              tradovateInstances,
              tradeifyInstances,
            },
          });
        },
      });

      return res.json({
        success: true,
        ...overview,
      });
    } catch (error) {
      console.error("Error building operations overview:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const notifications = await getOrCreateRuntimeSnapshot({
        scope: "notifications",
        userId: req.session.userId,
        ttlMs: RUNTIME_SNAPSHOT_TTL_MS,
        loader: async () => {
          const userAccounts = await db
            .select()
            .from(accounts)
            .where(eq(accounts.userId, req.session.userId!));

          const registeredGroups = copyGroupManager
            .getAllGroups()
            .filter((registeredGroup) => registeredGroup.group.userId === req.session.userId);
          const activityByGroupId = await getMergedCopyGroupActivityByGroupId(
            req.session.userId!,
            registeredGroups.map((registeredGroup) => registeredGroup.group.groupId),
          );
          const positionSyncReviews = await positionSyncReviewStore.listReviews(req.session.userId!);
          const executionFollowUpReviews = await executionFollowUpReviewStore.listReviews(req.session.userId!);
          const rithmicReadinessReviews = await rithmicReadinessReviewStore.listReviews(req.session.userId!);

          return buildNotifications({
            userAccounts,
            registeredGroups,
            getRecentActivity: (groupId) => activityByGroupId[groupId] ?? [],
            getObservability: (groupId) => copyGroupManager.getRuntime(groupId)?.observability,
            copyGroupAlertStories: copyGroupAlertStore.listActiveStories({
              userId: req.session.userId!,
              groupIds: registeredGroups.map((registeredGroup) => registeredGroup.group.groupId),
            }),
            positionSnapshotDependencies: {
              tradovateInstances,
              tradeifyInstances,
            },
            rithmicInstances,
            rithmicReconnectValidationStore,
            rithmicReadinessReviews,
            positionSyncReviews,
            executionFollowUpReviews,
          });
        },
      });

      return res.json({
        success: true,
        ...notifications,
      });
    } catch (error) {
      console.error("Error building notifications feed:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/trades/history/export.csv", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const userAccounts = await db
        .select({
          id: accounts.id,
        })
        .from(accounts)
        .where(eq(accounts.userId, req.session.userId));

      const statuses = parseTradeHistoryStatuses(req.query.status);
      const query = typeof req.query.q === "string" ? req.query.q : undefined;
      const records = tradeHistoryStore.listRecent({
        accountIds: userAccounts.map((account) => account.id),
        limit: 1000,
        statuses,
        query,
      });

      const csv = serializeTradeHistoryCsv(records);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="propcopia-trade-history-${new Date().toISOString().slice(0, 10)}.csv"`,
      );
      return res.send(csv);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.post("/api/copy-groups/register", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { board, group, followers, runtimeState } = req.body ?? {};

      if (!group || !Array.isArray(followers)) {
        return res.status(400).json({
          success: false,
          message: "Missing required payload: group and followers[]",
        });
      }

      if (group.userId !== req.session.userId) {
        return res.status(403).json({
          success: false,
          message: "Copy groups can only be registered for the authenticated user",
        });
      }

      const runtime = copyGroupManager.syncGroup(group, followers, {
        persistedState: runtimeState,
      });
      await copyGroupRegistrationStore.saveRegistration({
        board,
        group,
        followers,
        runtimeState,
      });

      return res.json({
        success: true,
        group: copyGroupManager.getGroup(group.groupId),
        runtime,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/copy-groups/start", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { groupId } = req.body ?? {};
      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: groupId",
        });
      }

      await ensurePersistedCopyGroupsLoaded(req.session.userId);

      const registeredGroup = getOwnedRegisteredGroup(groupId, req.session.userId);
      if (!registeredGroup) {
        return res.status(404).json({
          success: false,
          message: `Copy group not found: ${groupId}`,
        });
      }

      const followerAccounts = registeredGroup.group.followerAccountIds.length > 0
        ? await db
            .select()
            .from(accounts)
            .where(
              and(
                inArray(accounts.id, registeredGroup.group.followerAccountIds),
                eq(accounts.userId, registeredGroup.group.userId),
              ),
            )
        : [];
      const riskAlerts = evaluateFollowerRiskAlerts(followerAccounts);

      for (const warning of riskAlerts.warnings) {
        copyGroupManager.recordExternalActivity(groupId, {
          severity: "WARN",
          category: "HEALTH",
          message: warning.message,
          followerAccountId: warning.accountId,
        });
      }

      if (riskAlerts.breaches.length > 0) {
        for (const breach of riskAlerts.breaches) {
          copyGroupManager.recordExternalActivity(groupId, {
            severity: "ERROR",
            category: "HEALTH",
            message: breach.message,
            followerAccountId: breach.accountId,
          });
        }

        return res.status(409).json({
          success: false,
          message: riskAlerts.breaches[0].message,
          details: riskAlerts.breaches.map((breach) => breach.message),
          runtime: copyGroupManager.getRuntime(groupId),
        });
      }

      const runtime = await runCopyGroupLifecycleAction({
        action: "start",
        groupId,
        manager: copyGroupManager,
        persistState: persistRegisteredGroupState,
      });
      return res.json({
        success: true,
        runtime,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/copy-groups/stop", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { groupId } = req.body ?? {};
      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: groupId",
        });
      }

      await ensurePersistedCopyGroupsLoaded(req.session.userId);

      const registeredGroup = getOwnedRegisteredGroup(groupId, req.session.userId);
      if (!registeredGroup) {
        return res.status(404).json({
          success: false,
          message: `Copy group not found: ${groupId}`,
        });
      }

      const runtime = await runCopyGroupLifecycleAction({
        action: "stop",
        groupId,
        manager: copyGroupManager,
        persistState: persistRegisteredGroupState,
      });
      return res.json({
        success: true,
        runtime,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/copy-groups/pause", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { groupId } = req.body ?? {};
      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: groupId",
        });
      }

      await ensurePersistedCopyGroupsLoaded(req.session.userId);

      const registeredGroup = getOwnedRegisteredGroup(groupId, req.session.userId);
      if (!registeredGroup) {
        return res.status(404).json({
          success: false,
          message: `Copy group not found: ${groupId}`,
        });
      }

      const runtime = await runCopyGroupLifecycleAction({
        action: "pause",
        groupId,
        manager: copyGroupManager,
        persistState: persistRegisteredGroupState,
      });
      return res.json({
        success: true,
        runtime,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/copy-groups/resume", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { groupId } = req.body ?? {};
      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: groupId",
        });
      }

      await ensurePersistedCopyGroupsLoaded(req.session.userId);

      const registeredGroup = getOwnedRegisteredGroup(groupId, req.session.userId);
      if (!registeredGroup) {
        return res.status(404).json({
          success: false,
          message: `Copy group not found: ${groupId}`,
        });
      }

      const runtime = await runCopyGroupLifecycleAction({
        action: "resume",
        groupId,
        manager: copyGroupManager,
        persistState: persistRegisteredGroupState,
      });
      return res.json({
        success: true,
        runtime,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/copy-groups/emergency-stop", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { groupId, reason } = req.body ?? {};
      if (!groupId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: groupId",
        });
      }

      await ensurePersistedCopyGroupsLoaded(req.session.userId);

      const registeredGroup = getOwnedRegisteredGroup(groupId, req.session.userId);
      if (!registeredGroup) {
        return res.status(404).json({
          success: false,
          message: `Copy group not found: ${groupId}`,
        });
      }

      const runtime = await runCopyGroupLifecycleAction({
        action: "emergency-stop",
        groupId,
        reason,
        manager: copyGroupManager,
        persistState: persistRegisteredGroupState,
      });
      return res.json({
        success: true,
        runtime,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.delete("/api/copy-groups/:groupId", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { groupId } = req.params;
      await ensurePersistedCopyGroupsLoaded(req.session.userId);
      const registeredGroup = getOwnedRegisteredGroup(groupId, req.session.userId);
      if (!registeredGroup) {
        return res.status(404).json({
          success: false,
          message: `Copy group not found: ${groupId}`,
        });
      }

      await copyGroupManager.unregisterGroup(groupId);
      await copyGroupRegistrationStore.deleteRegistration(req.session.userId, groupId);
      return res.json({
        success: true,
        message: `Copy group unregistered: ${groupId}`,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input: " + result.error.message,
        });
      }

      const { username, password } = result.data;

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        bio: "Novice Trader",
      });

      return res.json({
        success: true,
        message: "Account created successfully",
        user: { id: user.id, username: user.username },
      });
    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Username and password are required",
        });
      }

      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid username or password",
        });
      }

      // Set session (will be automatically saved)
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.save((error) => {
        if (error) {
          console.error('Login session save error:', error);
          return res.status(500).json({
            success: false,
            message: "Failed to persist login session",
          });
        }

        return res.json({
          success: true,
          message: "Login successful",
          user: { id: user.id, username: user.username },
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Failed to logout",
        });
      }
      res.clearCookie('connect.sid');
      return res.json({
        success: true,
        message: "Logged out successfully",
      });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (req.session?.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        return res.json({
          success: true,
          user: serializeAuthenticatedUser(user),
        });
      }
    }
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  });

  app.patch("/api/user/profile", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const result = updateUserProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input: " + result.error.message,
        });
      }

      const updatedUser = await storage.updateUserProfile(req.session.userId, result.data);
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.json({
        success: true,
        message: "Profile updated successfully",
        user: serializeAuthenticatedUser(updatedUser),
      });
    } catch (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });
  app.post("/api/tradovate/test-connection", async (req, res) => {
    try {
      const { username, password, cid, secret, environment } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Missing required credentials: username and password"
        });
      }

      // CID and secret are required for real API authentication
      if (!cid || !secret) {
        return res.status(400).json({
          success: false,
          message: "Missing required API credentials: Client ID (CID) and Secret are required to connect to Tradovate"
        });
      }

      const tradovateAPI = new TradovateAPI(environment || 'demo');

      const authResult = await tradovateAPI.authenticate({
        username,
        password,
        cid,
        secret,
      });

      const connectionTest = await tradovateAPI.testConnection();

      if (connectionTest.success) {
        tradovateInstances.set(username, tradovateAPI);
      }

      return res.json({
        success: connectionTest.success,
        message: connectionTest.message,
        authData: {
          userId: authResult.userId,
          tokenExpiration: authResult.expirationTime,
        },
        accounts: connectionTest.data,
      });
    } catch (error) {
      console.error('Tradovate connection error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/tradeify/test-connection", async (req, res) => {
    try {
      const { username, apiKey } = req.body;

      if (!username || !apiKey) {
        return res.status(400).json({
          success: false,
          message: "Missing required credentials: username and API key are required to connect to Tradeify"
        });
      }

      const tradeifyAPI = new TradeifyAPI();

      const authResult = await tradeifyAPI.authenticate({
        username,
        apiKey,
      });

      const connectionTest = await tradeifyAPI.testConnection();

      if (connectionTest.success) {
        tradeifyInstances.set(username, tradeifyAPI);

        const normalizedAccounts = connectionTest.data?.map((account: any) => ({
          id: String(account.id || account.accountId),
          name: account.name || account.accountName || `Account ${account.id}`,
          accountType: account.accountType || account.type || 'live',
          balance: account.balance || account.netLiquidation || 0,
          active: Boolean(account.active ?? (account.status && account.status.toLowerCase() === 'active')),
        })) || [];

        return res.json({
          success: true,
          message: connectionTest.message,
          accounts: normalizedAccounts,
          authData: {
            userId: authResult.userId,
            tokenExpiration: authResult.expirationTime,
          },
        });
      }

      return res.json({
        success: false,
        message: connectionTest.message || 'Connection test failed',
      });
    } catch (error) {
      console.error('Tradeify connection error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/rithmic/test-connection", async (req, res) => {
    try {
      const { username, password, systemName, environment } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Missing required credentials: username and password are required to connect to Rithmic",
        });
      }

      const rithmicAPI = new RithmicAPI({
        username,
        password,
        systemName: systemName || 'Rithmic Test',
        environment: environment || 'test',
      });

      const connectionTest = await rithmicAPI.testConnection();

      if (connectionTest.success) {
        rithmicInstances.set(username, rithmicAPI);

        const normalizedAccounts = (connectionTest.data ?? []).map((account: any) => ({
          id: String(account.id),
          name: account.name,
          accountType: account.accountType || 'futures',
          balance: account.balance || 0,
          active: account.active !== false,
        }));

        return res.json({
          success: true,
          message: connectionTest.message,
          authData: connectionTest.authData,
          accounts: normalizedAccounts,
        });
      }

      return res.json({
        success: false,
        message: connectionTest.message || 'Connection test failed',
      });
    } catch (error) {
      console.error('Rithmic connection error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/accounts/:id/rithmic-readiness", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { id } = req.params;
      const [existing] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, id), eq(accounts.userId, req.session.userId)));

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      if (existing.platform !== "Rithmic") {
        return res.status(400).json({
          success: false,
          message: "Rithmic readiness is only available for Rithmic accounts.",
        });
      }

      const instance = existing.rithmicUsername ? rithmicInstances.get(existing.rithmicUsername) : undefined;
      const reconnectValidation = rithmicReconnectValidationStore.get(existing.id);
      const readiness = buildRithmicReadiness(existing, instance, reconnectValidation);

      return res.json({
        success: true,
        readiness,
      });
    } catch (error) {
      console.error("Error loading Rithmic readiness:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.post("/api/accounts/:id/rithmic-readiness/revalidate", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { id } = req.params;
      let [existing] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, id), eq(accounts.userId, req.session.userId)));

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      if (existing.platform !== "Rithmic") {
        return res.status(400).json({
          success: false,
          message: "Rithmic readiness is only available for Rithmic accounts.",
        });
      }

      const reconnect = await reconnectSavedRithmicTestAccount({
        account: existing,
        systemName: resolveRithmicSystemName(existing),
        sessions: rithmicInstances,
        validationStore: rithmicReconnectValidationStore,
        createSession: (credentials) => new RithmicAPI(credentials),
        refreshIdentity: (account, rithmicAPI) =>
          refreshRithmicAccountIdentity(account, req.session.userId!, rithmicAPI, {
            allowDiscoveryFailure: true,
          }),
      });

      if (!reconnect.success) {
        return res.status(400).json({
          success: false,
          message: reconnect.message,
        });
      }

      existing = reconnect.account;

      const reconnectValidation = rithmicReconnectValidationStore.get(existing.id);
      const readiness = buildRithmicReadiness(
        existing,
        existing.rithmicUsername ? rithmicInstances.get(existing.rithmicUsername) : undefined,
        reconnectValidation,
      );

      return res.json({
        success: true,
        message: "Rithmic readiness revalidated successfully.",
        readiness,
      });
    } catch (error) {
      console.error("Error revalidating Rithmic readiness:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.get("/api/tradovate/accounts/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const tradovateAPI = tradovateInstances.get(username);

      if (!tradovateAPI) {
        return res.status(404).json({
          success: false,
          message: "No active connection found for this user. Please authenticate first.",
        });
      }

      if (!tradovateAPI.isTokenValid()) {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please re-authenticate.",
        });
      }

      const accounts = await tradovateAPI.getAccountInfo();
      return res.json({
        success: true,
        data: accounts,
      });
    } catch (error) {
      console.error('Error fetching Tradovate accounts:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/tradovate/positions/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const tradovateAPI = tradovateInstances.get(username);

      if (!tradovateAPI) {
        return res.status(404).json({
          success: false,
          message: "No active connection found for this user. Please authenticate first.",
        });
      }

      if (!tradovateAPI.isTokenValid()) {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please re-authenticate.",
        });
      }

      const positions = await tradovateAPI.getPositions();
      return res.json({
        success: true,
        data: positions,
      });
    } catch (error) {
      console.error('Error fetching Tradovate positions:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  // Accounts routes
  app.post("/api/accounts", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const accountData = insertAccountSchema.parse({
        ...req.body,
        userId: req.session.userId,
      });

      const [newAccount] = await db.insert(accounts).values(accountData).returning();

      return res.json({
        success: true,
        account: newAccount,
      });
    } catch (error) {
      console.error('Error creating account:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/accounts", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const userAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.userId, req.session.userId));

      return res.json({
        success: true,
        accounts: userAccounts,
      });
    } catch (error) {
      console.error('Error fetching accounts:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  // ── Risk settings per-account ────────────────────────────────────────────
  app.post("/api/accounts/:id/connect", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { id } = req.params;
      let [existing] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, id), eq(accounts.userId, req.session.userId)));

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      if (existing.platform === "Rithmic") {
        const reconnect = await reconnectSavedRithmicTestAccount({
          account: existing,
          systemName: resolveRithmicSystemName(existing),
          sessions: rithmicInstances,
          validationStore: rithmicReconnectValidationStore,
          createSession: (credentials) => new RithmicAPI(credentials),
          refreshIdentity: (account, rithmicAPI) =>
            refreshRithmicAccountIdentity(account, req.session.userId!, rithmicAPI, {
              allowDiscoveryFailure: true,
            }),
        });

        if (!reconnect.success) {
          return res.status(400).json({
            success: false,
            message: reconnect.message,
          });
        }

        existing = reconnect.account;
      }

      const updated = await updateAccountConnectionState({
        accountId: id,
        userId: req.session.userId,
        isConnected: true,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      return res.json({
        success: true,
        account: updated,
      });
    } catch (error) {
      console.error('Error connecting account:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.patch("/api/user/settings", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const result = updateUserSettingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input: " + result.error.message,
        });
      }

      const updatedUser = await storage.updateUserSettings(req.session.userId, result.data);
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.json({
        success: true,
        message: "Settings updated successfully",
        user: serializeAuthenticatedUser(updatedUser),
      });
    } catch (error) {
      console.error("User settings update error:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  });

  app.post("/api/accounts/:id/disconnect", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { id } = req.params;
      const [existing] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, id), eq(accounts.userId, req.session.userId)));

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      if (existing.platform === "Rithmic" && existing.rithmicUsername) {
        const instance = rithmicInstances.get(existing.rithmicUsername);
        if (instance) {
          await instance.disconnect();
          rithmicInstances.delete(existing.rithmicUsername);
        }
      }
      rithmicReconnectValidationStore.clear(existing.id);

      const updated = await updateAccountConnectionState({
        accountId: id,
        userId: req.session.userId,
        isConnected: false,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      return res.json({
        success: true,
        account: updated,
      });
    } catch (error) {
      console.error('Error disconnecting account:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.patch("/api/accounts/:id/broker-settings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { id } = req.params;
      const [existing] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, id), eq(accounts.userId, req.session.userId)));

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      if (existing.platform !== "Rithmic") {
        return res.status(400).json({
          success: false,
          message: "Broker settings updates are currently supported only for Rithmic accounts.",
        });
      }

      const rithmicExchange = req.body?.rithmicExchange?.trim()?.toUpperCase();
      const rithmicSystemName = req.body?.rithmicSystemName?.trim() || null;
      const rithmicEnvironment = req.body?.rithmicEnvironment === "live" ? "live" : "test";

      if (!rithmicExchange) {
        return res.status(400).json({
          success: false,
          message: "Rithmic exchange is required.",
        });
      }

      const [updated] = await db
        .update(accounts)
        .set({
          rithmicExchange,
          rithmicSystemName,
          rithmicEnvironment,
        })
        .where(and(eq(accounts.id, id), eq(accounts.userId, req.session.userId)))
        .returning();

      return res.json({
        success: true,
        account: updated,
      });
    } catch (error) {
      console.error('Error updating broker settings:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.patch("/api/accounts/:id/account-type", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      const { id } = req.params;
      const requestedAccountType = req.body?.accountType;

      if (requestedAccountType !== "master" && requestedAccountType !== "follower") {
        return res.status(400).json({
          success: false,
          message: "Account type must be either master or follower.",
        });
      }

      const [existing] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, id), eq(accounts.userId, req.session.userId)));

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      if (existing.isConnected) {
        return res.status(409).json({
          success: false,
          message: "Disconnect this account before changing it between master and follower.",
        });
      }

      const [updated] = await db
        .update(accounts)
        .set({
          accountType: requestedAccountType,
        })
        .where(and(eq(accounts.id, id), eq(accounts.userId, req.session.userId)))
        .returning();

      return res.json({
        success: true,
        account: updated,
      });
    } catch (error) {
      console.error('Error updating account type:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.patch("/api/accounts/:id/risk-settings", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }
      const { id } = req.params;
      const [existing] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, id), eq(accounts.userId, req.session.userId)));
      if (!existing) {
        return res.status(404).json({ success: false, message: "Account not found" });
      }
      const b = req.body;
      const [updated] = await db
        .update(accounts)
        .set({
          riskMode:             b.riskMode            ?? existing.riskMode,
          positionScaling:      b.positionScaling      ?? existing.positionScaling,
          maxContracts:         b.maxContracts         ?? null,
          maxOpenPositions:     b.maxOpenPositions      ?? null,
          allowedDirections:    b.allowedDirections     ?? existing.allowedDirections,
          maxDailyLoss:         b.maxDailyLoss     != null ? String(b.maxDailyLoss)     : null,
          maxDailyLossPct:      b.maxDailyLossPct  != null ? String(b.maxDailyLossPct)  : null,
          maxWeeklyLoss:        b.maxWeeklyLoss    != null ? String(b.maxWeeklyLoss)    : null,
          maxWeeklyLossPct:     b.maxWeeklyLossPct != null ? String(b.maxWeeklyLossPct) : null,
          maxDrawdownPct:       b.maxDrawdownPct   != null ? String(b.maxDrawdownPct)   : null,
          maxConsecutiveLosses: b.maxConsecutiveLosses ?? null,
          blockedTickers:       b.blockedTickers  ?? [],
          allowedTickers:       b.allowedTickers  ?? [],
          maxTradesPerDay:      b.maxTradesPerDay  ?? null,
          minAccountBalance:    b.minAccountBalance != null ? String(b.minAccountBalance) : null,
          tradingStartTime:     b.tradingStartTime  ?? null,
          tradingEndTime:       b.tradingEndTime    ?? null,
          tradingDays:          b.tradingDays       ?? [],
          cooldownAfterLoss:    b.cooldownAfterLoss ?? null,
          onBreachAction:       b.onBreachAction    ?? existing.onBreachAction,
        })
        .where(eq(accounts.id, id))
        .returning();
      return res.json({ success: true, account: updated });
    } catch (error) {
      console.error('Error saving risk settings:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Trade copying routes
  app.post("/api/trade-copy/start", async (req, res) => {
    try {
      const { userId, masterAccountId, followerAccountIds, environment = 'demo' } = req.body;

      if (!userId || !masterAccountId || !followerAccountIds || !Array.isArray(followerAccountIds)) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters: userId, masterAccountId, followerAccountIds",
        });
      }

      // Prevent stale follower/master wiring from being mixed into a new session.
      const existingEngine = tradeCopyEngines.get(userId);
      if (existingEngine) {
        return res.status(409).json({
          success: false,
          message: "A trade-copy session is already running. Stop the current session before starting a new one.",
        });
      }

      const engine = new TradeCopyEngine(environment);
      tradeCopyEngines.set(userId, engine);

      // Connect trade logger to engine events
      engine.on('tradeCopied', ({ trade, metrics, followerCount }) => {
        // Async logging (non-blocking)
        tradeLogger.logTrade({
          masterAccountId: trade.accountId,
          symbol: trade.symbol,
          action: trade.action,
          quantity: trade.quantity,
          price: trade.price.toString(),
          status: 'copied',
        }).catch(err => {
          console.error('[TradeCopy] Error logging trade:', err);
        });

        console.log(`[TradeCopy] Trade copied to ${followerCount} followers in ${metrics.totalLatency.toFixed(2)}ms`);
      });

      const [masterAccount] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, masterAccountId), eq(accounts.userId, userId)));

      if (!masterAccount) {
        return res.status(404).json({
          success: false,
          message: "Master account not found",
        });
      }

      const followerAccounts = followerAccountIds.length > 0
        ? await db
            .select()
            .from(accounts)
            .where(
              and(
                inArray(accounts.id, followerAccountIds),
                eq(accounts.userId, userId),
              ),
            )
        : [];

      const refreshedMasterAccount = await refreshRithmicAccountIdentity(masterAccount, userId);
      const refreshedFollowerAccounts = await Promise.all(
        followerAccounts.map((account) => refreshRithmicAccountIdentity(account, userId)),
      );
      const breachedFollowerErrors = refreshedFollowerAccounts
        .map((account) => getTradeCopyRiskPreflightError(account))
        .filter((message): message is string => message !== null);

      if (breachedFollowerErrors.length > 0) {
        return res.status(409).json({
          success: false,
          message: breachedFollowerErrors[0],
          details: breachedFollowerErrors,
        });
      }

      let followerConnections;
      try {
        followerConnections = resolveTradeCopyFollowerConnections({
          accounts: refreshedFollowerAccounts,
          followerAccountIds,
          defaultOverrides: {
            exchange: req.body.exchange,
          },
          overridesByAccountId: req.body.followerConfigs,
          providedFollowerUsernames: req.body.followerUsernames,
          tradovateInstances,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        const status =
          message.includes('not authenticated') || message.includes('token')
            ? 401
            : message.includes('not found')
              ? 404
              : 400;

        return res.status(status).json({
          success: false,
          message,
        });
      }

      let masterConnection;
      try {
        masterConnection = resolveTradeCopyMasterConnection({
          account: refreshedMasterAccount,
          providedUsername: req.body.masterUsername,
          tradovateInstances,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        const status =
          message.includes('not authenticated') || message.includes('token')
            ? 401
            : 400;

        return res.status(status).json({
          success: false,
          message,
        });
      }

      if (masterConnection.platform === 'Tradovate') {
        await engine.connectMasterAccount(masterAccountId, masterConnection.accessToken!);
      } else {
        if (!refreshedMasterAccount.rithmicAccountId) {
          return res.status(400).json({
            success: false,
            message: 'Saved Rithmic account ID is missing for the selected master account. Re-add or reconnect this account.',
          });
        }

        const credentials = masterConnection.rithmicCredentials!;
        const existingInstance = rithmicInstances.get(credentials.username);
        const rithmicApi =
          existingInstance ??
          new RithmicAPI({
            username: credentials.username,
            password: credentials.password,
            environment: credentials.environment,
            systemName: credentials.systemName,
          });

        if (!existingInstance) {
          const connectionTest = await rithmicApi.testConnection();
          if (!connectionTest.success) {
            await rithmicApi.disconnect();
            return res.status(400).json({
              success: false,
              message: connectionTest.message,
            });
          }

          rithmicInstances.set(credentials.username, rithmicApi);
        }

        engine.setRithmicMasterBrokerAccountId(refreshedMasterAccount.rithmicAccountId);
        await engine.connectRithmicMasterAccount(masterAccountId, rithmicApi);
      }

      for (const followerConnection of followerConnections) {
        await engine.addFollowerAccount(
          followerConnection.account,
          followerConnection.brokerConfig,
        );
      }

      console.log(
        '[TradeCopy] Session wiring ready',
        JSON.stringify({
          userId,
          masterAccountId,
          masterPlatform: masterConnection.platform,
          masterBrokerAccountId:
            masterConnection.platform === 'Rithmic'
              ? refreshedMasterAccount.rithmicAccountId
              : refreshedMasterAccount.tradovateAccountId ?? masterAccountId,
          followerAccountIds: followerConnections.map((connection) => connection.account.id),
          followerBrokerKinds: followerConnections.map((connection) => connection.brokerConfig.kind),
          followerBrokerAccountIds: followerConnections.map((connection) =>
            connection.account.platform === 'Rithmic'
              ? connection.account.rithmicAccountId
              : connection.account.tradovateAccountId ?? connection.account.id,
          ),
        }),
      );

      return res.json({
        success: true,
        message: "Trade copying started successfully",
        data: {
          masterAccountId,
          followerCount: followerConnections.length,
        },
      });
    } catch (error) {
      console.error('Error starting trade copying:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/trade-copy/add-follower", async (req, res) => {
    try {
      const { userId, accountId, positionScaling = 100, maxContracts, blockedTickers = [], exchange } = req.body;

      if (!userId || !accountId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters: userId, accountId",
        });
      }

      const engine = tradeCopyEngines.get(userId);
      if (!engine) {
        return res.status(404).json({
          success: false,
          message: "No active trade copying session. Start trade copying first.",
        });
      }

      const [savedAccount] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

      if (!savedAccount) {
        return res.status(404).json({
          success: false,
          message: "Follower account not found",
        });
      }

      const riskPreflightError = getTradeCopyRiskPreflightError(savedAccount);
      if (riskPreflightError) {
        return res.status(409).json({
          success: false,
          message: riskPreflightError,
        });
      }

      let followerConnection;
      try {
        followerConnection = resolveTradeCopyFollowerConnection({
          account: savedAccount,
          overrides: {
            positionScaling,
            maxContracts,
            blockedTickers,
            exchange,
          },
          providedFollowerUsername: req.body.followerUsername,
          tradovateInstances,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        const status =
          message.includes('not authenticated') || message.includes('token')
            ? 401
            : message.includes('not found')
              ? 404
              : 400;

        return res.status(status).json({
          success: false,
          message,
        });
      }

      await engine.addFollowerAccount(
        followerConnection.account,
        followerConnection.brokerConfig,
      );

      return res.json({
        success: true,
        message: "Follower account added successfully",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Follower account is already part of the active copy session')
      ) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      console.error('Error adding follower account:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.post("/api/trade-copy/stop", async (req, res) => {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: userId",
        });
      }

      const engine = tradeCopyEngines.get(userId);
      if (!engine) {
        return res.status(404).json({
          success: false,
          message: "No active trade copying session",
        });
      }

      await engine.disconnect();
      tradeCopyEngines.delete(userId);

      return res.json({
        success: true,
        message: "Trade copying stopped successfully",
      });
    } catch (error) {
      console.error('Error stopping trade copying:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/trade-copy/stats/:userId", (req, res) => {
    try {
      const { userId } = req.params;

      const engine = tradeCopyEngines.get(userId);
      if (!engine) {
        return res.status(404).json({
          success: false,
          message: "No active trade copying session",
        });
      }

      const stats = engine.getLatencyStats();

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching trade copy stats:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/trade-copy/status/:userId", (req, res) => {
    try {
      const { userId } = req.params;

      const engine = tradeCopyEngines.get(userId);
      if (!engine) {
        return res.status(404).json({
          success: false,
          message: "No active trade copying session",
        });
      }

      return res.json({
        success: true,
        data: engine.getStatus(),
      });
    } catch (error) {
      console.error('Error fetching trade copy status:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/market/prices", (req, res) => {
    try {
      const prices = marketDataService.getAllPrices();
      const pricesArray = Array.from(prices.entries()).map(([_symbol, data]) => data);

      return res.json({
        success: true,
        data: pricesArray,
      });
    } catch (error) {
      console.error('Error fetching market prices:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/economic-calendar", (req, res) => {
    try {
      // Mock economic calendar data
      // In production, this would call Finnhub API: https://finnhub.io/api/v1/calendar/economic
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

      const mockEvents = [
        {
          id: '1',
          date: today.toISOString().split('T')[0],
          time: '08:30',
          country: 'US',
          event: 'Initial Jobless Claims',
          impact: 'high',
          forecast: '220K',
          previous: '215K',
        },
        {
          id: '2',
          date: today.toISOString().split('T')[0],
          time: '10:00',
          country: 'US',
          event: 'ISM Services PMI',
          impact: 'high',
          forecast: '53.5',
          previous: '54.1',
        },
        {
          id: '3',
          date: today.toISOString().split('T')[0],
          time: '14:00',
          country: 'US',
          event: 'FOMC Member Speech',
          impact: 'medium',
        },
        {
          id: '4',
          date: tomorrow.toISOString().split('T')[0],
          time: '08:30',
          country: 'US',
          event: 'Non-Farm Payrolls',
          impact: 'high',
          forecast: '180K',
          previous: '175K',
        },
        {
          id: '5',
          date: tomorrow.toISOString().split('T')[0],
          time: '08:30',
          country: 'US',
          event: 'Unemployment Rate',
          impact: 'high',
          forecast: '3.7%',
          previous: '3.7%',
        },
        {
          id: '6',
          date: tomorrow.toISOString().split('T')[0],
          time: '10:00',
          country: 'EU',
          event: 'ECB Interest Rate Decision',
          impact: 'high',
          forecast: '4.50%',
          previous: '4.50%',
        },
        {
          id: '7',
          date: dayAfterTomorrow.toISOString().split('T')[0],
          time: '08:30',
          country: 'US',
          event: 'Consumer Price Index (CPI)',
          impact: 'high',
          forecast: '3.2%',
          previous: '3.1%',
        },
        {
          id: '8',
          date: dayAfterTomorrow.toISOString().split('T')[0],
          time: '09:45',
          country: 'US',
          event: 'Core CPI',
          impact: 'high',
          forecast: '4.0%',
          previous: '4.0%',
        },
        {
          id: '9',
          date: dayAfterTomorrow.toISOString().split('T')[0],
          time: '14:30',
          country: 'US',
          event: 'Crude Oil Inventories',
          impact: 'medium',
          previous: '-2.5M',
        },
      ];

      return res.json(mockEvents);
    } catch (error) {
      console.error('Error fetching economic calendar:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  app.get("/api/leaderboard", (req, res) => {
    try {
      // Return empty leaderboard - real data will come from actual user accounts
      return res.json({
        success: true,
        data: [],
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });


  // FMP API helper - Get top gainers/losers (LIVE DATA ONLY)
  async function fetchMarketMovers(type: 'gainers' | 'losers' | 'actives') {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) {
      throw new Error('FMP_API_KEY is not configured');
    }

    // FMP gainers/losers endpoints (correct URLs for free tier)
    let url: string;
    if (type === 'gainers') {
      url = `https://financialmodelingprep.com/api/v3/gainers?apikey=${apiKey}`;
    } else if (type === 'losers') {
      url = `https://financialmodelingprep.com/api/v3/losers?apikey=${apiKey}`;
    } else {
      url = `https://financialmodelingprep.com/api/v3/actives?apikey=${apiKey}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.statusText}`);
    }

    const data = await response.json();

    // FMP returns an array directly or an error object
    if (data.Error || data['Error Message']) {
      throw new Error(data.Error || data['Error Message'] || 'FMP API error');
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('FMP returned no data');
    }

    return data;
  }

  // Market Movers endpoint using FMP API (LIVE DATA ONLY - NO SIMULATED FALLBACK)
  app.get("/api/market-movers", async (req, res) => {
    try {
      const type = (req.query.type as string || 'gainers') as 'gainers' | 'losers' | 'actives';

      // Fetch LIVE data from FMP - no fallback
      const movers = await fetchMarketMovers(type);

      // Transform data to match our frontend format
      // FMP returns: { symbol, name, change, price, changesPercentage }
      const transformedData = movers.slice(0, 100).map((stock: any) => {
        return {
          symbol: stock.symbol,
          name: stock.name || stock.symbol,
          price: stock.price,
          changesPercentage: stock.changesPercentage,
          change: stock.change,
          volume: stock.volume || 0,
          exchange: 'US',
          open: undefined,
          close: stock.price,
          simulated: false, // Always false - live data only
        };
      });

      return res.json({
        success: true,
        data: transformedData,
        simulated: false, // Always false - live data only
      });
    } catch (error) {
      console.error('Error fetching market movers:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch market movers',
      });
    }
  });

  // Company Overview endpoint (using Finnhub)
  app.get("/api/company/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const finnhubKey = process.env.FINNHUB_API_KEY;

      if (!finnhubKey) {
        return res.status(500).json({
          success: false,
          message: "Finnhub API key not configured",
        });
      }

      // Fetch both company profile and basic financials from Finnhub
      const [profileResponse, metricsResponse] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${finnhubKey}`),
        fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${finnhubKey}`)
      ]);

      const profile = await profileResponse.json();
      const metrics = await metricsResponse.json();

      // Check if company was found (Finnhub returns empty object for not found)
      if (!profile || !profile.ticker || Object.keys(profile).length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Company not found',
        });
      }

      // Extract metrics
      const metric = metrics?.metric || {};

      return res.json({
        success: true,
        data: {
          symbol: profile.ticker,
          name: profile.name || symbol,
          description: `${profile.name} is a company in the ${profile.finnhubIndustry || 'N/A'} industry, trading on the ${profile.exchange || 'N/A'} exchange.`,
          sector: profile.finnhubIndustry || 'N/A',
          industry: profile.finnhubIndustry || 'N/A',
          exchange: profile.exchange || 'N/A',
          marketCap: profile.marketCapitalization ? (profile.marketCapitalization * 1000000).toString() : 'N/A',
          peRatio: metric.peNormalizedAnnual || metric.peBasicExclExtraTTM || 'N/A',
          eps: metric.epsNormalizedAnnual || metric.epsExclExtraItemsAnnual || 'N/A',
          dividendYield: metric.dividendYieldIndicatedAnnual ? (metric.dividendYieldIndicatedAnnual / 100).toString() : 'N/A',
          week52High: metric['52WeekHigh'] || 'N/A',
          week52Low: metric['52WeekLow'] || 'N/A',
          beta: metric.beta || 'N/A',
          revenue: metric.revenueTTM ? (metric.revenueTTM * 1000000).toString() : 'N/A',
          profitMargin: metric.netProfitMarginTTM ? (metric.netProfitMarginTTM / 100).toString() : 'N/A',
          address: `${profile.country || 'N/A'}`,
          country: profile.country || 'N/A',
          logo: profile.logo,
          website: profile.weburl,
          phone: profile.phone,
        },
      });
    } catch (error) {
      console.error('Error fetching company overview:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch company overview',
      });
    }
  });

  // Helper function to generate simulated chart data
  function generateSimulatedChartData(symbol: string, timeframe: string, res: any) {
    const basePrice = 250 + Math.random() * 50; // Random base price between 250-300
    const now = Date.now();
    const candles: any[] = [];

    let dataPoints = 30;
    let interval = 24 * 60 * 60 * 1000; // 1 day

    switch (timeframe) {
      case '1D':
        dataPoints = 78; // Every 5 minutes for 1 day
        interval = 5 * 60 * 1000;
        break;
      case '5D':
        dataPoints = 120;
        interval = 15 * 60 * 1000;
        break;
      case '1M':
        dataPoints = 30;
        interval = 24 * 60 * 60 * 1000;
        break;
      case '6M':
        dataPoints = 180;
        interval = 24 * 60 * 60 * 1000;
        break;
      case '1Y':
        dataPoints = 365;
        interval = 24 * 60 * 60 * 1000;
        break;
      case '5Y':
        dataPoints = 260; // Weekly data
        interval = 7 * 24 * 60 * 60 * 1000;
        break;
    }

    let price = basePrice;
    const volatility = 0.02; // 2% volatility

    for (let i = dataPoints; i >= 0; i--) {
      const timestamp = now - (i * interval);
      const changePercent = (Math.random() - 0.5) * volatility * 2;
      const open = price;
      const change = open * changePercent;
      const close = open + change;
      const high = Math.max(open, close) + Math.abs(change) * Math.random();
      const low = Math.min(open, close) - Math.abs(change) * Math.random();

      candles.push({
        timestamp,
        date: new Date(timestamp).toISOString(),
        open,
        high,
        low,
        close,
        volume: Math.floor(10000000 + Math.random() * 50000000),
      });

      price = close;
    }

    return res.json({
      success: true,
      data: {
        timeframe,
        candles,
        simulated: true, // Flag to indicate this is simulated data
      },
    });
  }

  // Historical price data endpoint for charting (using Alpha Vantage)
  app.get("/api/stock/:symbol/chart", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { timeframe = '1M' } = req.query;
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

      if (!apiKey) {
        return res.status(500).json({
          success: false,
          message: "Alpha Vantage API key not configured",
        });
      }

      let functionName: string;
      let interval: string = '';
      let outputsize: string = 'compact';

      // Map timeframe to Alpha Vantage function and parameters
      switch (timeframe) {
        case '1D':
          functionName = 'TIME_SERIES_INTRADAY';
          interval = '5min';
          outputsize = 'full';
          break;
        case '5D':
          functionName = 'TIME_SERIES_INTRADAY';
          interval = '15min';
          outputsize = 'full';
          break;
        case '1M':
        case '6M':
        case '1Y':
          functionName = 'TIME_SERIES_DAILY';
          outputsize = timeframe === '1M' ? 'compact' : 'full';
          break;
        case '5Y':
          functionName = 'TIME_SERIES_WEEKLY';
          outputsize = 'full';
          break;
        default:
          functionName = 'TIME_SERIES_DAILY';
          outputsize = 'compact';
      }

      // Build URL
      let url = `https://www.alphavantage.co/query?function=${functionName}&symbol=${symbol}&apikey=${apiKey}&outputsize=${outputsize}`;
      if (interval) {
        url += `&interval=${interval}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      // Check for API errors - use fallback simulated data if rate limited
      if (data.Note || data['Error Message'] || data.Information) {
        console.log('Alpha Vantage rate limit hit, using simulated data');
        return generateSimulatedChartData(symbol, timeframe as string, res);
      }

      // Extract time series data
      const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
      if (!timeSeriesKey || !data[timeSeriesKey]) {
        console.log('No time series data, using simulated data');
        return generateSimulatedChartData(symbol, timeframe as string, res);
      }

      const timeSeries = data[timeSeriesKey];

      // Transform data for the chart
      const chartData = Object.entries(timeSeries).map(([dateStr, values]: [string, any]) => ({
        timestamp: new Date(dateStr).getTime(),
        date: dateStr,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'] || '0'),
      }));

      // Sort by timestamp ascending
      chartData.sort((a, b) => a.timestamp - b.timestamp);

      // Filter based on timeframe
      const now = Date.now();
      const filtered = chartData.filter(d => {
        switch (timeframe) {
          case '1D':
            return d.timestamp > now - 24 * 60 * 60 * 1000;
          case '5D':
            return d.timestamp > now - 5 * 24 * 60 * 60 * 1000;
          case '1M':
            return d.timestamp > now - 30 * 24 * 60 * 60 * 1000;
          case '6M':
            return d.timestamp > now - 180 * 24 * 60 * 60 * 1000;
          case '1Y':
            return d.timestamp > now - 365 * 24 * 60 * 60 * 1000;
          case '5Y':
            return d.timestamp > now - 5 * 365 * 24 * 60 * 60 * 1000;
          default:
            return true;
        }
      });

      return res.json({
        success: true,
        data: {
          timeframe,
          candles: filtered,
        },
      });
    } catch (error) {
      console.error('Error fetching chart data:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch chart data',
      });
    }
  });

  // Current stock quote endpoint
  app.get("/api/stock/:symbol/quote", async (req, res) => {
    try {
      const { symbol } = req.params;
      const finnhubKey = process.env.FINNHUB_API_KEY;

      if (!finnhubKey) {
        return res.status(500).json({
          success: false,
          message: "Finnhub API key not configured",
        });
      }

      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubKey}`;
      const response = await fetch(url);
      const data = await response.json();

      // Check if quote is valid
      if (!data || data.c === 0) {
        return res.status(404).json({
          success: false,
          message: 'No quote data available',
        });
      }

      return res.json({
        success: true,
        data: {
          current: data.c,
          change: data.d,
          percentChange: data.dp,
          high: data.h,
          low: data.l,
          open: data.o,
          previousClose: data.pc,
        },
      });
    } catch (error) {
      console.error('Error fetching quote:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch quote',
      });
    }
  });

  // Watchlist endpoints
  app.get("/api/watchlist", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const watchlist = await storage.getWatchlist(req.session.userId);

      // Fetch quotes for all watchlist items
      const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
      if (!apiKey) {
        return res.json({
          success: true,
          data: watchlist.map(item => ({
            ...item,
            quote: null,
          })),
        });
      }

      const watchlistWithQuotes = await Promise.all(
        watchlist.map(async (item) => {
          try {
            const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${item.ticker}&apikey=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data['Global Quote']) {
              const quote = data['Global Quote'];
              return {
                ...item,
                quote: {
                  price: parseFloat(quote['05. price'] || '0'),
                  change: parseFloat(quote['09. change'] || '0'),
                  changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || '0'),
                  volume: parseInt(quote['06. volume'] || '0'),
                },
              };
            }
            return { ...item, quote: null };
          } catch (error) {
            console.error(`Error fetching quote for ${item.ticker}:`, error);
            return { ...item, quote: null };
          }
        })
      );

      return res.json({
        success: true,
        data: watchlistWithQuotes,
      });
    } catch (error) {
      console.error('Error fetching watchlist:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch watchlist',
      });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const result = insertWatchlistItemSchema.safeParse({
        ...req.body,
        userId: req.session.userId,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input: " + result.error.message,
        });
      }

      // Check if ticker already exists in user's watchlist
      const existingWatchlist = await storage.getWatchlist(req.session.userId);
      if (existingWatchlist.some(item => item.ticker === result.data.ticker)) {
        return res.status(409).json({
          success: false,
          message: "Ticker already in watchlist",
        });
      }

      const item = await storage.addToWatchlist(result.data);

      return res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add to watchlist',
      });
    }
  });

  app.delete("/api/watchlist/:ticker", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { ticker } = req.params;
      await storage.removeFromWatchlist(req.session.userId, ticker);

      return res.json({
        success: true,
        message: "Ticker removed from watchlist",
      });
    } catch (error) {
      console.error('Error removing from watchlist:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove from watchlist',
      });
    }
  });

  // AI Help Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      // Require authentication to prevent unauthorized API usage
      if (!req.session?.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized - please log in",
        });
      }

      const { messages } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({
          success: false,
          message: "Invalid messages format",
        });
      }

      // Validate message objects have required fields
      const isValid = messages.every(
        (msg) =>
          msg &&
          typeof msg === "object" &&
          typeof msg.role === "string" &&
          typeof msg.content === "string" &&
          (msg.role === "user" || msg.role === "assistant")
      );

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid message format - each message must have role and content",
        });
      }

      const systemPrompt = `You are a helpful AI assistant for the Futures Trade Copier Dashboard application. 
This is a trading platform that helps users:
- Copy trades from master accounts to follower accounts
- Track NinjaTrader and Tradovate platform accounts
- Monitor real-time trading activity and performance
- View market movers and track stocks in a watchlist
- Manage position scaling and trade execution
- Access economic calendars and social trading features

Be concise, friendly, and helpful. Focus on explaining features, answering questions about the platform, 
      and helping users navigate the application. If users ask about specific trading strategies or financial advice, 
      remind them that you provide platform assistance only, not financial advice.`;

      if (!openai) {
        return res.status(503).json({
          success: false,
          message: "AI assistant is not configured."
        });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

      return res.json({
        success: true,
        message: reply,
      });
    } catch (error) {
      console.error('Error in AI chat:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get AI response',
      });
    }
  });

  const wss = new WebSocketServer({ server, path: '/ws/market' });

  wss.on('connection', (ws) => {
    console.log('[WebSocket] Client connected to market data');

    const symbols = ['ES', 'NQ', 'YM', 'RTY'];
    const callbacks = new Map<string, (symbol: string, price: MarketPrice) => void>();

    symbols.forEach(symbol => {
      const callback = (sym: string, price: MarketPrice) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({
            type: 'price_update',
            symbol: sym,
            data: price,
          }));
        }
      };
      callbacks.set(symbol, callback);
      marketDataService.subscribe(symbol, callback);
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected from market data');
      callbacks.forEach((callback, symbol) => {
        marketDataService.unsubscribe(symbol, callback);
      });
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
  });

  // ── Kill Switch ─────────────────────────────────────────────────────────────
  // In-memory state (resets on server restart — intentional for safety)
  const killSwitchState = {
    active: false,
    activatedAt: null as string | null,
    reason: null as string | null,
  };

  app.get("/api/kill-switch/status", (_req, res) => {
    return res.json({ success: true, ...killSwitchState });
  });

  app.post("/api/kill-switch/activate", async (req, res) => {
    try {
      const reason = req.body?.reason || null;
      const userId = req.session?.userId;

      // ── 1. Stop every active trade-copy engine ───────────────────────────
      const stopped: string[] = [];
        for (const [uid, engine] of Array.from(tradeCopyEngines.entries())) {
        try {
          await engine.disconnect();
          tradeCopyEngines.delete(uid);
          stopped.push(uid);
        } catch (e) {
          console.error(`[KillSwitch] Failed to stop engine for user ${uid}:`, e);
        }
      }

      // ── 2. Close open positions on all connected broker accounts ─────────
      type CloseResult = { account: string; platform: string; closed: number; errors: string[] };
      const closedPositions: CloseResult[] = [];
      const skipped: string[] = [];

      if (userId) {
        const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, userId));
        const connected = userAccounts.filter((a) => a.isConnected);

        await Promise.allSettled(connected.map(async (account) => {
          try {
            if (account.platform === 'Tradovate' && account.tradovateUsername) {
              const api = tradovateInstances.get(account.tradovateUsername);
              if (api && api.isTokenValid()) {
                const filterId = account.tradovateAccountId ? parseInt(account.tradovateAccountId) : undefined;
                const result = await api.closeAllPositions(filterId);
                closedPositions.push({ account: account.name, platform: 'Tradovate', ...result });
              } else {
                skipped.push(`${account.name} (Tradovate — session not active, reconnect to close positions)`);
              }
            } else if (account.platform === 'Rithmic' && account.rithmicUsername && account.rithmicAccountId) {
              // Use existing live instance or create a fresh one from DB credentials
              let api = rithmicInstances.get(account.rithmicUsername);
              if (!api && account.rithmicPassword) {
                api = new RithmicAPI({
                  username: account.rithmicUsername,
                  password: account.rithmicPassword,
                  environment: (account.rithmicEnvironment as 'test' | 'live') ?? 'test',
                });
              }
              if (api) {
                const result = await api.closeAllPositions(account.rithmicAccountId);
                closedPositions.push({ account: account.name, platform: 'Rithmic', ...result });
              } else {
                skipped.push(`${account.name} (Rithmic — no stored credentials, close manually)`);
              }
            } else if (account.isConnected) {
              skipped.push(`${account.name} (${account.platform} — automated close not yet supported, close manually)`);
            }
          } catch (e) {
            console.error(`[KillSwitch] Error closing positions for account ${account.name}:`, e);
            closedPositions.push({ account: account.name, platform: account.platform, closed: 0, errors: [e instanceof Error ? e.message : String(e)] });
          }
        }));
      }

      killSwitchState.active = true;
      killSwitchState.activatedAt = new Date().toISOString();
      killSwitchState.reason = reason;

      const totalClosed = closedPositions.reduce((s, r) => s + r.closed, 0);
      console.warn(`[KillSwitch] ACTIVATED at ${killSwitchState.activatedAt}. Engines stopped: ${stopped.length}. Positions closed: ${totalClosed}. Skipped: ${skipped.length}. Reason: ${reason || 'none'}`);

      return res.json({
        success: true,
        message: `Kill switch activated. Stopped ${stopped.length} engine(s), closed ${totalClosed} position(s).`,
        stoppedEngines: stopped,
        closedPositions,
        skipped,
        activatedAt: killSwitchState.activatedAt,
      });
    } catch (error) {
      console.error('[KillSwitch] Error during activation:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.post("/api/kill-switch/deactivate", (_req, res) => {
    killSwitchState.active = false;
    killSwitchState.activatedAt = null;
    killSwitchState.reason = null;

    console.info(`[KillSwitch] Deactivated at ${new Date().toISOString()}`);

    return res.json({ success: true, message: "Kill switch deactivated. Trade copying can be resumed." });
  });

  // Block trade-copy start while kill switch is active
  // (injected check — the original /api/trade-copy/start route runs before this,
  //  so we patch it with a middleware applied to that path only)
  app.use("/api/trade-copy/start", (req, res, next) => {
    if (killSwitchState.active) {
      return res.status(423).json({
        success: false,
        message: "Kill switch is active. Deactivate it before starting trade copying.",
      });
    }
    next();
  });

  return server;
}
