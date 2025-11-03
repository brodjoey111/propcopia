import { TradeLogTable } from "@/components/trade-log-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";

export default function Trades() {
  // todo: remove mock functionality
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
      followersExecuted: 2,
      followersTotal: 2,
      status: 'success' as const,
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
    {
      id: '4',
      timestamp: '10:32:18 AM',
      masterAccount: 'Main Trading',
      symbol: 'NQ',
      action: 'BUY' as const,
      quantity: 2,
      price: 15210.25,
      followersExecuted: 1,
      followersTotal: 2,
      status: 'pending' as const,
    },
    {
      id: '5',
      timestamp: '09:15:42 AM',
      masterAccount: 'Main Trading',
      symbol: 'ES',
      action: 'BUY' as const,
      quantity: 5,
      price: 4518.50,
      followersExecuted: 1,
      followersTotal: 2,
      status: 'failed' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Trade Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View complete history of all copied trades
          </p>
        </div>
        <Button variant="outline" data-testid="button-export">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Card className="card-3d p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search trades by symbol, account, or action..."
              className="pl-9"
              data-testid="input-search-trades"
            />
          </div>
        </div>
      </Card>

      <TradeLogTable trades={mockTrades} />
    </div>
  );
}
