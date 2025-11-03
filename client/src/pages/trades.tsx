import { TradeCalendar } from "@/components/trade-calendar";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function Trades() {
  // todo: remove mock functionality
  const mockTrades = [
    // November 2024
    { id: '1', date: new Date(2024, 10, 1), pnl: 850, symbol: 'ES', action: 'BUY' },
    { id: '2', date: new Date(2024, 10, 1), pnl: -320, symbol: 'NQ', action: 'SELL' },
    { id: '3', date: new Date(2024, 10, 4), pnl: 1240, symbol: 'ES', action: 'BUY' },
    { id: '4', date: new Date(2024, 10, 5), pnl: 620, symbol: 'NQ', action: 'BUY' },
    { id: '5', date: new Date(2024, 10, 6), pnl: -450, symbol: 'ES', action: 'SELL' },
    { id: '6', date: new Date(2024, 10, 7), pnl: 890, symbol: 'NQ', action: 'BUY' },
    { id: '7', date: new Date(2024, 10, 8), pnl: 1150, symbol: 'ES', action: 'BUY' },
    { id: '8', date: new Date(2024, 10, 11), pnl: -230, symbol: 'NQ', action: 'SELL' },
    { id: '9', date: new Date(2024, 10, 12), pnl: 740, symbol: 'ES', action: 'BUY' },
    { id: '10', date: new Date(2024, 10, 13), pnl: 520, symbol: 'NQ', action: 'BUY' },
    { id: '11', date: new Date(2024, 10, 14), pnl: -680, symbol: 'ES', action: 'SELL' },
    { id: '12', date: new Date(2024, 10, 15), pnl: 1420, symbol: 'NQ', action: 'BUY' },
    { id: '13', date: new Date(2024, 10, 18), pnl: 960, symbol: 'ES', action: 'BUY' },
    { id: '14', date: new Date(2024, 10, 19), pnl: -310, symbol: 'NQ', action: 'SELL' },
    { id: '15', date: new Date(2024, 10, 20), pnl: 1100, symbol: 'ES', action: 'BUY' },
    { id: '16', date: new Date(2024, 10, 21), pnl: 780, symbol: 'NQ', action: 'BUY' },
    { id: '17', date: new Date(2024, 10, 22), pnl: -540, symbol: 'ES', action: 'SELL' },
    { id: '18', date: new Date(2024, 10, 25), pnl: 1340, symbol: 'NQ', action: 'BUY' },
    { id: '19', date: new Date(2024, 10, 26), pnl: 920, symbol: 'ES', action: 'BUY' },
    { id: '20', date: new Date(2024, 10, 27), pnl: -420, symbol: 'NQ', action: 'SELL' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Trading Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View P&L by day, week, and month
          </p>
        </div>
        <Button variant="outline" data-testid="button-export">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <TradeCalendar trades={mockTrades} />
    </div>
  );
}
