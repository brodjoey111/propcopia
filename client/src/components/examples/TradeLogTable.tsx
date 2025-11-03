import { TradeLogTable } from '../trade-log-table';

export default function TradeLogTableExample() {
  const mockTrades = [
    {
      id: '1',
      timestamp: '11:23:45 AM',
      masterAccount: 'Main Trading',
      symbol: 'ES',
      action: 'BUY' as const,
      quantity: 5,
      price: 4523.25,
      followersExecuted: 2,
      followersTotal: 2,
      status: 'success' as const,
    },
    {
      id: '2',
      timestamp: '11:18:32 AM',
      masterAccount: 'Main Trading',
      symbol: 'NQ',
      action: 'SELL' as const,
      quantity: 3,
      price: 15234.50,
      followersExecuted: 1,
      followersTotal: 2,
      status: 'pending' as const,
    },
    {
      id: '3',
      timestamp: '10:45:12 AM',
      masterAccount: 'Main Trading',
      symbol: 'ES',
      action: 'CLOSE' as const,
      quantity: 5,
      price: 4528.75,
      followersExecuted: 2,
      followersTotal: 2,
      status: 'success' as const,
    },
  ];

  return (
    <div className="p-6">
      <TradeLogTable trades={mockTrades} />
    </div>
  );
}
