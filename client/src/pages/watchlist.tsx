import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { CompanyDetailsDialog } from "@/components/company-details-dialog";
import { TickerAutocomplete } from "@/components/ticker-autocomplete";
import type { TickerInfo } from "@shared/ticker-database";

interface WatchlistItemWithQuote {
  id: string;
  userId: string;
  ticker: string;
  addedAt: Date;
  quote: {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
  } | null;
}

export default function Watchlist() {
  const { toast } = useToast();
  const [newTicker, setNewTicker] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const { data: watchlistData, isLoading } = useQuery<{ success: boolean; data: WatchlistItemWithQuote[] }>({
    queryKey: ["/api/watchlist"],
    refetchInterval: 15000, // Refresh every 15 seconds for real-time price updates
  });

  const addMutation = useMutation({
    mutationFn: async (ticker: string) => {
      return apiRequest("POST", "/api/watchlist", { ticker: ticker.toUpperCase() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      setNewTicker("");
      toast({
        title: "Success",
        description: "Ticker added to watchlist",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add ticker",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (ticker: string) => {
      return apiRequest("DELETE", `/api/watchlist/${ticker}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Success",
        description: "Ticker removed from watchlist",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove ticker",
        variant: "destructive",
      });
    },
  });

  const handleAddTicker = () => {
    if (!newTicker.trim()) {
      toast({
        title: "Error",
        description: "Please enter a ticker symbol",
        variant: "destructive",
      });
      return;
    }
    addMutation.mutate(newTicker.trim());
  };

  const handleSelectTicker = (ticker: TickerInfo) => {
    addMutation.mutate(ticker.symbol);
  };

  const watchlist = watchlistData?.data || [];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Watchlist</h1>
        <p className="text-muted-foreground">Track your favorite stocks with real-time data</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <TickerAutocomplete
              value={newTicker}
              onChange={setNewTicker}
              onSelect={handleSelectTicker}
              disabled={addMutation.isPending}
              placeholder="Search by symbol or name (e.g., AAPL or Apple)"
            />
            <Button
              onClick={handleAddTicker}
              disabled={addMutation.isPending || !newTicker.trim()}
              data-testid="button-add-ticker"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Type a ticker symbol (ES, AAPL) or full name (E-mini S&P 500, Apple) to search
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-6 bg-muted rounded w-20"></div>
                  <div className="h-8 bg-muted rounded w-32"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : watchlist.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground" data-testid="text-empty-state">
              Your watchlist is empty. Add some tickers to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {watchlist.map((item) => (
            <Card 
              key={item.id} 
              className="cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setSelectedTicker(item.ticker)}
              data-testid={`card-watchlist-${item.ticker}`}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold" data-testid={`text-ticker-${item.ticker}`}>
                      {item.ticker}
                    </h3>
                    {item.quote && (
                      <p className="text-2xl font-semibold mt-1" data-testid={`text-price-${item.ticker}`}>
                        ${item.quote.price.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      removeMutation.mutate(item.ticker);
                    }}
                    disabled={removeMutation.isPending}
                    data-testid={`button-remove-${item.ticker}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {item.quote ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {item.quote.change >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-[#00c805]" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-[#ff5000]" />
                      )}
                      <span
                        className={`font-semibold ${
                          item.quote.change >= 0 ? "text-[#00c805]" : "text-[#ff5000]"
                        }`}
                        data-testid={`text-change-${item.ticker}`}
                      >
                        {item.quote.change >= 0 ? "+" : ""}
                        {item.quote.change.toFixed(2)} ({item.quote.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground" data-testid={`text-volume-${item.ticker}`}>
                      Vol: {item.quote.volume.toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Loading quote...
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Company Details Dialog */}
      {selectedTicker && (
        <CompanyDetailsDialog
          ticker={selectedTicker}
          open={!!selectedTicker}
          onOpenChange={(open) => !open && setSelectedTicker(null)}
        />
      )}
    </div>
  );
}
