import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Stock {
  symbol: string;
  name: string;
  change: number;
  price: number;
  changesPercentage: number;
  volume?: number;
  marketCap?: number;
  open?: number;
  close?: number;
  indices?: {
    sp500: boolean;
    nasdaq: boolean;
  };
}

interface MarketMoversResponse {
  success: boolean;
  data: Stock[];
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(2)}M`;
  }
  return `$${num.toFixed(2)}`;
}

function StockRow({ stock, index }: { stock: Stock; index: number }) {
  const isPositive = stock.changesPercentage >= 0;
  const percentColor = isPositive ? "text-[#00c805]" : "text-[#ff5000]";
  
  return (
    <div 
      className="grid grid-cols-[30px_1fr_auto] sm:grid-cols-[40px_1fr_auto_auto] gap-2 sm:gap-4 items-center p-3 sm:p-4 hover-elevate active-elevate-2 border-b last:border-b-0 touch-manipulation"
      data-testid={`stock-row-${stock.symbol}`}
    >
      <div className="text-xs sm:text-sm text-muted-foreground font-medium">
        #{index + 1}
      </div>
      
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground text-sm sm:text-base" data-testid={`stock-symbol-${stock.symbol}`}>
            {stock.symbol}
          </span>
          {stock.indices?.sp500 && (
            <Badge variant="secondary" className="text-xs no-default-hover-elevate hidden sm:inline-flex" data-testid={`badge-sp500-${stock.symbol}`}>
              S&P 500
            </Badge>
          )}
          {stock.indices?.nasdaq && (
            <Badge variant="secondary" className="text-xs no-default-hover-elevate hidden sm:inline-flex" data-testid={`badge-nasdaq-${stock.symbol}`}>
              NASDAQ
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs sm:text-sm text-muted-foreground truncate" data-testid={`stock-name-${stock.symbol}`}>
            {stock.name}
          </span>
        </div>
        {stock.open !== undefined && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span data-testid={`stock-open-${stock.symbol}`}>
              Open: ${stock.open.toFixed(2)}
            </span>
            {stock.close !== undefined && (
              <span data-testid={`stock-close-${stock.symbol}`}>
                Close: ${stock.close.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="hidden sm:flex flex-col items-end gap-1">
        <span className="font-semibold text-foreground" data-testid={`stock-price-${stock.symbol}`}>
          {formatNumber(stock.price)}
        </span>
        {stock.volume && (
          <span className="text-xs text-muted-foreground">
            Vol: {(stock.volume / 1_000_000).toFixed(2)}M
          </span>
        )}
      </div>
      
      <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
        <div className={`flex items-center gap-1 ${percentColor} font-semibold text-sm sm:text-base`} data-testid={`stock-change-${stock.symbol}`}>
          {isPositive ? (
            <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
          ) : (
            <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4" />
          )}
          <span>{Math.abs(stock.changesPercentage).toFixed(2)}%</span>
        </div>
        <div className="flex sm:hidden flex-col items-end">
          <span className="font-semibold text-foreground text-xs" data-testid={`stock-price-${stock.symbol}-mobile`}>
            {formatNumber(stock.price)}
          </span>
        </div>
      </div>
    </div>
  );
}

function StockList({ type, title, icon: Icon }: { type: string; title: string; icon: any }) {
  const { data, isLoading, error } = useQuery<MarketMoversResponse>({
    queryKey: ['/api/market-movers', type],
    queryFn: async () => {
      const response = await fetch(`/api/market-movers?type=${type}`);
      if (!response.ok) {
        throw new Error('Failed to fetch market movers');
      }
      return response.json();
    },
    refetchInterval: 15000, // Refresh every 15 seconds for real-time price updates
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[40px_1fr_auto_auto] gap-4 items-center p-4 border-b">
            <Skeleton className="h-4 w-8" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center" data-testid="error-message">
        <p className="text-muted-foreground">
          Failed to load market data. Please try again later.
        </p>
      </div>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <div className="p-8 text-center" data-testid="empty-message">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="divide-y" data-testid={`stock-list-${type}`}>
      {data.data.map((stock, index) => (
        <StockRow key={stock.symbol} stock={stock} index={index} />
      ))}
    </div>
  );
}

export default function MarketMovers() {
  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-market-movers">
            Market Movers
          </h1>
          <p className="text-muted-foreground" data-testid="text-description">
            Top 100 gaining and losing stocks with real-time data and fund composition
          </p>
        </div>

        <Tabs defaultValue="gainers" className="space-y-4" data-testid="tabs-market-movers">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-list">
            <TabsTrigger value="gainers" className="gap-2" data-testid="tab-gainers">
              <TrendingUp className="h-4 w-4" />
              Top Gainers
            </TabsTrigger>
            <TabsTrigger value="losers" className="gap-2" data-testid="tab-losers">
              <TrendingDown className="h-4 w-4" />
              Top Losers
            </TabsTrigger>
            <TabsTrigger value="actives" className="gap-2" data-testid="tab-actives">
              <Activity className="h-4 w-4" />
              Most Active
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gainers" className="space-y-4" data-testid="content-gainers">
            <Card>
              <StockList type="gainers" title="Top Gainers" icon={TrendingUp} />
            </Card>
          </TabsContent>

          <TabsContent value="losers" className="space-y-4" data-testid="content-losers">
            <Card>
              <StockList type="losers" title="Top Losers" icon={TrendingDown} />
            </Card>
          </TabsContent>

          <TabsContent value="actives" className="space-y-4" data-testid="content-actives">
            <Card>
              <StockList type="actives" title="Most Active" icon={Activity} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
