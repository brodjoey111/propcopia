import { AccountBalanceChart } from '../account-balance-chart';

export default function AccountBalanceChartExample() {
  const mockData = [
    { name: 'Main Trading', balance: 52340, pnl: 1240 },
    { name: 'Follower 1', balance: 28900, pnl: 620 },
    { name: 'Follower 2', balance: 44100, pnl: 1240 },
  ];

  return (
    <div className="p-6">
      <AccountBalanceChart data={mockData} title="Account Balances" />
    </div>
  );
}
