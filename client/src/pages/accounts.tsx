import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountCard } from "@/components/account-card";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { ConfigureAccountDialog } from "@/components/configure-account-dialog";
import { GlobalRiskSettingsDialog } from "@/components/global-risk-settings-dialog";
import { DisconnectAccountAlert } from "@/components/disconnect-account-alert";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Wallet, Settings, Loader2 } from "lucide-react";
import type { Account as AccountType } from "@shared/schema";

interface Account extends AccountType {
  openPositions?: number;
  pnl?: number;
}

export default function Accounts() {
  const { toast } = useToast();
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
        {hasAccounts && (
          <div className="flex gap-2">
            <GlobalRiskSettingsDialog
              positionScaling={globalSettings.positionScaling}
              maxContracts={globalSettings.maxContracts}
              blockedTickers={globalSettings.blockedTickers}
              onSave={handleGlobalSettingsUpdate}
            />
            <AddAccountDialog onAdd={handleAddAccount} />
          </div>
        )}
      </div>

      {hasAccounts ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const effectiveAccount = getEffectiveSettings(account);
            return (
              <AccountCard
                key={account.id}
                {...effectiveAccount}
                openPositions={account.openPositions || 0}
                pnl={account.pnl || 0}
                riskMode={account.riskMode}
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
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No accounts connected</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Connect your first trading account to start copying trades. You can add accounts from Tradovate and Tradify.
          </p>
          <AddAccountDialog onAdd={handleAddAccount} />
        </div>
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
