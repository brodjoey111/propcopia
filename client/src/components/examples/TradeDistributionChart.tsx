import { TradeDistributionChart } from '../trade-distribution-chart';

export default function TradeDistributionChartExample() {
  const mockData = [
    { name: 'Successful', value: 124, color: 'hsl(var(--chart-2))' },
    { name: 'Failed', value: 8, color: 'hsl(var(--destructive))' },
    { name: 'Pending', value: 16, color: 'hsl(var(--chart-4))' },
  ];

  return (
    <div className="p-6">
      <TradeDistributionChart data={mockData} title="Trade Status Distribution" />
    </div>
  );
}
