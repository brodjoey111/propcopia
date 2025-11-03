import { StatsCard } from '../stats-card';
import { Wallet, TrendingUp, Activity, Users } from 'lucide-react';

export default function StatsCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      <StatsCard
        label="Total Balance"
        value="$125,430"
        change={12.5}
        icon={Wallet}
        testId="text-total-balance"
      />
      <StatsCard
        label="Active Accounts"
        value="6"
        icon={Users}
      />
      <StatsCard
        label="Today's P&L"
        value="$2,340"
        change={-3.2}
        icon={TrendingUp}
      />
      <StatsCard
        label="Trades Copied"
        value="148"
        change={8.1}
        icon={Activity}
      />
    </div>
  );
}
