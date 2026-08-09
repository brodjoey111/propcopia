import type { AccountLiveMetricsResponse } from "./account-live-metrics";
import type { CopyGroupSnapshotApiResponse } from "./copy-groups";
import type { OperationsOverviewResponse } from "./operations-overview";
import type { PositionSnapshotResponse } from "./positions";
import type {
  TradeHistoryDailySummary,
  TradeHistorySummary,
} from "./trade-history";

export interface AccountsRuntimeOverviewResponse {
  success: boolean;
  generatedAt: string;
  positionSnapshot: PositionSnapshotResponse;
  accountLiveMetrics: AccountLiveMetricsResponse;
}

export interface DashboardRuntimeOverviewResponse extends AccountsRuntimeOverviewResponse {
  copyGroups: CopyGroupSnapshotApiResponse;
  operationsOverview: OperationsOverviewResponse;
  tradeAnalytics: {
    summary: TradeHistorySummary;
    dailyExecutionSeries: TradeHistoryDailySummary[];
  };
}
