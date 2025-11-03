import { EmptyState } from '../empty-state';
import { Wallet } from 'lucide-react';

export default function EmptyStateExample() {
  return (
    <div className="p-6">
      <EmptyState
        icon={Wallet}
        title="No accounts connected"
        description="Connect your first trading account to start copying trades. You can add accounts from NinjaTrader, Tradovate, and more."
        actionLabel="Add Account"
        onAction={() => console.log('Add account clicked')}
      />
    </div>
  );
}
