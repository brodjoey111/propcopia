import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildTradeHistoryQueryString,
  summarizeTradeHistoryBySymbol,
  summarizeTradeHistory,
  toTradeHistoryRows,
  type TradeHistoryResponse,
} from "@/lib/trade-history";
import { getQueryFn } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";

export default function Trades() {
  const [statusFilter, setStatusFilter] = useState<"all" | "filled" | "pending" | "failed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const queryString = buildTradeHistoryQueryString({
    status: statusFilter,
    query: searchQuery,
    limit: 250,
  });

  const { data, isLoading, error } = useQuery<TradeHistoryResponse>({
    queryKey: [`/api/trades/history${queryString}`],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 15000,
    refetchInterval: 15000,
  });

  const records = data?.records ?? [];
  const rows = toTradeHistoryRows(records);
  const summary = summarizeTradeHistory(records);
  const topSymbols = summarizeTradeHistoryBySymbol(records, 4);

  const summaryCards = [
    {
      label: "Filled",
      value: summary.filled,
      icon: CheckCircle2,
      tone: "text-emerald-300",
    },
    {
      label: "Pending",
      value: summary.pending,
      icon: Clock3,
      tone: "text-sky-300",
    },
    {
      label: "Failed",
      value: summary.failed,
      icon: AlertCircle,
      tone: "text-rose-300",
    },
    {
      label: "Skipped / Rejected",
      value: summary.skippedOrRejected,
      icon: ShieldAlert,
      tone: "text-amber-300",
    },
  ] as const;

  const getBadgeVariant = (tone: string) => {
    switch (tone) {
      case "success":
        return "default" as const;
      case "failed":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  const handleExport = () => {
    window.location.assign(`/api/trades/history/export.csv${queryString}`);
  };

  const filterButtons = [
    { id: "all", label: "All" },
    { id: "filled", label: "Filled" },
    { id: "pending", label: "Pending" },
    { id: "failed", label: "Failed / Skipped" },
  ] as const;

  const toggleExpandedRow = (rowId: string) => {
    setExpandedRowId((current) => (current === rowId ? null : rowId));
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Trade history</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Execution Timeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live follower execution truth across queued, sent, acknowledged, filled, and failed states.
          </p>
        </div>
        <Button variant="outline" data-testid="button-export" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {card.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white" data-testid={`summary-${card.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                    {card.value}
                  </p>
                </div>
                <Icon className={`h-5 w-5 ${card.tone}`} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="border-white/10 bg-slate-950/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Top Symbols</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Where execution activity is concentrated</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {topSymbols.length === 0 ? "No symbol activity yet" : `${topSymbols.length} symbols in view`}
          </p>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-4">
          {topSymbols.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-muted-foreground xl:col-span-4">
              Symbol summaries will appear once live execution records are captured.
            </div>
          ) : (
            topSymbols.map((symbol) => (
              <div key={symbol.symbol} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-start justify-between">
                  <p className="text-lg font-semibold text-white">{symbol.symbol}</p>
                  <p className="font-mono text-xs text-slate-400">{symbol.total} total</p>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Filled</p>
                    <p className="mt-1 text-emerald-300">{symbol.filled}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pending</p>
                    <p className="mt-1 text-sky-300">{symbol.pending}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Failed</p>
                    <p className="mt-1 text-rose-300">{symbol.failed}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="border-white/10 bg-slate-950/60">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Recent Execution Records</h2>
                <p className="text-sm text-muted-foreground">
                  {summary.total === 0
                    ? "No live execution records yet."
                    : `Showing ${summary.total} recent lifecycle records from the server history store.`}
                </p>
              </div>
              {error ? (
                <p className="text-sm text-rose-300">
                  Unable to load trade history right now.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {filterButtons.map((filter) => (
                  <Button
                    key={filter.id}
                    variant={statusFilter === filter.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(filter.id)}
                    data-testid={`filter-${filter.id}`}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>

              <div className="w-full lg:max-w-sm">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search symbol, account, fill ID, or error"
                  data-testid="input-trade-search"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead className="w-[56px]">View</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Master</TableHead>
                <TableHead>Follower</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Avg Fill</TableHead>
                <TableHead>Error / Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index} className="border-white/10">
                    <TableCell colSpan={10} className="h-16 text-sm text-muted-foreground">
                      Loading execution history...
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow className="border-white/10">
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No follower execution records have been captured yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const expanded = expandedRowId === row.id;
                  return (
                    <>
                      <TableRow key={row.id} className="border-white/10">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleExpandedRow(row.id)}
                            aria-label={expanded ? "Collapse execution details" : "Expand execution details"}
                            data-testid={`button-expand-${row.id}`}
                          >
                            {expanded ? <ChevronDown /> : <ChevronRight />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-300">
                          {row.timestampLabel}
                        </TableCell>
                        <TableCell className="text-sm text-white">{row.masterAccountLabel}</TableCell>
                        <TableCell className="text-sm text-slate-300">{row.followerAccountLabel}</TableCell>
                        <TableCell className="font-semibold text-white">{row.symbol}</TableCell>
                        <TableCell className="text-slate-300">{row.sideLabel}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-slate-200">
                          {row.quantityLabel}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(row.statusTone)}>
                            {row.statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-slate-200">
                          {row.priceLabel}
                        </TableCell>
                        <TableCell className="max-w-[260px] text-sm text-muted-foreground">
                          {row.errorLabel ?? "None"}
                        </TableCell>
                      </TableRow>
                      {expanded ? (
                        <TableRow key={`${row.id}-detail`} className="border-white/10 bg-white/[0.015]">
                          <TableCell colSpan={10} className="px-6 py-5">
                            <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Identifiers</p>
                                  <div className="mt-2 space-y-2 text-sm text-slate-300">
                                    <p><span className="text-muted-foreground">Intent:</span> {row.detail.intentId ?? "Not created"}</p>
                                    <p><span className="text-muted-foreground">Master Fill:</span> {row.detail.masterFillId}</p>
                                    <p><span className="text-muted-foreground">Broker Order:</span> {row.detail.brokerOrderId ?? "Pending"}</p>
                                    <p><span className="text-muted-foreground">Follower Fill:</span> {row.detail.fillId ?? "Pending"}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Current State</p>
                                  <p className="mt-2 text-sm text-white">{row.statusLabel}</p>
                                </div>
                              </div>

                              <div>
                                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Event Timeline</p>
                                <div className="mt-3 space-y-3">
                                  {row.events.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No timeline events captured for this record yet.</p>
                                  ) : (
                                    row.events.map((event, index) => (
                                      <div key={`${row.id}-${event.type}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                          <p className="font-medium text-white">{event.message}</p>
                                          <p className="font-mono text-xs text-slate-400">{event.timestampLabel}</p>
                                        </div>
                                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                          {event.type}
                                        </p>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
