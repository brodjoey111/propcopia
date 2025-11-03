import { StatsCard } from "@/components/stats-card";
import { AccountCard } from "@/components/account-card";
import { TradeLogTable } from "@/components/trade-log-table";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { PerformanceChart } from "@/components/performance-chart";
import { AccountBalanceChart } from "@/components/account-balance-chart";
import { TradeDistributionChart } from "@/components/trade-distribution-chart";
import { DraggableDashboardGrid } from "@/components/draggable-dashboard-grid";
import { Wallet, TrendingUp, Activity, Users } from "lucide-react";

export default function Dashboard() {
  // todo: remove mock functionality
  const mockAccounts = [
    {
      id: '1',
      name: 'Main Trading',
      platform: 'NinjaTrader',
      accountType: 'master' as const,
      isConnected: true,
      balance: 52340,
      openPositions: 3,
      pnl: 1240,
    },
    {
      id: '2',
      name: 'Follower Account 1',
      platform: 'Tradovate',
      accountType: 'follower' as const,
      isConnected: true,
      balance: 28900,
      openPositions: 3,
      pnl: 620,
      positionScaling: 50,
    },
    {
      id: '3',
      name: 'Follower Account 2',
      platform: 'NinjaTrader',
      accountType: 'follower' as const,
      isConnected: true,
      balance: 44100,
      openPositions: 3,
      pnl: 1240,
      positionScaling: 100,
    },
  ];

  const mockTrades = [
    {
      id: '1',
      timestamp: '11:23:45 AM',
      masterAccount: 'Main Trading',
      symbol: 'ES',
      action: 'BUY' as const,
      quantity: 5,
      price: 4523.25,
      followersExecuted: 2,
      followersTotal: 2,
      status: 'success' as const,
    },
    {
      id: '2',
      timestamp: '11:18:32 AM',
      masterAccount: 'Main Trading',
      symbol: 'NQ',
      action: 'SELL' as const,
      quantity: 3,
      price: 15234.50,
      followersExecuted: 2,
      followersTotal: 2,
      status: 'success' as const,
    },
    {
      id: '3',
      timestamp: '10:45:12 AM',
      masterAccount: 'Main Trading',
      symbol: 'ES',
      action: 'CLOSE' as const,
      quantity: 5,
      price: 4528.75,
      followersExecuted: 2,
      followersTotal: 2,
      status: 'success' as const,
    },
  ];

  const performanceData = [
    { time: '9:00', pnl: 0 },
    { time: '9:30', pnl: 450 },
    { time: '10:00', pnl: 820 },
    { time: '10:30', pnl: 1200 },
    { time: '11:00', pnl: 1650 },
    { time: '11:30', pnl: 2340 },
    { time: '12:00', pnl: 2780 },
    { time: '12:30', pnl: 2950 },
    { time: '13:00', pnl: 3100 },
  ];

  const balanceData = mockAccounts.map(acc => ({
    name: acc.name.replace(' Account', ''),
    balance: acc.balance,
    pnl: acc.pnl,
  }));

  const distributionData = [
    { name: 'Successful', value: 124, color: 'hsl(var(--chart-2))' },
    { name: 'Failed', value: 8, color: 'hsl(var(--destructive))' },
    { name: 'Pending', value: 16, color: 'hsl(var(--chart-4))' },
  ];

  // Stats cards sections
  const statsCards = [
    {
      id: 'stat-balance',
      component: (
        <StatsCard
          label="Total Balance"
          value="$125,340"
          change={12.5}
          icon={Wallet}
          testId="text-total-balance"
        />
      ),
    },
    {
      id: 'stat-accounts',
      component: (
        <StatsCard
          label="Active Accounts"
          value="3"
          icon={Users}
        />
      ),
    },
    {
      id: 'stat-pnl',
      component: (
        <StatsCard
          label="Today's P&L"
          value="$3,100"
          change={8.4}
          icon={TrendingUp}
        />
      ),
    },
    {
      id: 'stat-trades',
      component: (
        <StatsCard
          label="Trades Copied"
          value="148"
          icon={Activity}
        />
      ),
    },
  ];

  // Chart sections
  const chartSections = [
    {
      id: 'chart-performance',
      component: <PerformanceChart data={performanceData} title="Today's P&L Performance" />,
    },
    {
      id: 'chart-balance',
      component: <AccountBalanceChart data={balanceData} title="Account Balances & P&L" />,
    },
  ];

  // Account card sections
  const accountSections = mockAccounts.map((account) => ({
    id: `account-${account.id}`,
    component: (
      <AccountCard
        key={account.id}
        {...account}
        onConfigure={() => console.log(`Configure ${account.name}`)}
        onDisconnect={() => console.log(`Disconnect ${account.name}`)}
      />
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor your trading accounts and activity • Drag sections to customize layout
          </p>
        </div>
        <AddAccountDialog onAdd={(account) => console.log('Account added:', account)} />
      </div>

      <div>
        <DraggableDashboardGrid
          sections={statsCards}
          gridClassName="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
          storageKey="dashboard-stats-layout"
        />
      </div>

      <div>
        <DraggableDashboardGrid
          sections={chartSections}
          gridClassName="grid grid-cols-1 gap-6 lg:grid-cols-2"
          storageKey="dashboard-charts-layout"
        />
      </div>

      <div>
        <DraggableDashboardGrid
          sections={[
            {
              id: 'distribution-chart',
              component: <TradeDistributionChart data={distributionData} title="Trade Execution Status" />,
            },
          ]}
          gridClassName="grid grid-cols-1"
          storageKey="dashboard-distribution-layout"
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Connected Accounts</h2>
        <DraggableDashboardGrid
          sections={accountSections}
          gridClassName="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          storageKey="dashboard-accounts-layout"
        />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Recent Trades</h2>
        <TradeLogTable trades={mockTrades} />
      </div>
    </div>
  );
}
