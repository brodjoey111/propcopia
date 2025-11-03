import { LiveActivityFeed } from '../live-activity-feed';

export default function LiveActivityFeedExample() {
  const mockActivities = [
    {
      id: '1',
      timestamp: '11:23:45',
      message: 'Trade executed: BUY 5 ES @ 4523.25 on Follower Account 1',
      type: 'success' as const,
    },
    {
      id: '2',
      timestamp: '11:18:32',
      message: 'New order placed: SELL 3 NQ @ 15234.50',
      type: 'trade' as const,
    },
    {
      id: '3',
      timestamp: '11:15:20',
      message: 'Connected to Tradovate API',
      type: 'connection' as const,
    },
    {
      id: '4',
      timestamp: '11:10:05',
      message: 'Failed to execute trade on Backup Account: Insufficient margin',
      type: 'error' as const,
    },
    {
      id: '5',
      timestamp: '11:05:12',
      message: 'Position closed: ES +$550 P&L',
      type: 'success' as const,
    },
  ];

  return (
    <div className="p-6 max-w-md">
      <LiveActivityFeed activities={mockActivities} />
    </div>
  );
}
