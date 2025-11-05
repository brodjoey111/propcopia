import { useState } from "react";
import { StatsCard } from "@/components/stats-card";
import { AccountCard } from "@/components/account-card";
import { TradeLogTable } from "@/components/trade-log-table";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { PerformanceChart } from "@/components/performance-chart";
import { AccountBalanceChart } from "@/components/account-balance-chart";
import { TradeDistributionChart } from "@/components/trade-distribution-chart";
import { DraggableDashboardGrid } from "@/components/draggable-dashboard-grid";
import { ConfigureAccountDialog } from "@/components/configure-account-dialog";
import { DisconnectAccountAlert } from "@/components/disconnect-account-alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Wallet, TrendingUp, Activity, Users, Settings } from "lucide-react";

interface Account {
  id: string;
  name: string;
  platform: string;
  accountType: 'master' | 'follower';
  isConnected: boolean;
  balance: number;
  openPositions: number;
  pnl: number;
  positionScaling?: number;
  maxContracts?: number;
  blockedTickers?: string[];
  riskMode?: 'global' | 'custom';
}

export default function Dashboard() {
  const { toast } = useToast();
  // State for disconnect confirmation
  const [disconnectAlert, setDisconnectAlert] = useState<{
    open: boolean;
    accountId: string;
    accountName: string;
  }>({ open: false, accountId: '', accountName: '' });

  // Global risk settings (for demo purposes)
  const globalRiskSettings = {
    positionScaling: 100,
    maxContracts: undefined,
    blockedTickers: [] as string[],
  };

  // Account state management - fetch from database
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Handler for configuring accounts
  const handleConfigure = (accountId: string, config: any) => {
    setAccounts(prev => prev.map(acc => 
      acc.id === accountId 
        ? {
            ...acc,
            riskMode: config.riskMode,
            positionScaling: config.positionScaling,
            maxContracts: config.maxContracts,
            blockedTickers: config.blockedTickers,
          }
        : acc
    ));
    
    const account = accounts.find(a => a.id === accountId);
    toast({
      title: "Settings Updated",
      description: `Configuration saved for ${account?.name}`,
    });
  };

  // Handler for connecting accounts
  const handleConnect = (accountId: string) => {
    setAccounts(prev => prev.map(acc => 
      acc.id === accountId ? { ...acc, isConnected: true } : acc
    ));
    
    const account = accounts.find(a => a.id === accountId);
    toast({
      title: "Account Connected",
      description: `${account?.name} is now connected and will copy trades`,
    });
  };

  // Handler for initiating disconnect
  const handleDisconnectClick = (accountId: string, accountName: string) => {
    setDisconnectAlert({ open: true, accountId, accountName });
  };

  // Handler for confirming disconnect
  const handleDisconnectConfirm = () => {
    const accountId = disconnectAlert.accountId;
    setAccounts(prev => prev.map(acc => 
      acc.id === accountId ? { ...acc, isConnected: false } : acc
    ));
    
    const account = accounts.find(a => a.id === accountId);
    toast({
      title: "Account Disconnected",
      description: `${account?.name} has been disconnected`,
      variant: "destructive",
    });
    
    setDisconnectAlert({ open: false, accountId: '', accountName: '' });
  };

  const mockTrades: any[] = [];

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

  const balanceData = accounts.map(acc => ({
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
  const accountSections = accounts.map((account) => ({
    id: `account-${account.id}`,
    component: (
      <AccountCard
        key={account.id}
        {...account}
        onConnect={() => handleConnect(account.id)}
        onDisconnect={() => handleDisconnectClick(account.id, account.name)}
        configureButton={
          account.accountType === 'follower' ? (
            <ConfigureAccountDialog
              accountId={account.id}
              accountName={account.name}
              riskMode={account.riskMode || 'custom'}
              positionScaling={account.positionScaling}
              maxContracts={account.maxContracts}
              blockedTickers={account.blockedTickers}
              globalSettings={globalRiskSettings}
              onSave={(config) => handleConfigure(account.id, config)}
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                data-testid={`button-configure-${account.id}`}
              >
                <Settings className="mr-2 h-3 w-3" />
                Configure
              </Button>
            </ConfigureAccountDialog>
          ) : undefined
        }
      />
    ),
  }));

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">
            Monitor your trading accounts and activity • Drag sections to customize layout
          </p>
        </div>
        <div className="flex-shrink-0">
          <AddAccountDialog onAdd={(account) => console.log('Account added:', account)} />
        </div>
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
        <h2 className="mb-3 md:mb-4 text-lg md:text-xl font-semibold">Connected Accounts</h2>
        <DraggableDashboardGrid
          sections={accountSections}
          gridClassName="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          storageKey="dashboard-accounts-layout"
        />
      </div>

      <div>
        <h2 className="mb-3 md:mb-4 text-lg md:text-xl font-semibold">Recent Trades</h2>
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-3 sm:px-0">
            <TradeLogTable trades={mockTrades} />
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Alert */}
      <DisconnectAccountAlert
        open={disconnectAlert.open}
        onOpenChange={(open) => setDisconnectAlert(prev => ({ ...prev, open }))}
        accountName={disconnectAlert.accountName}
        onConfirm={handleDisconnectConfirm}
      />
    </div>
  );
}
