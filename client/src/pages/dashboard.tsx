import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { queryClient } from "@/lib/queryClient";
import { Wallet, TrendingUp, Activity, Users, Settings } from "lucide-react";
import type { Account as AccountType } from "@shared/schema";

interface Account extends AccountType {
  openPositions?: number;
  pnl?: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  
  const [disconnectAlert, setDisconnectAlert] = useState<{
    open: boolean;
    accountId: string;
    accountName: string;
  }>({ open: false, accountId: '', accountName: '' });

  const globalRiskSettings = {
    positionScaling: 100,
    maxContracts: undefined,
    blockedTickers: [] as string[],
  };

  const { data: accountsData } = useQuery<{ success: boolean; accounts: Account[] }>({
    queryKey: ['/api/accounts'],
  });

  const accounts = accountsData?.accounts || [];

  const addAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to add account');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
    },
  });

  const handleAddAccount = async (newAccount: any) => {
    try {
      await addAccountMutation.mutateAsync({
        name: newAccount.name,
        platform: newAccount.platform,
        accountType: newAccount.accountType,
        tradovateUsername: newAccount.username,
        tradovateAccountId: newAccount.tradovateAccountId,
        tradovateEnvironment: newAccount.environment,
        isConnected: false,
        ...(newAccount.accountType === 'follower' && { positionScaling: 100 }),
      });

      toast({
        title: "Account Added",
        description: `${newAccount.name} has been added successfully`,
      });
    } catch (error) {
      toast({
        title: "Failed to Add Account",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleConfigure = (accountId: string, config: any) => {
    const account = accounts.find(a => a.id === accountId);
    toast({
      title: "Settings Updated",
      description: `Configuration saved for ${account?.name}`,
    });
  };

  const handleConnect = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    toast({
      title: "Account Connected",
      description: `${account?.name} is now connected and will copy trades`,
    });
  };

  const handleDisconnectClick = (accountId: string, accountName: string) => {
    setDisconnectAlert({ open: true, accountId, accountName });
  };

  const handleDisconnectConfirm = () => {
    const account = accounts.find(a => a.id === disconnectAlert.accountId);
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
    balance: acc.balance ? parseFloat(acc.balance) : 0,
    pnl: acc.pnl || 0,
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
        accountType={account.accountType as 'master' | 'follower'}
        isConnected={account.isConnected || false}
        balance={account.balance ? parseFloat(account.balance) : 0}
        openPositions={account.openPositions || 0}
        pnl={account.pnl || 0}
        onConnect={() => handleConnect(account.id)}
        onDisconnect={() => handleDisconnectClick(account.id, account.name)}
        configureButton={
          account.accountType === 'follower' ? (
            <ConfigureAccountDialog
              accountId={account.id}
              accountName={account.name}
              riskMode={(account.riskMode as 'global' | 'custom') || 'global'}
              positionScaling={account.positionScaling || 100}
              maxContracts={account.maxContracts || undefined}
              blockedTickers={account.blockedTickers || []}
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
          <AddAccountDialog onAdd={handleAddAccount} />
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
