import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountCard } from "@/components/account-card";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { BrokerSettingsDialog } from "@/components/broker-settings-dialog";
import { RiskSettingsDialog, type RiskSettings, DEFAULT_RISK_SETTINGS } from "@/components/risk-settings-dialog";
import { DisconnectAccountAlert } from "@/components/disconnect-account-alert";
import { EmptyState } from "@/components/empty-state";
import { AccountGroupsView } from "@/components/account-groups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import type { AccountCreatePayload } from "@/lib/account-create-payload";
import {
  connectAccount,
  disconnectAccount,
  updateAccountConnectionInQueryData,
} from "@/lib/account-connection-api";
import {
  buildAccountLiveMetricsById,
  type PositionSnapshotResponse,
} from "@/lib/positions";
import {
  buildAccountBalanceMetricsById,
} from "@/lib/account-live-metrics";
import {
  LIVE_QUERY_POLL_MS,
  LIVE_QUERY_STALE_MS,
  SESSION_STATUS_POLL_MS,
} from "@/lib/live-query-config";
import type { AccountsRuntimeOverviewResponse } from "@/lib/runtime-overview";
import { ShieldAlert, Loader2, LayoutGrid, List, Table2, Settings, Globe } from "lucide-react";
import type { Account } from "@shared/schema";

type ViewMode = 'grid' | 'list' | 'table' | 'groups';

interface AuthMeResponse {
  success: boolean;
  user: {
    id: string;
    username: string;
  };
}

interface TradeCopyStatusResponse {
  success: boolean;
  data: {
    masterAccountId: string | null;
    masterConnected: boolean;
    masterConnectionType: "tradovate" | "rithmic" | "none";
    followerCount: number;
    connectedFollowerCount: number;
    ready: boolean;
    followers: Array<{
      accountId: string;
      brokerKind: "tradovate" | "rithmic" | "legacy_websocket";
      connected: boolean;
    }>;
  };
}

export default function Accounts() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [addGroupTrigger, setAddGroupTrigger] = useState(0);
  const [sessionMasterAccountId, setSessionMasterAccountId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('copy-session-master-account-id');
    } catch {
      return null;
    }
  });
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (sessionMasterAccountId) {
      localStorage.setItem('copy-session-master-account-id', sessionMasterAccountId);
    } else {
      localStorage.removeItem('copy-session-master-account-id');
    }
  }, [sessionMasterAccountId]);

  const { data: accountsData, isLoading } = useQuery<{ success: boolean; accounts: Account[] }>({
    queryKey: ['/api/accounts'],
  });
  const accounts = accountsData?.accounts || [];
  const { data: authData } = useQuery<AuthMeResponse | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });
  const { data: tradeCopyStatusData } = useQuery<TradeCopyStatusResponse | null>({
    queryKey: authData?.user?.id ? ['/api/trade-copy/status', authData.user.id] : ['/api/trade-copy/status', 'anonymous'],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey.join('/') as string, {
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 404) {
        return null;
      }

      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }

      return res.json();
    },
    enabled: !!authData?.user?.id && accounts.length > 0,
    refetchInterval: SESSION_STATUS_POLL_MS,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: runtimeOverviewData } = useQuery<AccountsRuntimeOverviewResponse | null>({
    queryKey: authData?.user?.id ? ['/api/runtime/accounts-overview', authData.user.id] : ['/api/runtime/accounts-overview', 'anonymous'],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, {
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 404) {
        return null;
      }

      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }

      return res.json();
    },
    enabled: !!authData?.user?.id && accounts.length > 0,
    refetchInterval: LIVE_QUERY_POLL_MS,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const tradeCopyStatus = tradeCopyStatusData?.data;
  const connectedAccounts = accounts.filter((account) => account.isConnected);
  const activeSessionMasterAccountId = tradeCopyStatus?.masterAccountId ?? sessionMasterAccountId;
  const positionSnapshotData: PositionSnapshotResponse | null = runtimeOverviewData?.positionSnapshot ?? null;
  const accountLiveMetricsById = buildAccountLiveMetricsById(positionSnapshotData?.accounts ?? []);
  const accountBalanceMetricsById = buildAccountBalanceMetricsById(runtimeOverviewData?.accountLiveMetrics.accounts ?? []);

  useEffect(() => {
    if (tradeCopyStatus?.masterAccountId) {
      setSessionMasterAccountId(tradeCopyStatus.masterAccountId);
      return;
    }

    if (connectedAccounts.length === 0) {
      setSessionMasterAccountId(null);
      return;
    }

    if (
      sessionMasterAccountId &&
      connectedAccounts.some((account) => account.id === sessionMasterAccountId)
    ) {
      return;
    }

    setSessionMasterAccountId(connectedAccounts[0]?.id ?? null);
  }, [connectedAccounts, sessionMasterAccountId, tradeCopyStatus?.masterAccountId]);

  const addAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await apiRequest('POST', '/api/accounts', accountData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
    },
  });

  const handleAddAccount = async (newAccount: AccountCreatePayload) => {
    try {
      await addAccountMutation.mutateAsync(newAccount);

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
      throw error;
    }
  };

  const connectAccountMutation = useMutation({
    mutationFn: (accountId: string) => connectAccount(accountId),
    onSuccess: (_result, accountId) => {
      queryClient.setQueryData<{ success: boolean; accounts: Account[] } | undefined>(
        ['/api/accounts'],
        (current) => updateAccountConnectionInQueryData(current, accountId, true),
      );
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
    },
  });

  const disconnectAccountMutation = useMutation({
    mutationFn: (accountId: string) => disconnectAccount(accountId),
    onSuccess: (_result, accountId) => {
      queryClient.setQueryData<{ success: boolean; accounts: Account[] } | undefined>(
        ['/api/accounts'],
        (current) => updateAccountConnectionInQueryData(current, accountId, false),
      );
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
    },
  });

  const handleConnect = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);

    try {
      await connectAccountMutation.mutateAsync(accountId);
      toast({
        title: "Account Connected",
        description: `${account?.name} is now connected and will copy trades`,
      });
    } catch (error) {
      toast({
        title: "Failed to Connect Account",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectClick = (accountId: string, accountName: string) => {
    setDisconnectAlert({ open: true, accountId, accountName });
  };

  const handleDisconnectConfirm = async () => {
    const account = accounts.find(a => a.id === disconnectAlert.accountId);

    try {
      await disconnectAccountMutation.mutateAsync(disconnectAlert.accountId);
      toast({
        title: "Account Disconnected",
        description: `${account?.name} has been disconnected`,
        variant: "destructive",
      });
      setDisconnectAlert({ open: false, accountId: '', accountName: '' });
    } catch (error) {
      toast({
        title: "Failed to Disconnect Account",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
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

  const saveBrokerSettingsMutation = useMutation({
    mutationFn: async ({
      accountId,
      settings,
    }: {
      accountId: string;
      settings: {
        rithmicExchange: string;
        rithmicSystemName: string | null;
        rithmicEnvironment: 'test' | 'live';
      };
    }) => {
      const res = await fetch(`/api/accounts/${accountId}/broker-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || 'Failed to save broker settings');
      }

      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/accounts'] }),
  });

  const updateAccountTypeMutation = useMutation({
    mutationFn: async ({
      accountId,
      accountType,
    }: {
      accountId: string;
      accountType: 'master' | 'follower';
    }) => {
      const res = await fetch(`/api/accounts/${accountId}/account-type`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountType }),
        credentials: 'include',
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || 'Failed to update account type');
      }

      return body;
    },
    onSuccess: (result, variables) => {
      queryClient.setQueryData<{ success: boolean; accounts: Account[] } | undefined>(
        ['/api/accounts'],
        (current) => {
          if (!current?.accounts) {
            return current;
          }

          const updatedAccount = result?.account as Account | undefined;
          const nextAccounts = current.accounts.map((account) =>
            account.id === variables.accountId
              ? {
                  ...account,
                  accountType: updatedAccount?.accountType ?? variables.accountType,
                }
              : account,
          );

          return {
            ...current,
            accounts: nextAccounts,
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-copy/status'] });
    },
  });

  const startTradeCopyMutation = useMutation({
    mutationFn: async (payload: {
      userId: string;
      masterAccountId: string;
      followerAccountIds: string[];
      environment: 'demo' | 'live';
    }) => {
      const res = await fetch('/api/trade-copy/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || 'Failed to start copy session');
      }

      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-copy/status'] });
    },
  });

  const stopTradeCopyMutation = useMutation({
    mutationFn: async (payload: { userId: string }) => {
      const res = await fetch('/api/trade-copy/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message || 'Failed to stop copy session');
      }

      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trade-copy/status'] });
    },
  });

  const handleRiskSettingsSave = (accountId: string, settings: RiskSettings) => {
    saveRiskSettingsMutation.mutate({ accountId, settings });
    const account = accounts.find(a => a.id === accountId);
    toast({ title: "Risk Settings Saved", description: `Updated for ${account?.name}` });
  };

  const handleBrokerSettingsSave = async (
    accountId: string,
    settings: {
      rithmicExchange: string;
      rithmicSystemName: string | null;
      rithmicEnvironment: 'test' | 'live';
    },
  ) => {
    await saveBrokerSettingsMutation.mutateAsync({ accountId, settings });
    const account = accounts.find(a => a.id === accountId);
    toast({
      title: "Broker Settings Saved",
      description: `Updated for ${account?.name}`,
    });
  };

  const handleAccountTypeSwitch = async (account: Account) => {
    const nextAccountType = account.accountType === 'master' ? 'follower' : 'master';

    try {
      await updateAccountTypeMutation.mutateAsync({
        accountId: account.id,
        accountType: nextAccountType,
      });

      toast({
        title: 'Account role updated',
        description: `${account.name} is now a ${nextAccountType}.`,
      });
    } catch (error) {
      toast({
        title: 'Could not change account role',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
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

  const getAccountSessionStatus = (account: Account): {
    label?: string;
    tone: 'neutral' | 'ok' | 'warn';
  } => {
    if (!tradeCopyStatus) {
      if (account.isConnected && activeSessionMasterAccountId === account.id) {
        return {
          label: 'session master',
          tone: 'warn',
        };
      }

      return {
        label: account.isConnected ? 'link only' : undefined,
        tone: 'neutral',
      };
    }

    if (tradeCopyStatus.masterAccountId === account.id) {
      if (tradeCopyStatus.ready) {
        return { label: 'copy ready', tone: 'ok' };
      }

      if (tradeCopyStatus.masterConnected) {
        return { label: 'master linked', tone: 'warn' };
      }

      return {
        label: account.isConnected ? 'link only' : undefined,
        tone: 'neutral',
      };
    }

    const followerStatus = tradeCopyStatus.followers.find((follower) => follower.accountId === account.id);
    if (!followerStatus) {
      return {
        label: account.isConnected ? 'not in session' : undefined,
        tone: account.isConnected ? 'warn' : 'neutral',
      };
    }

    return followerStatus.connected
      ? { label: 'follower ready', tone: 'ok' }
      : { label: 'follower pending', tone: 'warn' };
  };
  const selectedMasterAccount = connectedAccounts.find(
    (account) => account.id === activeSessionMasterAccountId,
  ) ?? null;
  const connectedFollowers = connectedAccounts.filter(
    (account) => account.id !== activeSessionMasterAccountId,
  );
  const canAutoStartCopySession =
    !!authData?.user?.id &&
    !!selectedMasterAccount &&
    connectedFollowers.length > 0;

  const startCopySession = async () => {
    if (!authData?.user?.id) {
      toast({
        title: 'Sign in required',
        description: 'The app needs your signed-in user session before it can start copy trading.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedMasterAccount) {
      toast({
        title: 'Choose a session master first',
        description: 'Connect the account you want to lead, then mark it as the session master.',
        variant: 'destructive',
      });
      return;
    }

    if (connectedFollowers.length === 0) {
      toast({
        title: 'No follower ready yet',
        description: 'Connect at least one follower account before starting the copy session.',
        variant: 'destructive',
      });
      return;
    }

    const masterAccount = selectedMasterAccount;
    const environment: 'demo' | 'live' =
      masterAccount.tradovateEnvironment === 'live' || masterAccount.rithmicEnvironment === 'live'
        ? 'live'
        : 'demo';

    try {
      await startTradeCopyMutation.mutateAsync({
        userId: authData.user.id,
        masterAccountId: masterAccount.id,
        followerAccountIds: connectedFollowers.map((account) => account.id),
        environment,
      });

      toast({
        title: 'Copy session started',
        description: `${masterAccount.name} is now the active master for ${connectedFollowers.length} follower account(s).`,
      });
    } catch (error) {
      toast({
        title: 'Could not start copy session',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const stopCopySession = async () => {
    if (!authData?.user?.id) {
      return;
    }

    try {
      await stopTradeCopyMutation.mutateAsync({ userId: authData.user.id });
      toast({
        title: 'Copy session stopped',
        description: 'The active copy session has been stopped.',
      });
    } catch (error) {
      toast({
        title: 'Could not stop copy session',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const setSessionMaster = (accountId: string) => {
    setSessionMasterAccountId(accountId);
    const account = accounts.find((item) => item.id === accountId);
    toast({
      title: 'Session master selected',
      description: `${account?.name} will lead the next copy session.`,
    });
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

      <div className="panel-surface rounded-[1.4rem] p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Copy Session</p>
          <p className="text-xs text-muted-foreground mt-1">
            {tradeCopyStatus
              ? tradeCopyStatus.ready
                ? `Ready: ${tradeCopyStatus.connectedFollowerCount}/${tradeCopyStatus.followerCount} followers connected`
                : tradeCopyStatus.masterConnected
                  ? `Master linked. Followers ready: ${tradeCopyStatus.connectedFollowerCount}/${tradeCopyStatus.followerCount}`
                  : 'No active copy session yet'
              : 'No active copy session yet'}
          </p>
          {!tradeCopyStatus && !selectedMasterAccount && (
            <p className="text-xs text-amber-400 mt-1">
              Connect the account you want to lead, then use `Use For Session` on that card.
            </p>
          )}
          {!tradeCopyStatus && selectedMasterAccount && connectedFollowers.length === 0 && (
            <p className="text-xs text-amber-400 mt-1">
              Connect at least one other account to follow the selected session master.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              tradeCopyStatus?.ready
                ? 'border-emerald-400/30 text-emerald-400'
                : tradeCopyStatus?.masterConnected
                  ? 'border-amber-400/30 text-amber-400'
                  : 'text-muted-foreground'
            }
          >
            {tradeCopyStatus?.ready ? 'Ready' : tradeCopyStatus?.masterConnected ? 'Partial' : 'Standby'}
          </Badge>
          {tradeCopyStatus ? (
            <Button
              variant="outline"
              size="sm"
              onClick={stopCopySession}
              disabled={stopTradeCopyMutation.isPending}
              data-testid="button-stop-copy-session"
            >
              Stop Session
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={startCopySession}
              disabled={!canAutoStartCopySession || startTradeCopyMutation.isPending}
              data-testid="button-start-copy-session"
            >
              Start Session
            </Button>
          )}
        </div>
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
                const sessionStatus = getAccountSessionStatus(account);
                const liveMetrics = accountLiveMetricsById[account.id];
                const liveBalanceMetrics = accountBalanceMetricsById[account.id];
                const hasLivePositionData = liveMetrics?.hasLiveBrokerData ?? false;
                const hasLiveBalance = liveBalanceMetrics?.hasLiveBrokerData ?? false;
                const hasLiveBrokerData = hasLivePositionData || hasLiveBalance;
                const pnl = hasLivePositionData
                  ? liveMetrics.unrealizedPnl
                  : (account.pnl ? parseFloat(account.pnl) : 0);
                const openPositions = hasLivePositionData
                  ? liveMetrics.openPositions
                  : (account.openPositions || 0);
                const balance = hasLiveBalance
                  ? (liveBalanceMetrics?.balance ?? 0)
                  : (account.balance ? parseFloat(account.balance) : 0);
                const liveBrokerStatus = liveMetrics?.status !== "NONE"
                  ? liveMetrics.status
                  : liveBalanceMetrics?.status ?? "NONE";
                const liveBrokerReason = liveMetrics?.reason ?? liveBalanceMetrics?.reason;
                return (
                  <AccountCard
                    key={account.id}
                    id={account.id}
                    name={account.name}
                    platform={account.platform}
                    accountType={account.accountType as 'master' | 'follower'}
                    isConnected={account.isConnected || false}
                    sessionStatusLabel={sessionStatus.label}
                    sessionStatusTone={sessionStatus.tone}
                    hasLiveBrokerData={hasLiveBrokerData}
                    liveBrokerStatus={liveBrokerStatus}
                    liveBrokerReason={liveBrokerReason}
                    balance={balance}
                    openPositions={openPositions}
                    pnl={pnl}
                    positionScaling={effectiveAccount.positionScaling || undefined}
                    maxContracts={effectiveAccount.maxContracts || undefined}
                    blockedTickers={effectiveAccount.blockedTickers || []}
                    riskMode={(account.riskMode as 'global' | 'custom') || undefined}
                    onConnect={() => handleConnect(account.id)}
                    onDisconnect={() => handleDisconnectClick(account.id, account.name)}
                    configureButton={
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setSessionMaster(account.id)}
                          disabled={!account.isConnected || activeSessionMasterAccountId === account.id}
                          data-testid={`button-set-session-master-${account.id}`}
                        >
                          {activeSessionMasterAccountId === account.id ? 'Session Master' : 'Use For Session'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleAccountTypeSwitch(account)}
                          disabled={account.isConnected || updateAccountTypeMutation.isPending}
                          data-testid={`button-switch-role-${account.id}`}
                        >
                          {account.accountType === 'master' ? 'Make Follower' : 'Make Master'}
                        </Button>
                        {account.platform === 'Rithmic' && (
                          <BrokerSettingsDialog
                            accountId={account.id}
                            accountName={account.name}
                            platform={account.platform}
                            rithmicExchange={account.rithmicExchange}
                            rithmicSystemName={account.rithmicSystemName}
                            rithmicEnvironment={account.rithmicEnvironment}
                            onSave={(settings) => handleBrokerSettingsSave(account.id, settings)}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              data-testid={`button-broker-settings-${account.id}`}
                            >
                              <Settings className="mr-2 h-3 w-3" />
                              Broker Settings
                            </Button>
                          </BrokerSettingsDialog>
                        )}
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
                      </div>
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
                const savedBalance = account.balance ? parseFloat(account.balance) : 0;
                const liveMetrics = accountLiveMetricsById[account.id];
                const liveBalanceMetrics = accountBalanceMetricsById[account.id];
                const hasLivePositionData = liveMetrics?.hasLiveBrokerData ?? false;
                const hasLiveBalance = liveBalanceMetrics?.hasLiveBrokerData ?? false;
                const liveBrokerData = hasLivePositionData || hasLiveBalance;
                const balance = hasLiveBalance
                  ? (liveBalanceMetrics?.balance ?? savedBalance)
                  : savedBalance;
                const pnl = hasLivePositionData
                  ? liveMetrics.unrealizedPnl
                  : (account.pnl ? parseFloat(account.pnl) : 0);
                const openPositions = hasLivePositionData
                  ? liveMetrics.openPositions
                  : (account.openPositions || 0);
                
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
                          {account.isConnected && !liveBrokerData && (
                            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                              {liveMetrics?.status === 'UNAVAILABLE' || liveBalanceMetrics?.status === 'UNAVAILABLE' ? 'Snapshot pending' : 'Link verified'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{liveBrokerData ? 'Balance' : 'Saved Balance'}</div>
                        <div className="font-semibold tabular-nums">${balance.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{liveBrokerData ? 'P&L' : 'Saved P&L'}</div>
                        <div className={`font-semibold tabular-nums ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${pnl >= 0 ? '+' : ''}{pnl.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{liveBrokerData ? 'Positions' : 'Saved Positions'}</div>
                        <div className="font-semibold tabular-nums">{openPositions}</div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSessionMaster(account.id)}
                          disabled={!account.isConnected || activeSessionMasterAccountId === account.id}
                          data-testid={`button-set-session-master-${account.id}`}
                          title="Use this connected account as the active session master"
                        >
                          {activeSessionMasterAccountId === account.id ? 'Session Master' : 'Use For Session'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAccountTypeSwitch(account)}
                          disabled={account.isConnected || updateAccountTypeMutation.isPending}
                          data-testid={`button-switch-role-${account.id}`}
                        >
                          {account.accountType === 'master' ? 'Make Follower' : 'Make Master'}
                        </Button>
                        {account.platform === 'Rithmic' && (
                          <BrokerSettingsDialog
                            accountId={account.id}
                            accountName={account.name}
                            platform={account.platform}
                            rithmicExchange={account.rithmicExchange}
                            rithmicSystemName={account.rithmicSystemName}
                            rithmicEnvironment={account.rithmicEnvironment}
                            onSave={(settings) => handleBrokerSettingsSave(account.id, settings)}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`button-broker-settings-${account.id}`}
                              title="Saved Rithmic exchange and system name"
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </BrokerSettingsDialog>
                        )}
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
                      const savedBalance = account.balance ? parseFloat(account.balance) : 0;
                      const liveMetrics = accountLiveMetricsById[account.id];
                      const liveBalanceMetrics = accountBalanceMetricsById[account.id];
                      const hasLivePositionData = liveMetrics?.hasLiveBrokerData ?? false;
                      const hasLiveBalance = liveBalanceMetrics?.hasLiveBrokerData ?? false;
                      const liveBrokerData = hasLivePositionData || hasLiveBalance;
                      const balance = hasLiveBalance
                        ? (liveBalanceMetrics?.balance ?? savedBalance)
                        : savedBalance;
                      const pnl = hasLivePositionData
                        ? liveMetrics.unrealizedPnl
                        : (account.pnl ? parseFloat(account.pnl) : 0);
                      const openPositions = hasLivePositionData
                        ? liveMetrics.openPositions
                        : (account.openPositions || 0);

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
                              {account.isConnected && !liveBrokerData && (
                                <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                                  {liveMetrics?.status === 'UNAVAILABLE' || liveBalanceMetrics?.status === 'UNAVAILABLE' ? 'Snapshot pending' : 'Link verified'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right font-semibold tabular-nums" title={liveBrokerData ? 'Live broker value' : 'Saved placeholder value'}>${balance.toLocaleString()}</td>
                          <td className={`p-3 text-right font-semibold tabular-nums ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${pnl >= 0 ? '+' : ''}{pnl.toLocaleString()}
                          </td>
                          <td className="p-3 text-right tabular-nums">{openPositions}</td>
                          {accounts.some(a => a.accountType === 'follower') && (
                            <td className="p-3 text-right tabular-nums">
                              {account.accountType === 'follower' ? `${effectiveAccount.positionScaling}%` : '-'}
                            </td>
                          )}
                          <td className="p-3">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSessionMaster(account.id)}
                                disabled={!account.isConnected || activeSessionMasterAccountId === account.id}
                                data-testid={`button-set-session-master-${account.id}`}
                              >
                                {activeSessionMasterAccountId === account.id ? 'Session Master' : 'Use For Session'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAccountTypeSwitch(account)}
                                disabled={account.isConnected || updateAccountTypeMutation.isPending}
                                data-testid={`button-switch-role-${account.id}`}
                              >
                                {account.accountType === 'master' ? 'Make Follower' : 'Make Master'}
                              </Button>
                              {account.platform === 'Rithmic' && (
                                <BrokerSettingsDialog
                                  accountId={account.id}
                                  accountName={account.name}
                                  platform={account.platform}
                                  rithmicExchange={account.rithmicExchange}
                                  rithmicSystemName={account.rithmicSystemName}
                                  rithmicEnvironment={account.rithmicEnvironment}
                                  onSave={(settings) => handleBrokerSettingsSave(account.id, settings)}
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    data-testid={`button-broker-settings-${account.id}`}
                                    title="Saved Rithmic exchange and system name"
                                  >
                                    <Settings className="h-3 w-3" />
                                  </Button>
                                </BrokerSettingsDialog>
                              )}
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
