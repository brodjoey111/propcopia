/**
 * DashboardService
 *
 * This service is responsible for talking to the backend Dashboard API.
 * Every dashboard component will use this file instead of calling fetch()
 * directly.
 */

export interface DashboardSummary {
  registeredConnections: number;
  connectedBrokers: number;
  connectedAccounts: number;
  totalBalance: number;
  totalTodayPnl: number;
  totalOpenPositions: number;
}

export interface DashboardAccount {
  id?: string;
  name?: string;
  accountId?: string;
  balance?: number;
  todayPnl?: number;
  openPositions?: number;
  buyingPower?: number;
}

export interface DashboardResponse {
  success: boolean;
  generatedAt: string;

  summary: DashboardSummary;

  brokers: any[];

  accounts: DashboardAccount[];
}

class DashboardService {
  /**
   * Load dashboard data from the backend
   */
  async getDashboard(): Promise<DashboardResponse> {
    const response = await fetch("/api/dashboard", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to load dashboard.");
    }

    return await response.json();
  }
}

export const dashboardService = new DashboardService();