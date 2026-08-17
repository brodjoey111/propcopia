import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountCard } from "@/components/account-card";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { BrokerSettingsDialog } from "@/components/broker-settings-dialog";
import { RiskSettingsDialog, type RiskSettings } from "@/components/risk-settings-dialog";
import { DisconnectAccountAlert } from "@/components/disconnect-account-alert";
import { EmptyState } from "@/components/empty-state";
import { AccountGroupsView } from "@/components/account-groups";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAccountsPositionSyncReview } from "@/hooks/use-accounts-position-sync-review";
import { useAccountsPagePreferences } from "@/hooks/use-accounts-page-preferences";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import type { AccountCreatePayload } from "@/lib/account-create-payload";
import {
  connectAccount,
  disconnectAccount,
  revalidateRithmicReadiness,
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
  buildAccountRiskById,
  toAccountRiskBadgeView,
} from "@/lib/account-risk";
import {
  buildPositionSyncReview,
  describePositionSyncSimulationGuidance,
  describePositionSyncOverview,
  sortPositionSyncGroups,
  summarizePositionSyncRepairOpportunities,
} from "@/lib/position-sync";
import {
  buildPositionSyncWorkflowKey,
  toPositionSyncWorkflowState,
  type PositionSyncWorkflowSaveInput,
} from "@/lib/position-sync-workflow";
import {
  buildCopySessionActionState,
} from "@/lib/copy-session-actions";
import {
  getAccountSessionStatusView,
} from "@/lib/account-session-status";
import {
  summarizeCopySession,
} from "@/lib/copy-session-summary";
import {
  prepareAccountRuntimeViewModels,
} from "@/lib/account-runtime-view";
import { buildLicenseSummary } from "@/lib/license-summary";
import {
  buildRithmicReadinessViewItems,
  getRithmicAccounts,
  getRithmicReadinessBannerLabel,
  getRithmicReadinessBannerToneClass,
  summarizeRithmicReadiness,
  type RithmicReadinessListResponse,
} from "@/lib/rithmic-readiness";
import {
  LIVE_QUERY_POLL_MS,
  LIVE_QUERY_STALE_MS,
  PASSIVE_QUERY_POLL_MS,
  SESSION_STATUS_POLL_MS,
} from "@/lib/live-query-config";
import type { AccountsRuntimeOverviewResponse } from "@/lib/runtime-overview";
import { ShieldAlert, Loader2, LayoutGrid, List, Table2, Settings, Globe, Layers } from "lucide-react";
import type { Account } from "@shared/schema";
import type { LicenseSnapshot } from "@shared/billing";

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
      health: "ready" | "reconnecting" | "unavailable";
    }>;
  };
}

interface BillingStatusResponse {
  success: boolean;
  license: LicenseSnapshot;
}

type HttpError = Error & {
  status?: number;
};

export default function Accounts() {
  const { toast } = useToast();
  const [addGroupTrigger, setAddGroupTrigger] = useState(0);
  const [disconnectAlert, setDisconnectAlert] = useState<{
    open: boolean;
    accountId: string;
    accountName: string;
  }>({ open: false, accountId: '', accountName: '' });

  const { data: accountsData, isLoading } = useQuery<{ success: boolean; accounts: Account[] }>({
    queryKey: ['/api/accounts'],
  });
  const accounts = accountsData?.accounts || [];
  const rithmicAccounts = getRithmicAccounts(accounts);
  const hasConnectedAccounts = accounts.some((account) => account.isConnected);
  const { data: authData } = useQuery<AuthMeResponse | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
  });
  const { data: billingStatusData } = useQuery<BillingStatusResponse>({
    queryKey: ['/api/billing/status'],
    enabled: !!authData?.user?.id,
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
    enabled: !!authData?.user?.id && hasConnectedAccounts,
    refetchInterval: hasConnectedAccounts ? SESSION_STATUS_POLL_MS : false,
    refetchIntervalInBackground: false,
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
    enabled: !!authData?.user?.id && hasConnectedAccounts,
    refetchInterval: hasConnectedAccounts ? LIVE_QUERY_POLL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: positionSyncWorkflowData } = useQuery<{
    success: boolean;
    reviews: PositionSyncWorkflowSaveInput[];
  } | null>({
    queryKey: authData?.user?.id ? ['/api/position-sync/reviews', authData.user.id] : ['/api/position-sync/reviews', 'anonymous'],
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
    enabled: !!authData?.user?.id && hasConnectedAccounts,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const { data: rithmicReadinessData } = useQuery<RithmicReadinessListResponse | null>({
    queryKey: authData?.user?.id
      ? ['/api/accounts/rithmic-readiness', authData.user.id, rithmicAccounts.map((account) => account.id).join(',')]
      : ['/api/accounts/rithmic-readiness', 'anonymous'],
    queryFn: async () => {
      const res = await fetch('/api/accounts/rithmic-readiness', { credentials: 'include' });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json() as Promise<RithmicReadinessListResponse>;
    },
    enabled: !!authData?.user?.id && rithmicAccounts.length > 0,
    refetchInterval: PASSIVE_QUERY_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: LIVE_QUERY_STALE_MS,
  });
  const tradeCopyStatus = tradeCopyStatusData?.data;
  const connectedAccounts = accounts.filter((account) => account.isConnected);
  const {
    viewMode,
    setViewMode,
    setSessionMasterAccountId,
    activeSessionMasterAccountId,
    globalSettings,
    globalSettingsServerSynced,
    saveGlobalSettings,
  } = useAccountsPagePreferences({
    connectedAccountIds: connectedAccounts.map((account) => account.id),
    serverMasterAccountId: tradeCopyStatus?.masterAccountId,
  });
  const positionSnapshotData: PositionSnapshotResponse | null = runtimeOverviewData?.positionSnapshot ?? null;
  const accountLiveMetricsById = buildAccountLiveMetricsById(positionSnapshotData?.accounts ?? []);
  const accountBalanceMetricsById = buildAccountBalanceMetricsById(runtimeOverviewData?.accountLiveMetrics.accounts ?? []);
  const accountRiskOverview = runtimeOverviewData?.accountRiskOverview;
  const accountRiskById = buildAccountRiskById(accountRiskOverview?.accounts ?? []);
  const positionSyncOverview = runtimeOverviewData?.positionSyncOverview ?? null;
  const rithmicReadinessItems = rithmicReadinessData?.accounts.map((response) => response.readiness) ?? [];
  const rithmicReadinessSummary = summarizeRithmicReadiness(rithmicReadinessItems);
  const rithmicReadinessViewItems = buildRithmicReadinessViewItems(rithmicReadinessItems);
  const positionSyncWorkflowState = positionSyncWorkflowData?.reviews
    ? toPositionSyncWorkflowState(positionSyncWorkflowData.reviews)
    : {};
  const refreshAccountsQuery = () => queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
  const refreshTradeCopyStatusQuery = () => queryClient.invalidateQueries({ queryKey: ['/api/trade-copy/status'] });
  const refreshAccountsRuntimeOverviewQuery = () =>
    queryClient.invalidateQueries({ queryKey: ['/api/runtime/accounts-overview'] });
  const refreshRithmicReadinessQuery = () =>
    queryClient.invalidateQueries({ queryKey: ['/api/accounts/rithmic-readiness'] });
  const refreshAccountSessionData = () => {
    refreshAccountsQuery();
    refreshTradeCopyStatusQuery();
    refreshAccountsRuntimeOverviewQuery();
    refreshRithmicReadinessQuery();
  };

  const addAccountMutation = useMutation({
    mutationFn: async (accountData: any) => {
      const response = await apiRequest('POST', '/api/accounts', accountData);
      return response.json();
    },
    onSuccess: refreshAccountsQuery,
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
      refreshAccountSessionData();
    },
  });

  const disconnectAccountMutation = useMutation({
    mutationFn: (accountId: string) => disconnectAccount(accountId),
    onSuccess: (_result, accountId) => {
      queryClient.setQueryData<{ success: boolean; accounts: Account[] } | undefined>(
        ['/api/accounts'],
        (current) => updateAccountConnectionInQueryData(current, accountId, false),
      );
      refreshAccountSessionData();
    },
  });
  const revalidateRithmicReadinessMutation = useMutation({
    mutationFn: (accountId: string) => revalidateRithmicReadiness(accountId),
    onSuccess: () => {
      refreshAccountSessionData();
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

    if (accountControlsDisabled) {
      toast({
        title: 'Please wait a moment',
        description: 'Finish the current session or account update before disconnecting another account.',
        variant: 'destructive',
      });
      return;
    }

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
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.message ?? 'Failed to save risk settings');
      }
      return payload;
    },
    onSuccess: (_data, variables) => {
      refreshAccountsQuery();
      const account = accounts.find((item) => item.id === variables.accountId);
      toast({
        title: "Risk Settings Saved",
        description: `Updated for ${account?.name ?? "account"}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Risk Settings Not Saved",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const saveGlobalRiskSettingsMutation = useMutation({
    mutationFn: async (settings: RiskSettings) => {
      const res = await fetch('/api/risk-settings/global', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include',
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.message ?? 'Failed to save global risk settings');
      }
      return payload as {
        settings: RiskSettings;
        updatedAccountCount: number;
      };
    },
    onSuccess: (payload) => {
      saveGlobalSettings(payload.settings);
      refreshAccountsQuery();
      refreshAccountsRuntimeOverviewQuery();
      toast({
        title: "Global Risk Defaults Saved",
        description: `Updated ${payload.updatedAccountCount} account${payload.updatedAccountCount === 1 ? "" : "s"} using Global mode.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Global Risk Defaults Not Saved",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
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
    onSuccess: refreshAccountsQuery,
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
      refreshAccountsQuery();
      refreshTradeCopyStatusQuery();
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
        const error = new Error(body?.message || 'Failed to start copy session') as HttpError;
        error.status = res.status;
        throw error;
      }

      return body;
    },
    onSuccess: () => {
      refreshAccountsQuery();
      refreshTradeCopyStatusQuery();
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
      refreshAccountsQuery();
      refreshTradeCopyStatusQuery();
    },
  });

  const recoverUnavailableFollowersMutation = useMutation({
    mutationFn: async (accountIds: string[]) => {
      const results = await Promise.allSettled(
        accountIds.map(async (accountId) => {
          await connectAccount(accountId);
          return accountId;
        }),
      );

      const recoveredIds: string[] = [];
      const failedResults: Array<{ accountId: string; message: string | null }> = [];

      results.forEach((result, index) => {
        const accountId = accountIds[index];
        if (result.status === 'fulfilled') {
          recoveredIds.push(accountId);
          return;
        }

        failedResults.push({
          accountId,
          message:
            result.reason instanceof Error
              ? result.reason.message
              : result.reason
                ? String(result.reason)
                : null,
        });
      });

      return {
        recoveredIds,
        failedCount: failedResults.length,
        failedResults,
      };
    },
    onSuccess: () => {
      refreshAccountsQuery();
      refreshTradeCopyStatusQuery();
    },
  });

  const handleRiskSettingsSave = (accountId: string, settings: RiskSettings) => {
    saveRiskSettingsMutation.mutate({ accountId, settings });
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
    saveGlobalRiskSettingsMutation.mutate(settings);
  };

  const getEffectiveSettings = (account: any) => {
    if (account.riskMode === 'global') {
      return { ...account, ...globalSettings };
    }
    return account;
  };

  const getAccountSessionStatus = (account: Account) =>
    getAccountSessionStatusView({
      accountId: account.id,
      isConnected: account.isConnected || false,
      activeSessionMasterAccountId,
      tradeCopyStatus,
    });
  const selectedMasterAccount = connectedAccounts.find(
    (account) => account.id === activeSessionMasterAccountId,
  ) ?? null;
  const connectedFollowers = connectedAccounts.filter(
    (account) => account.id !== activeSessionMasterAccountId,
  );
  const followerNamesById = Object.fromEntries(
    accounts.map((account) => [account.id, account.name] as const),
  );
  const copySessionSummary = summarizeCopySession({
    tradeCopyStatus,
    selectedMasterAccountName: selectedMasterAccount?.name ?? null,
    connectedFollowerCount: connectedFollowers.length,
    followerNamesById,
  });
  const unavailableFollowerIds = copySessionSummary.followerHealthRows
    .filter((follower) => follower.health === 'unavailable')
    .map((follower) => follower.accountId);
  const canAutoStartCopySession =
    !!authData?.user?.id &&
    !!selectedMasterAccount &&
    connectedFollowers.length > 0;
  const sessionActionPending =
    startTradeCopyMutation.isPending ||
    stopTradeCopyMutation.isPending ||
    recoverUnavailableFollowersMutation.isPending;
  const sessionActionState = buildCopySessionActionState({
    hasActiveSession: !!tradeCopyStatus,
    canStartSession: canAutoStartCopySession,
    sessionActionPending,
    isStarting: startTradeCopyMutation.isPending,
    isStopping: stopTradeCopyMutation.isPending,
    isRecovering: recoverUnavailableFollowersMutation.isPending,
    summary: copySessionSummary,
  });
  const accountActionPending =
    connectAccountMutation.isPending ||
    disconnectAccountMutation.isPending;
  const accountControlsDisabled =
    sessionActionPending ||
    accountActionPending;
  const connectingAccountId =
    connectAccountMutation.isPending && typeof connectAccountMutation.variables === 'string'
      ? connectAccountMutation.variables
      : null;
  const disconnectingAccountId =
    disconnectAccountMutation.isPending && typeof disconnectAccountMutation.variables === 'string'
      ? disconnectAccountMutation.variables
      : null;
  const getConnectButtonLabel = (accountId: string) =>
    connectingAccountId === accountId ? 'Connecting...' : 'Connect';
  const getDisconnectButtonLabel = (accountId: string) =>
    disconnectingAccountId === accountId ? 'Disconnecting...' : 'Disconnect';

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
        description: `${masterAccount.name} is leading ${connectedFollowers.length} follower account${connectedFollowers.length === 1 ? '' : 's'} now.`,
      });
    } catch (error) {
      const startError = error as HttpError;
      if (startError.status === 409) {
        refreshTradeCopyStatusQuery();
        toast({
          title: 'Copy session already running',
          description: 'Stop the current session first, then start the new session lineup.',
          variant: 'destructive',
        });
        return;
      }

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
        description: 'Trade copying has stopped for the current session.',
      });
    } catch (error) {
      toast({
        title: 'Could not stop copy session',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const recoverUnavailableFollowers = async () => {
    if (unavailableFollowerIds.length === 0) {
      return;
    }

    try {
      const result = await recoverUnavailableFollowersMutation.mutateAsync(unavailableFollowerIds);
      const recoveredNames = result.recoveredIds
        .map((accountId) => accounts.find((account) => account.id === accountId)?.name)
        .filter((name): name is string => Boolean(name));
      const failedNames = result.failedResults
        .map((item) => accounts.find((account) => account.id === item.accountId)?.name)
        .filter((name): name is string => Boolean(name));

      if (result.failedCount === 0) {
        toast({
          title: 'Followers recovering',
          description:
            recoveredNames.length > 0
              ? `Reconnect started for ${recoveredNames.join(', ')}.`
              : `Reconnect started for ${result.recoveredIds.length} unavailable follower${result.recoveredIds.length === 1 ? '' : 's'}.`,
        });
        return;
      }

      toast({
        title: 'Some followers still need attention',
        description:
          result.recoveredIds.length > 0
            ? `${recoveredNames.join(', ')} started reconnecting, but ${failedNames.join(', ')} still need attention.${result.failedResults[0]?.message ? ` ${result.failedResults[0].message}` : ''}`.trim()
            : failedNames.length > 0
              ? `${failedNames.join(', ')} still need manual attention.${result.failedResults[0]?.message ? ` ${result.failedResults[0].message}` : ''}`.trim()
              : 'Unable to recover unavailable followers.',
        variant: 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Could not recover followers',
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
      description: `${account?.name} will lead the next session.`,
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
  const accountRuntimeViewModels = prepareAccountRuntimeViewModels({
    accounts,
    positionMetricsById: accountLiveMetricsById,
    balanceMetricsById: accountBalanceMetricsById,
    getSessionStatus: getAccountSessionStatus,
  });
  const hasFollowerAccounts = accountRuntimeViewModels.some(
    ({ account }) => account.accountType === 'follower',
  );
  const breachedRiskCount = accountRiskOverview?.summary.breachedAccounts ?? 0;
  const warningRiskCount = accountRiskOverview?.summary.warningAccounts ?? 0;
  const safeRiskCount = accountRiskOverview?.summary.safeAccounts ?? 0;
  const pendingRiskCount = accountRiskOverview?.summary.unavailableAccounts ?? 0;
  const licenseSummary = billingStatusData?.license
    ? buildLicenseSummary(billingStatusData.license, {
        masterAccounts: accounts.filter((account) => account.accountType === 'master').length,
        followerAccounts: accounts.filter((account) => account.accountType === 'follower').length,
      })
    : null;
  const positionSyncPulse = describePositionSyncOverview(positionSyncOverview);
  const positionSyncRepairSummary = summarizePositionSyncRepairOpportunities(positionSyncOverview);
  const topPositionSyncGroups = sortPositionSyncGroups(positionSyncOverview?.groups ?? []).slice(0, 3);
  const positionSyncReviewGroups = buildPositionSyncReview(positionSyncOverview?.groups ?? []).slice(0, 2);
  const {
    positionSyncReviewNotes,
    setPositionSyncReviewNotes,
    positionSyncAssignmentReasons,
    setPositionSyncAssignmentReasons,
    savePositionSyncWorkflowMutation,
    handleApprovePositionSyncEntry,
    handleTakePositionSyncOwnership,
    handleHandOffPositionSyncEntry,
    handleCompletePositionSyncEntry,
  } = useAccountsPositionSyncReview({
    userId: authData?.user?.id,
    username: authData?.user?.username,
    positionSyncWorkflowState,
    onWorkflowSaved: refreshAccountsRuntimeOverviewQuery,
    onWorkflowSaveSuccess: (count) => {
      toast({
        title: 'Sync Workflow Updated',
        description: `${count} position sync item${count === 1 ? '' : 's'} saved to the shared operator workflow.`,
      });
    },
  });
  const renderSessionMasterButton = (
    account: Account,
    options?: {
      className?: string;
      title?: string;
    },
  ) => (
    <Button
      variant="outline"
      size="sm"
      className={options?.className}
      onClick={() => setSessionMaster(account.id)}
      disabled={!account.isConnected || activeSessionMasterAccountId === account.id || sessionActionPending}
      data-testid={`button-set-session-master-${account.id}`}
      title={options?.title}
    >
      {activeSessionMasterAccountId === account.id ? 'Session Master' : 'Set as Session Master'}
    </Button>
  );
  const renderAccountTypeButton = (
    account: Account,
    options?: {
      className?: string;
    },
  ) => (
    <Button
      variant="outline"
      size="sm"
      className={options?.className}
      onClick={() => handleAccountTypeSwitch(account)}
      disabled={account.isConnected || updateAccountTypeMutation.isPending}
      data-testid={`button-switch-role-${account.id}`}
    >
      {account.accountType === 'master' ? 'Make Follower' : 'Make Master'}
    </Button>
  );
  const renderBrokerSettingsButton = (
    account: Account,
    options?: {
      className?: string;
      iconOnly?: boolean;
      title?: string;
    },
  ) => {
    if (account.platform !== 'Rithmic') {
      return null;
    }

    return (
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
          className={options?.className}
          data-testid={`button-broker-settings-${account.id}`}
          title={options?.title}
        >
          <Settings className={options?.iconOnly ? 'h-3 w-3' : 'mr-2 h-3 w-3'} />
          {!options?.iconOnly ? 'Broker Settings' : null}
        </Button>
      </BrokerSettingsDialog>
    );
  };
  const renderRiskSettingsButton = (
    account: Account,
    options?: {
      className?: string;
      iconOnly?: boolean;
      title?: string;
    },
  ) => (
    <RiskSettingsDialog
      name={account.name}
      kind="account"
      settings={accountToRiskSettings(account)}
      globalSettings={globalSettings}
      onSave={(settings) => handleRiskSettingsSave(account.id, settings)}
    >
      <Button
        variant="outline"
        size="sm"
        className={options?.className}
        data-testid={`button-configure-${account.id}`}
        title={options?.title}
      >
        <ShieldAlert className={options?.iconOnly ? 'h-3 w-3' : 'mr-2 h-3 w-3'} />
        {!options?.iconOnly ? 'Risk Settings' : null}
        {account.riskMode === 'global'
          ? <Globe className={options?.iconOnly ? 'ml-1 h-3 w-3 text-muted-foreground' : 'ml-1.5 h-3 w-3 text-muted-foreground'} />
          : countActiveLimits(accountToRiskSettings(account)) > 0
            ? <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
            : null}
      </Button>
    </RiskSettingsDialog>
  );
  const renderAccountConnectionButton = (account: Account) =>
    account.isConnected ? (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDisconnectClick(account.id, account.name)}
        disabled={accountControlsDisabled}
        data-testid={`button-disconnect-${account.id}`}
      >
        {getDisconnectButtonLabel(account.id)}
      </Button>
    ) : (
      <Button
        variant="default"
        size="sm"
        onClick={() => handleConnect(account.id)}
        disabled={accountControlsDisabled}
        data-testid={`button-connect-${account.id}`}
      >
        {getConnectButtonLabel(account.id)}
      </Button>
    );
  const renderCompactAccountActions = (account: Account) => (
    <>
      {renderSessionMasterButton(account, {
        title: 'Use this connected account as the active session master',
      })}
      {renderAccountTypeButton(account)}
      {renderBrokerSettingsButton(account, {
        iconOnly: true,
        title: 'Saved Rithmic exchange and system name',
      })}
      {renderRiskSettingsButton(account, {
        iconOnly: true,
        title: account.riskMode === 'global' ? 'Using global defaults' : 'Custom risk settings',
      })}
      {renderAccountConnectionButton(account)}
    </>
  );
  const renderAccountIdentityBadges = (account: Account) => (
    <>
      <Badge variant={account.accountType === 'master' ? 'default' : 'secondary'} className="text-xs">
        {account.accountType}
      </Badge>
      <Badge variant="outline" className="text-xs">
        {account.platform}
      </Badge>
      {(() => {
        const riskBadge = toAccountRiskBadgeView(accountRiskById[account.id]);
        const className =
          riskBadge.tone === 'ok'
            ? 'border-emerald-400/20 text-emerald-300'
            : riskBadge.tone === 'warn'
              ? 'border-amber-400/20 text-amber-300'
              : riskBadge.tone === 'danger'
                ? 'border-red-400/20 text-red-300'
                : 'text-muted-foreground';

        return (
          <Badge variant="outline" className={`text-xs ${className}`}>
            {riskBadge.label}
          </Badge>
        );
      })()}
    </>
  );
  const renderAccountConnectionStatus = (
    account: Account,
    viewModel: (typeof accountRuntimeViewModels)[number],
    options?: {
      textClassName?: string;
    },
  ) => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className={`h-2 w-2 rounded-full ${account.isConnected ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]' : 'bg-muted-foreground'}`} />
      <span className={options?.textClassName}>{account.isConnected ? 'Connected' : 'Not connected'}</span>
      {account.isConnected && !viewModel.hasLiveBrokerData && (
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
          {viewModel.liveBrokerStatus === 'UNAVAILABLE' ? 'Snapshot pending' : 'Link verified'}
        </span>
      )}
    </div>
  );
  const renderAccountValueBlock = (
    label: string,
    value: string | number,
    options?: {
      className?: string;
    },
  ) => (
    <div className={options?.className}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
  const renderAccountPnlValueBlock = (
    label: string,
    pnl: number,
  ) => (
    <div className="text-right">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold tabular-nums ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        ${pnl >= 0 ? '+' : ''}{pnl.toLocaleString()}
      </div>
    </div>
  );
  const renderFollowerScalingValue = (account: Account, effectiveAccount: Account) =>
    account.accountType === 'follower' ? `${effectiveAccount.positionScaling}%` : '-';

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

      {licenseSummary ? (
        <div
          className={`rounded-[1.2rem] border px-4 py-3 ${
            licenseSummary.tone === 'danger'
              ? 'border-red-500/30 bg-red-500/10'
              : licenseSummary.tone === 'warn'
                ? 'border-amber-500/30 bg-amber-500/10'
                : 'border-white/10 bg-white/[0.03]'
          }`}
          data-testid="account-license-summary"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold">{licenseSummary.title}</p>
            <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-[0.18em]">
              License
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{licenseSummary.detail}</p>
        </div>
      ) : null}

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
          {globalSettingsServerSynced === false ? (
            <p className="mt-2 text-xs font-medium text-amber-300">
              Review and save these defaults once to synchronize them with the server.
            </p>
          ) : null}
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="panel-surface rounded-[1.2rem] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Risk Safe</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{safeRiskCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Accounts currently within configured limits.</p>
        </div>
        <div className="panel-surface rounded-[1.2rem] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Warnings</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{warningRiskCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Accounts approaching at least one risk threshold.</p>
        </div>
        <div className="panel-surface rounded-[1.2rem] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Breaches</p>
          <p className="mt-2 text-2xl font-semibold text-red-300">{breachedRiskCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Accounts already beyond configured limits.</p>
        </div>
        <div className="panel-surface rounded-[1.2rem] p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-200">{pendingRiskCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Accounts still waiting on enough runtime data.</p>
        </div>
      </div>

      <div className="panel-surface rounded-[1.4rem] p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Copy Session</p>
          <p className="text-xs text-muted-foreground mt-1">
            {copySessionSummary.headline}
          </p>
          <p
            className={`text-xs mt-1 ${
              copySessionSummary.tone === 'attention'
                ? 'text-red-400'
                : copySessionSummary.tone === 'review'
                  ? 'text-amber-400'
                  : 'text-muted-foreground'
            }`}
          >
            {copySessionSummary.guidance}
          </p>
          {copySessionSummary.helperText && (
            <p className="text-xs text-muted-foreground mt-1">
              {copySessionSummary.helperText}
            </p>
          )}
          {copySessionSummary.followerHealthRows.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {copySessionSummary.followerHealthRows.slice(0, 3).map((follower) => (
                <Badge
                  key={follower.accountId}
                  variant="outline"
                  className={
                    follower.health === 'unavailable'
                      ? 'border-red-400/30 text-red-400'
                      : 'border-amber-400/30 text-amber-400'
                  }
                >
                  {follower.name}: {follower.health === 'unavailable' ? 'Needs attention' : 'Reconnecting'}
                </Badge>
              ))}
              {copySessionSummary.followerHealthRows.length > 3 && (
                <Badge variant="outline" className="text-muted-foreground">
                  +{copySessionSummary.followerHealthRows.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sessionActionState.secondary?.kind === 'recover' && (
            <Button
              variant="outline"
              size="sm"
              onClick={recoverUnavailableFollowers}
              disabled={sessionActionState.secondary.disabled}
              data-testid="button-recover-unavailable-followers"
            >
              {sessionActionState.secondary.label}
            </Button>
          )}
          <Badge
            variant="outline"
            className={
              copySessionSummary.tone === 'attention'
                ? 'border-red-400/30 text-red-400'
                : copySessionSummary.tone === 'ready'
                ? 'border-emerald-400/30 text-emerald-400'
                : copySessionSummary.tone === 'review'
                  ? 'border-amber-400/30 text-amber-400'
                  : 'text-muted-foreground'
            }
          >
            {copySessionSummary.badgeLabel}
          </Badge>
          {sessionActionState.primary.kind === 'stop' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={stopCopySession}
              disabled={sessionActionState.primary.disabled}
              data-testid="button-stop-copy-session"
            >
              {sessionActionState.primary.label}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={startCopySession}
              disabled={sessionActionState.primary.disabled}
              data-testid="button-start-copy-session"
            >
              {sessionActionState.primary.label}
            </Button>
          )}
        </div>
      </div>

      {rithmicAccounts.length > 0 ? (
        <div
          className={`panel-surface rounded-[1.4rem] p-4 flex flex-col gap-3 ${getRithmicReadinessBannerToneClass(rithmicReadinessSummary.actionRequiredCount)}`}
          data-testid="rithmic-readiness-summary"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] opacity-70">Rithmic Readiness</p>
              <p className="mt-1 text-lg font-semibold">
                {getRithmicReadinessBannerLabel(rithmicReadinessSummary)}
              </p>
              <p className="mt-1 text-sm opacity-80">
                Saved-account checks for reconnect readiness and conformance login evidence.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-current/20 bg-transparent text-current">
                {rithmicReadinessSummary.connectedSessionCount}/{rithmicReadinessSummary.total} sessions active
              </Badge>
              <Badge variant="outline" className="border-current/20 bg-transparent text-current">
                {rithmicReadinessSummary.needsReconnectProofCount} reconnect proofs stale
              </Badge>
              <Badge variant="outline" className="border-current/20 bg-transparent text-current">
                {rithmicReadinessSummary.missingMetadataCount} missing login evidence
              </Badge>
            </div>
          </div>

          {rithmicReadinessViewItems.length > 0 ? (
            <div className="grid gap-2 lg:grid-cols-2">
              {rithmicReadinessViewItems.map((item) => (
                <div
                  key={item.accountId}
                  className="rounded-[1rem] border border-current/15 bg-black/10 p-3"
                  data-testid={`rithmic-readiness-card-${item.accountId}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{item.accountName}</p>
                      <p className="mt-1 text-xs opacity-75">
                        {item.environment.toUpperCase()} • {item.systemName} • {item.exchange ?? "Exchange missing"}
                      </p>
                    </div>
                    <Badge variant={item.ready ? "default" : "secondary"}>{item.statusLabel}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-current/20 bg-transparent text-current">
                      {item.sessionActive ? "Session active" : "Session offline"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        item.reconnectBadgeTone === "ok"
                          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                          : "border-amber-400/20 bg-amber-400/10 text-amber-100"
                      }
                    >
                      {item.reconnectBadgeLabel}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs opacity-80">
                    {item.sessionLabel}
                  </p>
                  <p className="mt-2 text-xs opacity-75">Reconnect drift: {item.reconnectLabel}</p>
                  {item.blockers.length > 0 ? (
                    <div className="mt-2 space-y-1 text-xs opacity-90">
                      {item.blockers.slice(0, 2).map((blocker) => (
                        <p key={blocker}>• {blocker}</p>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revalidateRithmicReadinessMutation.mutate(item.accountId)}
                      disabled={revalidateRithmicReadinessMutation.isPending}
                      data-testid={`button-rithmic-revalidate-${item.accountId}`}
                    >
                      {revalidateRithmicReadinessMutation.isPending &&
                      revalidateRithmicReadinessMutation.variables === item.accountId
                        ? "Re-checking..."
                        : "Re-check readiness"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-80">
              Checking saved Rithmic accounts now.
            </p>
          )}
        </div>
      ) : null}

      <div className="panel-surface rounded-[1.4rem] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Position Sync</p>
            <p
              className={`text-xs mt-1 ${
                positionSyncPulse.tone === 'danger'
                  ? 'text-red-400'
                  : positionSyncPulse.tone === 'warn'
                    ? 'text-amber-400'
                    : 'text-muted-foreground'
              }`}
            >
              {positionSyncPulse.headline}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{positionSyncPulse.detail}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {positionSyncRepairSummary.headline}. {positionSyncRepairSummary.detail}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              positionSyncPulse.tone === 'danger'
                ? 'border-red-400/30 text-red-400'
                : positionSyncPulse.tone === 'warn'
                  ? 'border-amber-400/30 text-amber-400'
                  : positionSyncPulse.tone === 'ok'
                    ? 'border-emerald-400/30 text-emerald-400'
                    : 'text-muted-foreground'
            }
          >
            {positionSyncPulse.tone === 'danger'
              ? 'Adjustments needed'
              : positionSyncPulse.tone === 'warn'
                ? 'Waiting on positions'
                : positionSyncPulse.tone === 'ok'
                  ? 'Aligned'
                  : 'Not started'}
          </Badge>
        </div>

        {topPositionSyncGroups.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {positionSyncRepairSummary.totalCandidates > 0 && (
              <Badge variant="outline" className="border-cyan-400/30 text-cyan-300">
                {positionSyncRepairSummary.autoReadyCount} auto-ready, {positionSyncRepairSummary.manualReviewCount} manual
              </Badge>
            )}
            {topPositionSyncGroups.map((group) => (
              <Badge
                key={group.groupId}
                variant="outline"
                className={
                  group.status === 'OUT_OF_SYNC'
                    ? 'border-red-400/30 text-red-400'
                    : group.status === 'UNAVAILABLE'
                      ? 'border-amber-400/30 text-amber-400'
                      : 'border-emerald-400/30 text-emerald-400'
                }
              >
                {group.groupName}: {group.status === 'OUT_OF_SYNC'
                  ? `${group.outOfSyncFollowers} adjustment${group.outOfSyncFollowers === 1 ? '' : 's'}`
                  : group.status === 'UNAVAILABLE'
                    ? 'Waiting'
                    : 'In sync'}
              </Badge>
            ))}
          </div>
        )}

        {positionSyncReviewGroups.length > 0 && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {positionSyncReviewGroups.map((group) => (
              <div key={group.groupId} className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{group.groupName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Master: {group.masterAccountName}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{group.summary}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      group.status === 'OUT_OF_SYNC'
                        ? 'border-red-400/30 text-red-400'
                        : 'border-amber-400/30 text-amber-400'
                    }
                  >
                    {group.status === 'OUT_OF_SYNC' ? 'Review plan' : 'Waiting'}
                  </Badge>
                </div>

                <div className="mt-3 space-y-3">
                  {group.followers.slice(0, 2).map((follower) => {
                    const workflowKey = buildPositionSyncWorkflowKey(group.groupId, follower.followerAccountId);
                    const workflowEntry = positionSyncWorkflowState[workflowKey];

                    return (
                    <div key={follower.followerAccountId} className="rounded-xl border border-white/8 bg-black/10 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{follower.followerName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{follower.summary}</p>
                          {follower.repairRecommendation && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {follower.repairRecommendation.reason}
                            </p>
                          )}
                          {follower.repairRecommendation && (
                            <p className="mt-1 text-xs text-white/60">
                              {describePositionSyncSimulationGuidance(follower.repairRecommendation.complexity)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {workflowEntry?.status === 'approved' && (
                            <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                              Approved
                            </Badge>
                          )}
                          {workflowEntry?.status === 'handed_off' && (
                            <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-amber-100">
                              Handed Off
                            </Badge>
                          )}
                          {workflowEntry?.status === 'completed_manually' && (
                            <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/15 text-emerald-100">
                              Completed Manually
                            </Badge>
                          )}
                          {workflowEntry?.status === 'reviewed' && (
                            <Badge variant="outline" className="border-emerald-400/30 text-emerald-300">
                              Reviewed
                            </Badge>
                          )}
                          {workflowEntry?.status === 'simulated' && (
                            <Badge variant="outline" className="border-cyan-400/30 text-cyan-300">
                              Simulated
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={
                              follower.status === 'OUT_OF_SYNC'
                                ? 'border-red-400/30 text-red-400'
                                : 'border-amber-400/30 text-amber-400'
                            }
                          >
                            {follower.status === 'OUT_OF_SYNC'
                              ? `${follower.adjustmentCount} adjustment${follower.adjustmentCount === 1 ? '' : 's'}`
                              : 'Waiting'}
                          </Badge>
                          {follower.repairRecommendation && (
                            <Badge
                              variant="outline"
                              className={
                                follower.repairRecommendation.tone === 'ok'
                                  ? 'border-emerald-400/30 text-emerald-300'
                                  : 'border-amber-400/30 text-amber-300'
                              }
                            >
                              {follower.repairRecommendation.label}
                            </Badge>
                          )}
                          {follower.repairRecommendation && (
                            <Badge
                              variant="outline"
                              className={
                                follower.repairRecommendation.complexity === 'high'
                                  ? 'border-red-400/30 text-red-300'
                                  : follower.repairRecommendation.complexity === 'medium'
                                    ? 'border-amber-400/30 text-amber-200'
                                    : 'border-cyan-400/30 text-cyan-200'
                              }
                            >
                              {follower.repairRecommendation.complexityLabel}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {follower.adjustments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {follower.adjustments.slice(0, 2).map((adjustment) => (
                            <div key={`${follower.followerAccountId}-${adjustment.symbol}-${adjustment.actionLabel}`} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold text-white">{adjustment.symbol}</span>
                                <span className="text-xs text-red-300">{adjustment.actionLabel}</span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{adjustment.detail}</p>
                            </div>
                          ))}
                          {follower.adjustments.length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              +{follower.adjustments.length - 2} more planned adjustment{follower.adjustments.length - 2 === 1 ? '' : 's'}.
                            </p>
                          )}
                        </div>
                      )}
                      <div className="mt-3 space-y-3">
                        <Textarea
                          value={positionSyncReviewNotes[workflowKey] ?? workflowEntry?.note ?? ''}
                          onChange={(event) =>
                            setPositionSyncReviewNotes((current) => ({
                              ...current,
                              [workflowKey]: event.target.value,
                            }))
                          }
                          placeholder="Shared sync review note"
                          className="min-h-[72px] border-white/10 bg-white/[0.03] text-sm text-white placeholder:text-muted-foreground"
                        />
                        <Textarea
                          value={positionSyncAssignmentReasons[workflowKey] ?? ''}
                          onChange={(event) =>
                            setPositionSyncAssignmentReasons((current) => ({
                              ...current,
                              [workflowKey]: event.target.value,
                            }))
                          }
                          placeholder="Optional ownership or handoff reason"
                          className="min-h-[56px] border-white/10 bg-white/[0.03] text-sm text-white placeholder:text-muted-foreground"
                        />
                      </div>
                      {workflowEntry?.note && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Review note: {workflowEntry.note}
                        </p>
                      )}
                      {workflowEntry?.operatorName && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Operator owner: {workflowEntry.operatorName}
                        </p>
                      )}
                      {(workflowEntry?.operatorHistory?.length ?? 0) > 1 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Ownership changes: {(workflowEntry?.operatorHistory?.length ?? 0) - 1}
                        </p>
                      )}
                      {workflowEntry?.operatorHistory?.[workflowEntry.operatorHistory.length - 1]?.reason && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Latest ownership reason: {workflowEntry.operatorHistory[workflowEntry.operatorHistory.length - 1]?.reason}
                        </p>
                      )}
                      {(workflowEntry?.operatorHistory?.length ?? 0) > 0 && (
                        <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-3">
                          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                            Ownership Timeline
                          </p>
                          <div className="mt-2 space-y-2">
                            {workflowEntry?.operatorHistory?.map((assignment, index) => (
                              <div
                                key={`${workflowKey}-assignment-${index}`}
                                className="border-l border-white/10 pl-3 text-xs text-muted-foreground"
                              >
                                <p className="text-white/80">
                                  {assignment.operatorName} on {new Date(assignment.assignedAt).toLocaleString()}.
                                </p>
                                {assignment.reason && (
                                  <p className="mt-1 text-muted-foreground">{assignment.reason}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {workflowEntry?.reviewedAt && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Reviewed on {new Date(workflowEntry.reviewedAt).toLocaleString()}.
                        </p>
                      )}
                      {workflowEntry?.approvedAt && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Approved on {new Date(workflowEntry.approvedAt).toLocaleString()}.
                        </p>
                      )}
                      {workflowEntry?.handedOffAt && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Handed off on {new Date(workflowEntry.handedOffAt).toLocaleString()}.
                        </p>
                      )}
                      {workflowEntry?.completedManuallyAt && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Completed manually on {new Date(workflowEntry.completedManuallyAt).toLocaleString()}.
                        </p>
                      )}
                      {!workflowEntry?.reviewedAt && workflowEntry?.simulatedAt && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Simulated on {new Date(workflowEntry.simulatedAt).toLocaleString()}.
                        </p>
                      )}
                      {workflowEntry?.simulationFingerprint && (
                        <p className="mt-2 text-xs text-cyan-200/80">
                          Evidence {workflowEntry.simulationFingerprint.slice(0, 12)} saved. No broker orders submitted.
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                          onClick={() =>
                            handleApprovePositionSyncEntry({
                              groupId: group.groupId,
                              followerAccountId: follower.followerAccountId,
                              workflowKey,
                              workflowEntry,
                            })
                          }
                          disabled={
                            savePositionSyncWorkflowMutation.isPending ||
                            workflowEntry?.status !== 'simulated'
                          }
                        >
                          {savePositionSyncWorkflowMutation.isPending
                            ? 'Saving...'
                            : workflowEntry?.status === 'simulated'
                              ? 'Approve'
                              : 'Simulate first'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
                          onClick={() =>
                            handleTakePositionSyncOwnership({
                              groupId: group.groupId,
                              followerAccountId: follower.followerAccountId,
                              workflowKey,
                              workflowEntry,
                            })
                          }
                          disabled={savePositionSyncWorkflowMutation.isPending}
                        >
                          {savePositionSyncWorkflowMutation.isPending ? 'Saving...' : 'Take ownership'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-amber-400/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15"
                          onClick={() =>
                            handleHandOffPositionSyncEntry({
                              groupId: group.groupId,
                              followerAccountId: follower.followerAccountId,
                              workflowKey,
                              workflowEntry,
                            })
                          }
                          disabled={
                            savePositionSyncWorkflowMutation.isPending ||
                            workflowEntry?.status !== 'approved'
                          }
                        >
                          {savePositionSyncWorkflowMutation.isPending
                            ? 'Saving...'
                            : workflowEntry?.status === 'approved'
                              ? 'Hand off'
                              : 'Approve first'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15"
                          onClick={() =>
                            handleCompletePositionSyncEntry({
                              groupId: group.groupId,
                              followerAccountId: follower.followerAccountId,
                              workflowKey,
                              workflowEntry,
                            })
                          }
                          disabled={
                            savePositionSyncWorkflowMutation.isPending ||
                            workflowEntry?.status !== 'handed_off'
                          }
                        >
                          {savePositionSyncWorkflowMutation.isPending
                            ? 'Saving...'
                            : workflowEntry?.status === 'handed_off'
                              ? 'Mark completed manually'
                              : 'Hand off first'}
                        </Button>
                      </div>
                    </div>
                    );
                  })}
                  {group.followers.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{group.followers.length - 2} more follower{group.followers.length - 2 === 1 ? '' : 's'} in this sync review.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
            <Button
              variant={viewMode === 'groups' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('groups')}
              data-testid="button-view-groups"
            >
              <Layers className="h-4 w-4 mr-2" />
              Groups
            </Button>
          </>
        )}

      </div>

      {!hasAccounts ? (
        <AccountGroupsView
          accounts={accounts}
          onConnect={handleConnect}
          onDisconnect={handleDisconnectClick}
          accountActionDisabled={accountControlsDisabled}
          getConnectButtonLabel={getConnectButtonLabel}
          getDisconnectButtonLabel={getDisconnectButtonLabel}
          accountRiskById={accountRiskById}
          addGroupTrigger={addGroupTrigger}
        />
      ) : viewMode === 'groups' ? (
        <AccountGroupsView
          accounts={accounts}
          onConnect={handleConnect}
          onDisconnect={handleDisconnectClick}
          accountActionDisabled={accountControlsDisabled}
          getConnectButtonLabel={getConnectButtonLabel}
          getDisconnectButtonLabel={getDisconnectButtonLabel}
          accountRiskById={accountRiskById}
          addGroupTrigger={addGroupTrigger}
        />
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accountRuntimeViewModels.map((viewModel) => {
                const { account } = viewModel;
                const effectiveAccount = getEffectiveSettings(account);
                return (
                  <AccountCard
                    key={account.id}
                    id={account.id}
                    name={account.name}
                    platform={account.platform}
                    accountType={account.accountType as 'master' | 'follower'}
                    isConnected={account.isConnected || false}
                    sessionStatusLabel={viewModel.sessionStatus.label}
                    sessionStatusTone={viewModel.sessionStatus.tone}
                    hasLiveBrokerData={viewModel.hasLiveBrokerData}
                    hasLiveBalance={viewModel.hasLiveBalance}
                    hasLivePositionData={viewModel.hasLivePositionData}
                    liveBrokerStatus={viewModel.liveBrokerStatus}
                    liveBrokerReason={viewModel.liveBrokerReason}
                    balance={viewModel.balance}
                    openPositions={viewModel.openPositions}
                    pnl={viewModel.pnl}
                    positionScaling={effectiveAccount.positionScaling || undefined}
                    maxContracts={effectiveAccount.maxContracts || undefined}
                    blockedTickers={effectiveAccount.blockedTickers || []}
                    riskMode={(account.riskMode as 'global' | 'custom') || undefined}
                    riskStatusLabel={toAccountRiskBadgeView(accountRiskById[account.id]).label}
                    riskStatusTone={toAccountRiskBadgeView(accountRiskById[account.id]).tone}
                    onConnect={() => handleConnect(account.id)}
                    onDisconnect={() => handleDisconnectClick(account.id, account.name)}
                    accountActionDisabled={accountControlsDisabled}
                    connectButtonLabel={getConnectButtonLabel(account.id)}
                    disconnectButtonLabel={getDisconnectButtonLabel(account.id)}
                    configureButton={
                      <div className="space-y-2">
                        {renderSessionMasterButton(account, { className: 'w-full' })}
                        {renderAccountTypeButton(account, { className: 'w-full' })}
                        {renderBrokerSettingsButton(account, { className: 'w-full' })}
                        {renderRiskSettingsButton(account, { className: 'w-full' })}
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-2">
              {accountRuntimeViewModels.map((viewModel) => {
                const { account } = viewModel;
                const effectiveAccount = getEffectiveSettings(account);
                
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
                          {renderAccountIdentityBadges(account)}
                        </div>
                        {renderAccountConnectionStatus(account, viewModel)}
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      {renderAccountValueBlock(
                        viewModel.hasLiveBalance ? 'Balance' : 'Saved Balance',
                        `$${viewModel.balance.toLocaleString()}`,
                        { className: 'text-right' },
                      )}
                      {renderAccountPnlValueBlock(
                        viewModel.hasLivePositionData ? 'Unrealized P&L' : 'Saved P&L',
                        viewModel.pnl,
                      )}
                      {renderAccountValueBlock(
                        viewModel.hasLivePositionData ? 'Positions' : 'Saved Positions',
                        viewModel.openPositions,
                        { className: 'text-right' },
                      )}

                      <div className="flex gap-2">
                        {renderCompactAccountActions(account)}
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
                      {hasFollowerAccounts && (
                        <th className="text-right p-3 text-xs font-semibold uppercase tracking-wide">Scaling</th>
                      )}
                      <th className="text-right p-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountRuntimeViewModels.map((viewModel) => {
                      const { account } = viewModel;
                      const effectiveAccount = getEffectiveSettings(account);

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
                            {renderAccountConnectionStatus(account, viewModel, {
                              textClassName: 'text-sm',
                            })}
                          </td>
                          <td className="p-3 text-right font-semibold tabular-nums" title={viewModel.hasLiveBalance ? 'Live broker balance' : 'Saved balance, not live'}>
                            ${viewModel.balance.toLocaleString()}
                            <div className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                              {viewModel.hasLiveBalance ? 'Live' : 'Saved'}
                            </div>
                          </td>
                          <td className={`p-3 text-right font-semibold tabular-nums ${viewModel.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${viewModel.pnl >= 0 ? '+' : ''}{viewModel.pnl.toLocaleString()}
                            <div className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                              {viewModel.hasLivePositionData ? 'Live unrealized' : 'Saved'}
                            </div>
                          </td>
                          <td className="p-3 text-right tabular-nums">
                            {viewModel.openPositions}
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {viewModel.hasLivePositionData ? 'Live' : 'Saved'}
                            </div>
                          </td>
                          {hasFollowerAccounts && (
                            <td className="p-3 text-right tabular-nums">
                              {renderFollowerScalingValue(account, effectiveAccount)}
                            </td>
                          )}
                          <td className="p-3">
                            <div className="flex gap-2 justify-end">
                              {renderCompactAccountActions(account)}
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
