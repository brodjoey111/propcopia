import { LiveActivityFeed } from "@/components/live-activity-feed";

export default function Activity() {
  // todo: remove mock functionality
  const mockActivities = [
    {
      id: '1',
      timestamp: '11:23:45',
      message: 'Trade executed: BUY 5 ES @ 4523.25 on Follower Account 1',
      type: 'success' as const,
    },
    {
      id: '2',
      timestamp: '11:23:45',
      message: 'Trade executed: BUY 5 ES @ 4523.25 on Follower Account 2',
      type: 'success' as const,
    },
    {
      id: '3',
      timestamp: '11:18:32',
      message: 'New order placed: SELL 3 NQ @ 15234.50 from Main Trading',
      type: 'trade' as const,
    },
    {
      id: '4',
      timestamp: '11:15:20',
      message: 'Connected to Tradovate API - Follower Account 1',
      type: 'connection' as const,
    },
    {
      id: '5',
      timestamp: '11:10:05',
      message: 'Failed to execute trade on Backup Account: Insufficient margin',
      type: 'error' as const,
    },
    {
      id: '6',
      timestamp: '11:05:12',
      message: 'Position closed: ES +$550 P&L on Follower Account 2',
      type: 'success' as const,
    },
    {
      id: '7',
      timestamp: '10:58:33',
      message: 'Trade executed: BUY 3 NQ @ 15210.25 on Follower Account 1',
      type: 'success' as const,
    },
    {
      id: '8',
      timestamp: '10:45:22',
      message: 'Reconnecting to NinjaTrader API...',
      type: 'connection' as const,
    },
    {
      id: '9',
      timestamp: '10:32:10',
      message: 'Position scaling updated: Follower Account 1 now at 50%',
      type: 'success' as const,
    },
    {
      id: '10',
      timestamp: '10:15:05',
      message: 'Master account Main Trading placed new order: BUY 5 ES',
      type: 'trade' as const,
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Execution feed</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Live Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time feed of all trade copier events and notifications
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LiveActivityFeed activities={mockActivities} />
        <LiveActivityFeed activities={mockActivities.slice(0, 5)} />
      </div>
    </div>
  );
}
