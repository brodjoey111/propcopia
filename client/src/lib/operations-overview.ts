export interface OperationsOverviewResponse {
  success: boolean;
  generatedAt: string;
  copyGroups: {
    totalGroups: number;
    runningGroups: number;
    pausedGroups: number;
    unhealthyGroups: number;
    degradedGroups: number;
    alerts: number;
    connectedFollowers: number;
    totalFollowers: number;
  };
  positions: {
    totalAccounts: number;
    liveAccounts: number;
    disconnectedAccounts: number;
    unavailableAccounts: number;
    errorAccounts: number;
    totalOpenPositions: number;
  };
  trades: {
    total: number;
    filled: number;
    failed: number;
    pending: number;
    skippedOrRejected: number;
  };
  recentAlerts: Array<{
    eventId: string;
    groupId: string;
    groupName: string;
    timestamp: string;
    severity: "INFO" | "WARN" | "ERROR";
    category: "LIFECYCLE" | "TRADE" | "RULE" | "INTENT" | "EXECUTION" | "HEALTH";
    message: string;
  }>;
}
