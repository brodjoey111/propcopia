import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Trophy } from "lucide-react";

interface Trader {
  id: string;
  username: string;
  name: string;
  totalPnl: number;
  returnPercent: number;
  isVerified: boolean;
}

export function LeaderboardTicker() {
  const { data: leaderboardData } = useQuery<{ success: boolean; data: Trader[] }>({
    queryKey: ['/api/leaderboard'],
    refetchInterval: 10000,
  });

  const topTraders = leaderboardData?.data?.slice(0, 10) || [];

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (topTraders.length === 0) {
    return null;
  }

  return (
    <div className="relative overflow-hidden bg-card border-b" data-testid="leaderboard-ticker">
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50">
        <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="overflow-hidden flex-1">
          <div className="ticker-animate flex gap-8">
            {/* First set */}
            {topTraders.map((trader, index) => (
              <div key={`${trader.id}-1`} className="flex items-center gap-3 whitespace-nowrap" data-testid={`ticker-item-${index}`}>
                <span className="text-sm font-semibold text-muted-foreground">
                  #{index + 1}
                </span>
                <span className="text-sm font-medium">
                  {trader.name}
                </span>
                <div className="flex items-center gap-1">
                  {trader.returnPercent >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-chart-2" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className={`text-sm font-semibold ${trader.returnPercent >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                    {formatPercent(trader.returnPercent)}
                  </span>
                </div>
              </div>
            ))}
            {/* Duplicate set for seamless loop */}
            {topTraders.map((trader, index) => (
              <div key={`${trader.id}-2`} className="flex items-center gap-3 whitespace-nowrap">
                <span className="text-sm font-semibold text-muted-foreground">
                  #{index + 1}
                </span>
                <span className="text-sm font-medium">
                  {trader.name}
                </span>
                <div className="flex items-center gap-1">
                  {trader.returnPercent >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-chart-2" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className={`text-sm font-semibold ${trader.returnPercent >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                    {formatPercent(trader.returnPercent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
