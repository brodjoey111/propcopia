import { useState } from "react";
import { AccountCard } from "@/components/account-card";
import { AddAccountDialog } from "@/components/add-account-dialog";
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
    {
      id: '4',
      name: 'Backup Account',
      platform: 'Tradovate',
      accountType: 'follower' as const,
      isConnected: false,
      balance: 15000,
      openPositions: 0,
      pnl: -230,
      positionScaling: 75,
    },
  ];

  const [accounts, setAccounts] = useState(initialMockAccounts);

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
          <AddAccountDialog onAdd={handleAddAccount} />
        )}
      </div>

      {hasAccounts ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              {...account}
              onConfigure={() => console.log(`Configure ${account.name}`)}
              onConnect={() => handleConnect(account.id)}
              onDisconnect={() => handleDisconnect(account.id)}
            />
          ))}
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
