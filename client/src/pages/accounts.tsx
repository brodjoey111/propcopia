import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountCard } from "@/components/account-card";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { ConfigureAccountDialog } from "@/components/configure-account-dialog";
import { GlobalRiskSettingsDialog } from "@/components/global-risk-settings-dialog";
import { DisconnectAccountAlert } from "@/components/disconnect-account-alert";
import { EmptyState } from "@/components/empty-state";
import { AccountGroupsView } from "@/components/account-groups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings, Loader2, LayoutGrid, List, Table2, Layers } from "lucide-react";
import type { Account } from "@shared/schema";

type ViewMode = 'grid' | 'list' | 'table' | 'groups';

export default function Accounts() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [globalSettings, setGlobalSettings] = useState({
    positionScaling: 100,
    maxContracts: undefined as number | undefined,
    blockedTickers: [] as string[],
  });
  const [disconnectAlert, setDisconnectAlert] = useState<{
    open: boolean;
    accountId: string;
    accountName: string;
  }>({ open: false, accountId: '', accountName: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accounts-view-mode');
      if (saved) {
        setViewMode(saved as ViewMode);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accounts-view-mode', viewMode);
    }
  }, [viewMode]);

  const { data: accountsData, isLoading } = useQuery<{ success: boolean; accounts: Account[] }>({
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

  const handleConfigure = (accountId: string, config: {
    riskMode: 'global' | 'custom';
    positionScaling: number;
    maxContracts: number | null;
    blockedTickers: string[];
  }) => {
    const account = accounts.find(a => a.id === accountId);
    toast({
      title: "Settings Updated",
      description: `Configuration saved for ${account?.name}`,
    });
  };

  const handleGlobalSettingsUpdate = (config: {
    positionScaling: number;
    maxContracts: number | null;
    blockedTickers: string[];
  }) => {
    setGlobalSettings({
      positionScaling: config.positionScaling,
      maxContracts: config.maxContracts || undefined,
      blockedTickers: config.blockedTickers,
    });
  };

  const getEffectiveSettings = (account: any) => {
    if (account.accountType !== 'follower') return account;
    
    if (account.riskMode === 'global') {
      return {
        ...account,
        positionScaling: globalSettings.positionScaling,
        maxContracts: globalSettings.maxContracts,
        blockedTickers: globalSettings.blockedTickers,
      };
    }
    
    return account;
  };

  const hasAccounts = accounts.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your master and follower trading accounts
          </p>
        </div>
        <div className="flex gap-2">
          {hasAccounts && (
            <GlobalRiskSettingsDialog
              positionScaling={globalSettings.positionScaling}
              maxContracts={globalSettings.maxContracts}
              blockedTickers={globalSettings.blockedTickers}
              onSave={handleGlobalSettingsUpdate}
            />
          )}
          <AddAccountDialog onAdd={handleAddAccount} />
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {hasAccounts && (
          <>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              data-testid="button-view-table"
            >
              <Table2 className="h-4 w-4 mr-2" />
              Table
            </Button>
          </>
        )}
        <Button
          variant={viewMode === 'groups' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('groups')}
          data-testid="button-view-groups"
        >
          <Layers className="h-4 w-4 mr-2" />
          Groups
        </Button>
      </div>

      {!hasAccounts ? (
        <AccountGroupsView
          accounts={accounts}
          onConnect={handleConnect}
          onDisconnect={handleDisconnectClick}
        />
      ) : viewMode === 'groups' ? (
        <AccountGroupsView
          accounts={accounts}
          onConnect={handleConnect}
          onDisconnect={handleDisconnectClick}
        />
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => {
                const effectiveAccount = getEffectiveSettings(account);
                return (
                  <AccountCard
                    key={account.id}
                    id={account.id}
                    name={account.name}
                    platform={account.platform}
                    accountType={account.accountType as 'master' | 'follower'}
                    isConnected={account.isConnected || false}
                    balance={account.balance ? parseFloat(account.balance) : 0}
                    openPositions={account.openPositions || 0}
                    pnl={account.pnl ? parseFloat(account.pnl) : 0}
                    positionScaling={effectiveAccount.positionScaling || undefined}
                    maxContracts={effectiveAccount.maxContracts || undefined}
                    blockedTickers={effectiveAccount.blockedTickers || []}
                    riskMode={(account.riskMode as 'global' | 'custom') || undefined}
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
                          globalSettings={globalSettings}
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
                );
              })}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-2">
              {accounts.map((account) => {
                const effectiveAccount = getEffectiveSettings(account);
                const balance = account.balance ? parseFloat(account.balance) : 0;
                const pnl = account.pnl ? parseFloat(account.pnl) : 0;
                
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`account-list-item-${account.id}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{account.name}</span>
                          <Badge variant={account.accountType === 'master' ? 'default' : 'secondary'} className="text-xs">
                            {account.accountType}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {account.platform}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className={`h-2 w-2 rounded-full ${account.isConnected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                          <span>{account.isConnected ? 'Connected' : 'Disconnected'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Balance</div>
                        <div className="font-semibold tabular-nums">${balance.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">P&L</div>
                        <div className={`font-semibold tabular-nums ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${pnl >= 0 ? '+' : ''}{pnl.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Positions</div>
                        <div className="font-semibold tabular-nums">{account.openPositions || 0}</div>
                      </div>

                      <div className="flex gap-2">
                        {account.accountType === 'follower' && (
                          <ConfigureAccountDialog
                            accountId={account.id}
                            accountName={account.name}
                            riskMode={(account.riskMode as 'global' | 'custom') || 'global'}
                            positionScaling={account.positionScaling || 100}
                            maxContracts={account.maxContracts || undefined}
                            blockedTickers={account.blockedTickers || []}
                            globalSettings={globalSettings}
                            onSave={(config) => handleConfigure(account.id, config)}
                          >
                            <Button variant="outline" size="sm" data-testid={`button-configure-${account.id}`}>
                              <Settings className="h-3 w-3" />
                            </Button>
                          </ConfigureAccountDialog>
                        )}
                        {account.isConnected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnectClick(account.id, account.name)}
                            data-testid={`button-disconnect-${account.id}`}
                          >
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleConnect(account.id)}
                            data-testid={`button-connect-${account.id}`}
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'table' && (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide">Account</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide">Type</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide">Platform</th>
                      <th className="text-left p-3 text-xs font-semibold uppercase tracking-wide">Status</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase tracking-wide">Balance</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase tracking-wide">P&L</th>
                      <th className="text-right p-3 text-xs font-semibold uppercase tracking-wide">Positions</th>
                      {accounts.some(a => a.accountType === 'follower') && (
                        <th className="text-right p-3 text-xs font-semibold uppercase tracking-wide">Scaling</th>
                      )}
                      <th className="text-right p-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((account) => {
                      const effectiveAccount = getEffectiveSettings(account);
                      const balance = account.balance ? parseFloat(account.balance) : 0;
                      const pnl = account.pnl ? parseFloat(account.pnl) : 0;

                      return (
                        <tr
                          key={account.id}
                          className="border-b hover-elevate"
                          data-testid={`account-table-row-${account.id}`}
                        >
                          <td className="p-3 font-semibold">{account.name}</td>
                          <td className="p-3">
                            <Badge variant={account.accountType === 'master' ? 'default' : 'secondary'} className="text-xs">
                              {account.accountType}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {account.platform}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${account.isConnected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                              <span className="text-sm">{account.isConnected ? 'Connected' : 'Disconnected'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-semibold tabular-nums">${balance.toLocaleString()}</td>
                          <td className={`p-3 text-right font-semibold tabular-nums ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${pnl >= 0 ? '+' : ''}{pnl.toLocaleString()}
                          </td>
                          <td className="p-3 text-right tabular-nums">{account.openPositions || 0}</td>
                          {accounts.some(a => a.accountType === 'follower') && (
                            <td className="p-3 text-right tabular-nums">
                              {account.accountType === 'follower' ? `${effectiveAccount.positionScaling}%` : '-'}
                            </td>
                          )}
                          <td className="p-3">
                            <div className="flex gap-2 justify-end">
                              {account.accountType === 'follower' && (
                                <ConfigureAccountDialog
                                  accountId={account.id}
                                  accountName={account.name}
                                  riskMode={(account.riskMode as 'global' | 'custom') || 'global'}
                                  positionScaling={account.positionScaling || 100}
                                  maxContracts={account.maxContracts || undefined}
                                  blockedTickers={account.blockedTickers || []}
                                  globalSettings={globalSettings}
                                  onSave={(config) => handleConfigure(account.id, config)}
                                >
                                  <Button variant="outline" size="sm" data-testid={`button-configure-${account.id}`}>
                                    <Settings className="h-3 w-3" />
                                  </Button>
                                </ConfigureAccountDialog>
                              )}
                              {account.isConnected ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDisconnectClick(account.id, account.name)}
                                  data-testid={`button-disconnect-${account.id}`}
                                >
                                  Disconnect
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleConnect(account.id)}
                                  data-testid={`button-connect-${account.id}`}
                                >
                                  Connect
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

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
