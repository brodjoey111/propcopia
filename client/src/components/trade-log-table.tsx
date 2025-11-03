import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface TradeLogEntry {
  id: string;
  timestamp: string;
  masterAccount: string;
  symbol: string;
  action: "BUY" | "SELL" | "CLOSE";
  quantity: number;
  price: number;
  followersExecuted: number;
  followersTotal: number;
  status: "success" | "failed" | "pending";
}

interface TradeLogTableProps {
  trades: TradeLogEntry[];
}

export function TradeLogTable({ trades }: TradeLogTableProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "success":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "BUY":
        return "text-chart-2";
      case "SELL":
        return "text-destructive";
      default:
        return "text-foreground";
    }
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Timestamp</TableHead>
              <TableHead>Master Account</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Followers</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No trades recorded yet
                </TableCell>
              </TableRow>
            ) : (
              trades.map((trade) => (
                <TableRow key={trade.id} data-testid={`row-trade-${trade.id}`}>
                  <TableCell className="font-mono text-xs" data-testid={`text-timestamp-${trade.id}`}>
                    {trade.timestamp}
                  </TableCell>
                  <TableCell className="text-sm">{trade.masterAccount}</TableCell>
                  <TableCell className="font-medium">{trade.symbol}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${getActionColor(trade.action)}`}>
                      {trade.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {trade.quantity}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    ${trade.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {trade.followersExecuted}/{trade.followersTotal}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(trade.status)} data-testid={`badge-status-${trade.id}`}>
                      {trade.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
