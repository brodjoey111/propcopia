import { useState } from "react";
import { AccountCard } from "@/components/account-card";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { ConfigureAccountDialog } from "@/components/configure-account-dialog";
import { GlobalRiskSettingsDialog } from "@/components/global-risk-settings-dialog";
import { EmptyState } from "@/components/empty-state";
import { Wallet } from "lucide-react";

export default function Accounts() {
  // todo: remove mock functionality
  const initialMockAccounts = [
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
      riskMode: 'custom' as const,
      positionScaling: 50,
      maxContracts: 10,
      blockedTickers: ['ES', 'NQ'],
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
      riskMode: 'global' as const,
      positionScaling: 100,
      blockedTickers: [] as string[],
    },
    {
      id: '4',
      name: 'Backup Account',
      platform: 'Tradovate',
      accountType: 'follower' as const,
      isConnected: false,
      balance: 15000,
      openPositions: 0,
      pnl: -230,
      riskMode: 'global' as const,
      positionScaling: 75,
      maxContracts: 5,
      blockedTickers: ['YM'],
    },
  ];

  const [accounts, setAccounts] = useState(initialMockAccounts);
  const [globalSettings, setGlobalSettings] = useState({
    positionScaling: 100,
    maxContracts: undefined as number | undefined,
    blockedTickers: [] as string[],
  });

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
  };

  const handleDisconnect = (accountId: string) => {
    setAccounts(accounts.map(account => 
      account.id === accountId 
        ? { ...account, isConnected: false }
        : account
    ));
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
                onConfigure={
                  account.accountType === 'follower'
                    ? (
                        <ConfigureAccountDialog
                          accountId={account.id}
                          accountName={account.name}
                          riskMode={account.riskMode || 'global'}
                          positionScaling={account.positionScaling}
                          maxContracts={account.maxContracts}
                          blockedTickers={account.blockedTickers || []}
                          globalSettings={globalSettings}
                          onSave={(config) => handleConfigure(account.id, config)}
                        />
                      )
                    : undefined
                }
                onConnect={() => handleConnect(account.id)}
                onDisconnect={() => handleDisconnect(account.id)}
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
    </div>
  );
}
