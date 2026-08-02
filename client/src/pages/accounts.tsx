import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountCard } from "@/components/account-card";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { RiskSettingsDialog, type RiskSettings, DEFAULT_RISK_SETTINGS } from "@/components/risk-settings-dialog";
import { DisconnectAccountAlert } from "@/components/disconnect-account-alert";
import { EmptyState } from "@/components/empty-state";
import { AccountGroupsView } from "@/components/account-groups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ShieldAlert, Loader2, LayoutGrid, List, Table2, Settings, Globe } from "lucide-react";
import type { Account } from "@shared/schema";

type ViewMode = 'grid' | 'list' | 'table' | 'groups';

export default function Accounts() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [addGroupTrigger, setAddGroupTrigger] = useState(0);
  const [globalSettings, setGlobalSettings] = useState<RiskSettings>(() => {
    try {
      const saved = localStorage.getItem('global-risk-settings-v1');
      return saved ? { ...DEFAULT_RISK_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_RISK_SETTINGS };
    } catch {
      return { ...DEFAULT_RISK_SETTINGS };
    }
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

  // Convert a DB account row → RiskSettings shape for the dialog
  const accountToRiskSettings = (account: Account): RiskSettings => {
    const a = account as any;
    return {
      riskMode:             (account.riskMode as 'global' | 'custom') || 'global',
      positionScaling:      account.positionScaling || 100,
      maxContracts:         account.maxContracts     ?? null,
      maxOpenPositions:     a.maxOpenPositions       ?? null,
      allowedDirections:    a.allowedDirections      || 'both',
      maxDailyLoss:         a.maxDailyLoss     ? parseFloat(a.maxDailyLoss)     : null,
      maxDailyLossPct:      a.maxDailyLossPct  ? parseFloat(a.maxDailyLossPct)  : null,
      maxWeeklyLoss:        a.maxWeeklyLoss    ? parseFloat(a.maxWeeklyLoss)    : null,
      maxWeeklyLossPct:     a.maxWeeklyLossPct ? parseFloat(a.maxWeeklyLossPct) : null,
      maxDrawdownPct:       a.maxDrawdownPct   ? parseFloat(a.maxDrawdownPct)   : null,
      maxConsecutiveLosses: a.maxConsecutiveLosses ?? null,
      blockedTickers:       account.blockedTickers   || [],
      allowedTickers:       a.allowedTickers         || [],
      maxTradesPerDay:      a.maxTradesPerDay         ?? null,
      minAccountBalance:    a.minAccountBalance ? parseFloat(a.minAccountBalance) : null,
      tradingStartTime:     a.tradingStartTime  ?? null,
      tradingEndTime:       a.tradingEndTime    ?? null,
      tradingDays:          a.tradingDays?.length ? a.tradingDays : ['mon','tue','wed','thu','fri'],
      cooldownAfterLoss:    a.cooldownAfterLoss ?? null,
      onBreachAction:       a.onBreachAction    || 'pause',
    };
  };

  const saveRiskSettingsMutation = useMutation({
    mutationFn: async ({ accountId, settings }: { accountId: string; settings: RiskSettings }) => {
      const res = await fetch(`/api/accounts/${accountId}/risk-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to save risk settings');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/accounts'] }),
  });

  const handleRiskSettingsSave = (accountId: string, settings: RiskSettings) => {
    saveRiskSettingsMutation.mutate({ accountId, settings });
    const account = accounts.find(a => a.id === accountId);
    toast({ title: "Risk Settings Saved", description: `Updated for ${account?.name}` });
  };

  const handleGlobalSettingsUpdate = (settings: RiskSettings) => {
    setGlobalSettings(settings);
    try { localStorage.setItem('global-risk-settings-v1', JSON.stringify(settings)); } catch {}
    toast({ title: "Global Defaults Saved", description: "All accounts on 'Global' mode now use these limits." });
  };

  const getEffectiveSettings = (account: any) => {
    if (account.riskMode === 'global') {
      return { ...account, ...globalSettings };
    }
    return account;
  };

  // Count active risk limits on an account (for badge)
  const countActiveLimits = (settings: RiskSettings): number =>
    [settings.maxDailyLoss, settings.maxDailyLossPct, settings.maxWeeklyLoss,
     settings.maxWeeklyLossPct, settings.maxDrawdownPct, settings.maxConsecutiveLosses,
     settings.maxOpenPositions, settings.maxTradesPerDay, settings.minAccountBalance,
     settings.cooldownAfterLoss].filter(v => v !== null && v !== undefined && v !== 0).length
    + (settings.blockedTickers?.length ? 1 : 0)
    + (settings.allowedTickers?.length ? 1 : 0)
    + (settings.allowedDirections !== 'both' ? 1 : 0)
    + (settings.tradingStartTime ? 1 : 0);

  const hasAccounts = accounts.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Account command</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your master and follower trading accounts
          </p>
        </div>
        <div className="flex gap-2">
          <AddAccountDialog onAdd={handleAddAccount} />
        </div>
      </div>

      {/* ── Global Risk Defaults panel ───────────────────────────── */}
      <div className="panel-surface rounded-[1.4rem] p-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="rounded-lg bg-primary/10 p-2.5 shrink-0 w-fit">
          <ShieldAlert className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Global Risk Defaults</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set limits once here — every account using <span className="font-medium text-foreground">Global</span> mode inherits them automatically.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {globalSettings.maxDailyLoss && (
              <Badge variant="secondary" className="text-xs">Daily loss: ${globalSettings.maxDailyLoss.toLocaleString()}</Badge>
            )}
            {globalSettings.maxDailyLossPct && (
              <Badge variant="secondary" className="text-xs">Daily loss: {globalSettings.maxDailyLossPct}%</Badge>
            )}
            {globalSettings.maxDrawdownPct && (
              <Badge variant="secondary" className="text-xs">Drawdown: {globalSettings.maxDrawdownPct}%</Badge>
            )}
            {globalSettings.maxWeeklyLoss && (
              <Badge variant="secondary" className="text-xs">Weekly loss: ${globalSettings.maxWeeklyLoss.toLocaleString()}</Badge>
            )}
            {globalSettings.maxConsecutiveLosses && (
              <Badge variant="secondary" className="text-xs">Max {globalSettings.maxConsecutiveLosses} consecutive losses</Badge>
            )}
            {globalSettings.allowedDirections !== 'both' && (
              <Badge variant="secondary" className="text-xs capitalize">{globalSettings.allowedDirections} only</Badge>
            )}
            {globalSettings.positionScaling !== 100 && (
              <Badge variant="secondary" className="text-xs">Scaling: {globalSettings.positionScaling}%</Badge>
            )}
            {countActiveLimits(globalSettings) === 0 && (
              <span className="text-xs text-muted-foreground italic">No limits set yet</span>
            )}
          </div>
        </div>
        <RiskSettingsDialog
          name="Global Risk Defaults"
          kind="group"
          settings={globalSettings}
          onSave={handleGlobalSettingsUpdate}
        >
          <Button variant="outline" size="sm" className="shrink-0">
            <Settings className="mr-2 h-3.5 w-3.5" />
            Edit Defaults
          </Button>
        </RiskSettingsDialog>
      </div>

      <div className="flex gap-1 rounded-xl border border-border bg-muted/80 p-1 w-fit">
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

      </div>

      {!hasAccounts ? (
        <AccountGroupsView
          accounts={accounts}
          onConnect={handleConnect}
          onDisconnect={handleDisconnectClick}
          addGroupTrigger={addGroupTrigger}
        />
      ) : viewMode === 'groups' ? (
        <AccountGroupsView
          accounts={accounts}
          onConnect={handleConnect}
          onDisconnect={handleDisconnectClick}
          addGroupTrigger={addGroupTrigger}
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
                      <RiskSettingsDialog
                        name={account.name}
                        kind="account"
                        settings={accountToRiskSettings(account)}
                        globalSettings={globalSettings}
                        onSave={(s) => handleRiskSettingsSave(account.id, s)}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          data-testid={`button-configure-${account.id}`}
                        >
                          <ShieldAlert className="mr-2 h-3 w-3" />
                          Risk Settings
                          {account.riskMode === 'global'
                            ? <Globe className="ml-1.5 h-3 w-3 text-muted-foreground" />
                            : countActiveLimits(accountToRiskSettings(account)) > 0
                              ? <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                              : null}
                        </Button>
                      </RiskSettingsDialog>
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
                    className="panel-surface flex items-center justify-between rounded-[1.2rem] p-4 hover-elevate"
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
                          <div className={`h-2 w-2 rounded-full ${account.isConnected ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]' : 'bg-muted-foreground'}`} />
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
                        <RiskSettingsDialog
                          name={account.name}
                          kind="account"
                          settings={accountToRiskSettings(account)}
                          globalSettings={globalSettings}
                          onSave={(s) => handleRiskSettingsSave(account.id, s)}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-configure-${account.id}`}
                            title={account.riskMode === 'global' ? 'Using global defaults' : 'Custom risk settings'}
                          >
                            <ShieldAlert className="h-3 w-3" />
                            {account.riskMode === 'global'
                              ? <Globe className="ml-1 h-3 w-3 text-muted-foreground" />
                              : countActiveLimits(accountToRiskSettings(account)) > 0
                                ? <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                                : null}
                          </Button>
                        </RiskSettingsDialog>
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
            <div className="panel-surface overflow-hidden rounded-[1.4rem]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/6 bg-white/[0.03]">
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
                              <div className={`h-2 w-2 rounded-full ${account.isConnected ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]' : 'bg-muted-foreground'}`} />
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
                              <RiskSettingsDialog
                                name={account.name}
                                kind="account"
                                settings={accountToRiskSettings(account)}
                                globalSettings={globalSettings}
                                onSave={(s) => handleRiskSettingsSave(account.id, s)}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-testid={`button-configure-${account.id}`}
                                  title={account.riskMode === 'global' ? 'Using global defaults' : 'Custom risk settings'}
                                >
                                  <ShieldAlert className="h-3 w-3" />
                                  {account.riskMode === 'global'
                                    ? <Globe className="ml-1 h-3 w-3 text-muted-foreground" />
                                    : countActiveLimits(accountToRiskSettings(account)) > 0
                                      ? <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                                      : null}
                                </Button>
                              </RiskSettingsDialog>
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
