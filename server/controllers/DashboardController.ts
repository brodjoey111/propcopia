import type { Request, Response } from "express";
import type { BrokerAccount } from "../brokers/types";
import { brokerManager } from "../brokers/BrokerManager";

/**
 * Safely reads a numeric property from a broker account.
 *
 * Different brokers may use slightly different property names,
 * so this function checks every supplied name and returns the
 * first valid number it finds.
 */
function getAccountNumber(
  account: BrokerAccount,
  propertyNames: string[],
): number {
  const accountData = account as unknown as Record<string, unknown>;

  for (const propertyName of propertyNames) {
    const value = accountData[propertyName];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return 0;
}

export class DashboardController {
  /**
   * Returns connection information, account details,
   * and combined dashboard totals.
   */
  static async getDashboard(req: Request, res: Response) {
    try {
      const userId = req.session?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Please log in.",
        });
      }

      const connectionIds = brokerManager.getRegisteredConnectionIds();

      const brokerConnections = await Promise.all(
        connectionIds.map(async (connectionId) => {
          const brokerType = brokerManager.getBrokerType(connectionId);
          const broker = brokerManager.getBroker(connectionId);
          const connected = broker.isConnected();

          let accounts: BrokerAccount[] = [];
          let accountError: string | null = null;

          if (connected) {
            try {
              accounts = await brokerManager.getAccounts(connectionId);
            } catch (error) {
              accountError =
                error instanceof Error
                  ? error.message
                  : "Failed to retrieve broker accounts.";

              console.error(
                `[DashboardController] Failed to load accounts for ${connectionId}:`,
                error,
              );
            }
          }

          return {
            connectionId,
            brokerType,
            connected,
            accountCount: accounts.length,
            accountError,
            accounts,
          };
        }),
      );

      const accounts: BrokerAccount[] = brokerConnections.flatMap(
        (connection) => connection.accounts,
      );

      const connectedBrokerCount = brokerConnections.filter(
        (connection) => connection.connected,
      ).length;

      /*
       * Accounts returned by a connected broker are treated as connected.
       * BrokerAccount does not currently have its own connected property.
       */
      const connectedAccountCount = accounts.length;

      const totalBalance = accounts.reduce((total, account) => {
        return (
          total +
          getAccountNumber(account, [
            "balance",
            "accountBalance",
            "cashBalance",
            "netLiquidation",
          ])
        );
      }, 0);

      const totalTodayPnl = accounts.reduce((total, account) => {
        return (
          total +
          getAccountNumber(account, [
            "todayPnl",
            "todayPnL",
            "dailyPnl",
            "dailyPnL",
            "dayPnl",
            "dayPnL",
          ])
        );
      }, 0);

      const totalOpenPositions = accounts.reduce((total, account) => {
        return (
          total +
          getAccountNumber(account, [
            "openPositions",
            "positionCount",
            "openPositionCount",
          ])
        );
      }, 0);

      return res.status(200).json({
        success: true,
        generatedAt: new Date().toISOString(),

        summary: {
          registeredConnections: brokerConnections.length,
          connectedBrokers: connectedBrokerCount,
          connectedAccounts: connectedAccountCount,
          totalBalance,
          totalTodayPnl,
          totalOpenPositions,
        },

        brokers: brokerConnections,
        accounts,
      });
    } catch (error) {
      console.error("[DashboardController] Dashboard error:", error);

      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data.",
      });
    }
  }
}