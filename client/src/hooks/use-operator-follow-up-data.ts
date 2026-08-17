import { useMemo } from "react";

import { buildAccountRiskFollowUpQueue, type AccountRiskItem } from "@/lib/account-risk";
import {
  buildRiskFollowUpItems,
  buildRithmicReadinessFollowUpItems,
  filterExecutionFollowUpItems,
  filterRiskFollowUpItems,
  filterRithmicReadinessFollowUpItems,
  mergeExecutionFollowUpItems,
  summarizeExecutionFollowUpItems,
  summarizeRiskFollowUpItems,
  summarizeRithmicReadinessFollowUpItems,
  type ExecutionFollowUpFilter,
  type ExecutionFollowUpReviewEntry,
  type RithmicReadinessFollowUpFilter,
  type RithmicReadinessReviewEntry,
  type RiskFollowUpFilter,
  type RiskFollowUpReviewEntry,
} from "@/lib/follow-up-operator";
import {
  buildRiskNotificationFollowUpQueue,
  type NotificationItem,
} from "@/lib/notifications";
import {
  buildExecutionRecoveryFollowUpQueue,
  type DashboardRuntimeOverviewResponse,
} from "@/lib/runtime-overview";

interface UseOperatorFollowUpDataOptions {
  notifications?: NotificationItem[];
  showReviewed?: boolean;
  reviewedRiskFollowUpItems?: Record<string, string>;
  accountRiskAccounts?: AccountRiskItem[];
  executionRecovery?: DashboardRuntimeOverviewResponse["tradeAnalytics"]["executionRecovery"] | null;
  riskReviews?: RiskFollowUpReviewEntry[];
  executionReviews?: ExecutionFollowUpReviewEntry[];
  rithmicReadinessReviews?: RithmicReadinessReviewEntry[];
  riskFilter?: RiskFollowUpFilter;
  riskSearch?: string;
  executionFilter?: ExecutionFollowUpFilter;
  executionSearch?: string;
  executionNotes?: Record<string, string>;
  rithmicReadinessFilter?: RithmicReadinessFollowUpFilter;
  rithmicReadinessSearch?: string;
}

export function useOperatorFollowUpData(
  options: UseOperatorFollowUpDataOptions,
) {
  const allRiskNotificationItems = useMemo(
    () => buildRiskNotificationFollowUpQueue(options.notifications ?? []),
    [options.notifications],
  );

  const accountRiskFollowUpItems = useMemo(
    () => buildAccountRiskFollowUpQueue(options.accountRiskAccounts ?? []),
    [options.accountRiskAccounts],
  );

  const riskFollowUpItems = useMemo(
    () =>
      buildRiskFollowUpItems({
        accountItems: accountRiskFollowUpItems,
        notificationItems: allRiskNotificationItems,
        reviews: options.riskReviews ?? [],
      }),
    [accountRiskFollowUpItems, allRiskNotificationItems, options.riskReviews],
  );

  const filteredRiskFollowUpItems = useMemo(
    () =>
      filterRiskFollowUpItems(
        riskFollowUpItems,
        options.riskFilter ?? "all",
        options.riskSearch ?? "",
      ),
    [options.riskFilter, options.riskSearch, riskFollowUpItems],
  );

  const riskFollowUpSummary = useMemo(
    () => summarizeRiskFollowUpItems(riskFollowUpItems),
    [riskFollowUpItems],
  );

  const executionRecoveryItems = useMemo(
    () => buildExecutionRecoveryFollowUpQueue(options.executionRecovery),
    [options.executionRecovery],
  );

  const executionFollowUpItems = useMemo(
    () =>
      mergeExecutionFollowUpItems(
        executionRecoveryItems,
        options.executionReviews ?? [],
      ),
    [executionRecoveryItems, options.executionReviews],
  );

  const filteredExecutionFollowUpItems = useMemo(
    () =>
      filterExecutionFollowUpItems(
        executionFollowUpItems,
        options.executionFilter ?? "all",
        options.executionSearch ?? "",
        options.executionNotes ?? {},
      ),
    [
      executionFollowUpItems,
      options.executionFilter,
      options.executionNotes,
      options.executionSearch,
    ],
  );

  const executionFollowUpSummary = useMemo(
    () => summarizeExecutionFollowUpItems(executionFollowUpItems),
    [executionFollowUpItems],
  );

  const rithmicReadinessFollowUpItems = useMemo(
    () =>
      buildRithmicReadinessFollowUpItems(
        options.notifications ?? [],
        options.rithmicReadinessReviews ?? [],
      ),
    [options.notifications, options.rithmicReadinessReviews],
  );

  const filteredRithmicReadinessFollowUpItems = useMemo(
    () =>
      filterRithmicReadinessFollowUpItems(
        rithmicReadinessFollowUpItems,
        options.rithmicReadinessFilter ?? "all",
        options.rithmicReadinessSearch ?? "",
      ),
    [
      options.rithmicReadinessFilter,
      options.rithmicReadinessSearch,
      rithmicReadinessFollowUpItems,
    ],
  );

  const rithmicReadinessFollowUpSummary = useMemo(
    () => summarizeRithmicReadinessFollowUpItems(rithmicReadinessFollowUpItems),
    [rithmicReadinessFollowUpItems],
  );

  const visibleRiskNotificationItems = useMemo(
    () =>
      allRiskNotificationItems.filter(
        (item) =>
          options.showReviewed ||
          !(
            options.reviewedRiskFollowUpItems?.[item.id] ||
            options.riskReviews?.some(
              (review) => review.accountId === item.id && review.reviewedAt,
            )
          ),
      ),
    [
      allRiskNotificationItems,
      options.reviewedRiskFollowUpItems,
      options.riskReviews,
      options.showReviewed,
    ],
  );

  const visibleExecutionFollowUpItems = useMemo(
    () =>
      executionFollowUpItems.filter(
        (item) => options.showReviewed || item.reviewStatus !== "reviewed",
      ),
    [executionFollowUpItems, options.showReviewed],
  );

  const visibleRithmicReadinessFollowUpItems = useMemo(
    () =>
      rithmicReadinessFollowUpItems.filter(
        (item) => options.showReviewed || item.review?.status !== "reviewed",
      ),
    [rithmicReadinessFollowUpItems, options.showReviewed],
  );

  return {
    allRiskNotificationItems,
    visibleRiskNotificationItems,
    accountRiskFollowUpItems,
    riskFollowUpItems,
    filteredRiskFollowUpItems,
    riskFollowUpSummary,
    executionRecoveryItems,
    executionFollowUpItems,
    filteredExecutionFollowUpItems,
    executionFollowUpSummary,
    visibleExecutionFollowUpItems,
    rithmicReadinessFollowUpItems,
    filteredRithmicReadinessFollowUpItems,
    rithmicReadinessFollowUpSummary,
    visibleRithmicReadinessFollowUpItems,
  };
}
