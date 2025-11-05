import { useState } from "react";
import { AccountCard } from "@/components/account-card";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { ConfigureAccountDialog } from "@/components/configure-account-dialog";
import { GlobalRiskSettingsDialog } from "@/components/global-risk-settings-dialog";
import { DisconnectAccountAlert } from "@/components/disconnect-account-alert";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Settings } from "lucide-react";

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

export default function Accounts() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
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

  const handleAddAccount = (newAccount: any) => {
    const accountToAdd = {
      id: `${accounts.length + 1}`,
      name: newAccount.name,
      platform: newAccount.platform,
      accountType: newAccount.accountType as 'master' | 'follower',
      isConnected: false,
      balance: 0,
      openPositions: 0,
      pnl: 0,
      ...(newAccount.accountType === 'follower' && { positionScaling: 100 }),
    };
    setAccounts([...accounts, accountToAdd] as any);
  };

  const handleConnect = (accountId: string) => {
    setAccounts(accounts.map(account => 
      account.id === accountId 
        ? { ...account, isConnected: true }
        : account
    ));
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
    const accountId = disconnectAlert.accountId;
    setAccounts(accounts.map(account => 
      account.id === accountId 
        ? { ...account, isConnected: false }
        : account
    ));
    const account = accounts.find(a => a.id === accountId);
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
    setAccounts(accounts.map(account => {
      if (account.id !== accountId || account.accountType !== 'follower') {
        return account;
      }
      return { 
        ...account,
        riskMode: config.riskMode as 'global' | 'custom',
        positionScaling: config.positionScaling,
        maxContracts: config.maxContracts || undefined,
        blockedTickers: config.blockedTickers,
      } as any;
    }));
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
                riskMode={account.riskMode}
                onConnect={() => handleConnect(account.id)}
                onDisconnect={() => handleDisconnectClick(account.id, account.name)}
                configureButton={
                  account.accountType === 'follower' ? (
                    <ConfigureAccountDialog
                      accountId={account.id}
                      accountName={account.name}
                      riskMode={account.riskMode || 'global'}
                      positionScaling={account.positionScaling}
                      maxContracts={account.maxContracts}
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
        <EmptyState
          icon={Wallet}
          title="No accounts connected"
          description="Connect your first trading account to start copying trades. You can add accounts from NinjaTrader, Tradovate, and more."
          actionLabel="Add Account"
          onAction={() => console.log('Add account clicked')}
        />
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
