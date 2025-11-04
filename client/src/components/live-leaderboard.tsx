import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Position {
  symbol: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
}

interface Trader {
  id: string;
  username: string;
  name: string;
  positions: Position[];
  totalPnl: number;
  returnPercent: number;
  isVerified: boolean;
}

interface MarketPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export function LiveLeaderboard() {
  const [traders, setTraders] = useState<Trader[]>([]);
  const [isLive, setIsLive] = useState(false);

  const { data: leaderboardData } = useQuery<{ success: boolean; data: Trader[] }>({
    queryKey: ['/api/leaderboard'],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (leaderboardData?.data) {
      setTraders(leaderboardData.data);
    }
  }, [leaderboardData]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/market`;
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[LiveLeaderboard] WebSocket connected');
          setIsLive(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'price_update') {
              updateTraderPnl(message.symbol, message.data);
            }
          } catch (error) {
            console.error('[LiveLeaderboard] Error parsing message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[LiveLeaderboard] WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('[LiveLeaderboard] WebSocket closed');
          setIsLive(false);
          
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        };
      } catch (error) {
        console.error('[LiveLeaderboard] Error creating WebSocket:', error);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const updateTraderPnl = useCallback((symbol: string, priceData: MarketPrice) => {
    setTraders(prevTraders => {
      const updatedTraders = prevTraders.map(trader => {
        let totalPnl = 0;
        const startingCapital = 50000;

        const updatedPositions = trader.positions.map(position => {
          const currentPrice = position.symbol === symbol ? priceData.price : position.currentPrice;
          const pnl = (currentPrice - position.entryPrice) * position.quantity * 50;
          totalPnl += pnl;

          return {
            ...position,
            currentPrice,
            pnl,
          };
        });

        const returnPercent = (totalPnl / startingCapital) * 100;

        return {
          ...trader,
          positions: updatedPositions,
          totalPnl,
          returnPercent,
        };
      });

      return updatedTraders.sort((a, b) => b.returnPercent - a.returnPercent);
    });
  }, []);

  const formatCurrency = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold" data-testid="heading-leaderboard">Live Leaderboard</h3>
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 ${isLive ? 'text-chart-2 animate-pulse' : 'text-muted-foreground'}`} data-testid="indicator-live" />
          <span className="text-sm text-muted-foreground">
            {isLive ? 'Live' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {traders.map((trader, index) => (
          <div
            key={trader.id}
            className="flex items-center gap-4 p-4 rounded-lg border hover-elevate"
            data-testid={`trader-${index}`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-semibold text-sm">
                #{index + 1}
              </div>
              
              <Avatar data-testid={`avatar-${trader.username}`}>
                <AvatarFallback>{trader.name[0]}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate" data-testid={`name-${trader.username}`}>
                    {trader.name}
                  </span>
                  {trader.isVerified && (
                    <Badge variant="default" className="text-xs" data-testid={`badge-verified-${trader.username}`}>
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">@{trader.username}</div>
                
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {trader.positions.map((position, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-xs"
                      data-testid={`position-${trader.username}-${idx}`}
                    >
                      {position.symbol} {position.quantity > 0 ? 'LONG' : 'SHORT'} {Math.abs(position.quantity)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 justify-end mb-1">
                {trader.returnPercent >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-chart-2" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span
                  className={`text-lg font-bold ${trader.returnPercent >= 0 ? 'text-chart-2' : 'text-destructive'}`}
                  data-testid={`return-${trader.username}`}
                >
                  {formatPercent(trader.returnPercent)}
                </span>
              </div>
              <div
                className={`text-sm ${trader.totalPnl >= 0 ? 'text-chart-2' : 'text-destructive'}`}
                data-testid={`pnl-${trader.username}`}
              >
                {formatCurrency(trader.totalPnl)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
