import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Trophy, Flame } from "lucide-react";

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

  const allTraders = leaderboardData?.data || [];
  
  // Get top 10 performers (highest positive returns)
  const topTraders = allTraders.slice(0, 10);
  
  // Get bottom 10 performers (worst returns/biggest losers)
  const bottomTraders = allTraders.slice(-10).reverse();

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  if (allTraders.length === 0) {
    return null;
  }

  // Combine top and bottom traders for display
  const displayItems = [
    ...topTraders.map((trader, index) => ({ trader, index, type: 'top' as const })),
    ...bottomTraders.map((trader, index) => ({ trader, index, type: 'bottom' as const })),
  ];

  return (
    <div className="relative overflow-hidden bg-card border-b" data-testid="leaderboard-ticker">
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50">
        <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
        <div className="overflow-hidden flex-1">
          <div className="ticker-animate flex gap-8">
            {/* First set */}
            {displayItems.map(({ trader, index, type }, idx) => (
              <div key={`${trader.id}-1-${idx}`} className="flex items-center gap-3 whitespace-nowrap" data-testid={`ticker-item-${idx}`}>
                {type === 'top' ? (
                  <Trophy className="h-3 w-3 text-primary flex-shrink-0" />
                ) : (
                  <Flame className="h-3 w-3 text-destructive flex-shrink-0" />
                )}
                <span className="text-sm font-semibold text-muted-foreground">
                  {type === 'top' ? `#${index + 1}` : `Bottom #${index + 1}`}
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
            {displayItems.map(({ trader, index, type }, idx) => (
              <div key={`${trader.id}-2-${idx}`} className="flex items-center gap-3 whitespace-nowrap">
                {type === 'top' ? (
                  <Trophy className="h-3 w-3 text-primary flex-shrink-0" />
                ) : (
                  <Flame className="h-3 w-3 text-destructive flex-shrink-0" />
                )}
                <span className="text-sm font-semibold text-muted-foreground">
                  {type === 'top' ? `#${index + 1}` : `Bottom #${index + 1}`}
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
