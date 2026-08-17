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
  buildTradeJourneyRows,
  buildTradeHistoryQueryString,
  buildTradeLifecycleStageCards,
  describeTradeLifecycleOverview,
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
  const lifecycleOverview = describeTradeLifecycleOverview(records);
  const lifecycleStageCards = buildTradeLifecycleStageCards(records);
  const journeyRows = buildTradeJourneyRows(records, 5);
  const reviewedExecutionCount = rows.filter((row) => row.detail.reviewStatus === "reviewed").length;
  const ownedExecutionCount = rows.filter((row) => !!row.detail.operatorName).length;
  const reassignedExecutionCount = rows.filter(
    (row) => (row.detail.operatorHistory?.length ?? 0) > 1,
  ).length;

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
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Execution Journey</p>
            <h2 className="mt-2 text-lg font-semibold text-white">{lifecycleOverview.headline}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{lifecycleOverview.detail}</p>
          </div>
          <Badge
            variant="outline"
            className={
              lifecycleOverview.tone === "danger"
                ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                : lifecycleOverview.tone === "warn"
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                  : lifecycleOverview.tone === "ok"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-white/10 bg-white/[0.04] text-zinc-300"
            }
          >
            {lifecycleOverview.tone === "danger"
              ? "Needs attention"
              : lifecycleOverview.tone === "warn"
                ? "In progress"
                : lifecycleOverview.tone === "ok"
                  ? "Healthy"
                  : "Waiting"}
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {lifecycleStageCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{card.label}</p>
              <p
                className={`mt-2 text-2xl font-semibold ${
                  card.tone === "danger"
                    ? "text-rose-300"
                    : card.tone === "warn"
                      ? "text-amber-300"
                      : card.tone === "ok"
                        ? "text-emerald-300"
                        : "text-zinc-300"
                }`}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Recent Hand-offs</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The latest follower orders, their current stage, and the next step we are waiting on.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {journeyRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-muted-foreground xl:col-span-2">
                Recent execution hand-offs will appear here once order lifecycle records are available.
              </div>
            ) : (
              journeyRows.map((row) => (
                <div key={row.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{row.symbol}</p>
                      <p className="mt-1 text-sm text-slate-300">{row.accountLabel}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        row.tone === "danger"
                          ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                          : row.tone === "warn"
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      }
                    >
                      {row.executionSummary.headline}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-white">{row.executionSummary.detail}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Updated {row.updatedAtLabel}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

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
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Shared operator audit
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100">
                    Reviewed {reviewedExecutionCount}
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-100">
                    Owned {ownedExecutionCount}
                  </span>
                  <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-violet-100">
                    Reassigned {reassignedExecutionCount}
                  </span>
                </div>
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
                                    {row.detail.riskDecisionFingerprint ? (
                                      <>
                                        <p><span className="text-muted-foreground">Risk Check:</span> Verified</p>
                                        <p className="break-all"><span className="text-muted-foreground">Risk Evidence:</span> {row.detail.riskDecisionFingerprint}</p>
                                        <p><span className="text-muted-foreground">Rule Set:</span> {row.detail.riskRuleVersion ?? "Recorded"}</p>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Current State</p>
                                  <p className="mt-2 text-sm text-white">{row.executionSummary.headline}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{row.executionSummary.detail}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Stage Flow</p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {row.detail.stageFlow.map((stage) => (
                                      <div
                                        key={`${row.id}-${stage.key}`}
                                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                                          stage.state === "done"
                                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                                            : stage.state === "active"
                                              ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                                              : "border-white/10 bg-white/[0.03] text-zinc-400"
                                        }`}
                                      >
                                        {stage.label}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Fill Progress</p>
                                  <div className="mt-2 space-y-2 text-sm text-slate-300">
                                    <p><span className="text-muted-foreground">Requested:</span> {row.detail.requestedQuantityLabel}</p>
                                    <p><span className="text-muted-foreground">Filled:</span> {row.detail.filledQuantityLabel}</p>
                                    <p><span className="text-muted-foreground">Remaining:</span> {row.detail.remainingQuantityLabel}</p>
                                    <p><span className="text-muted-foreground">Progress:</span> {row.detail.progressLabel}</p>
                                    <p><span className="text-muted-foreground">Fill count:</span> {row.detail.fillCountLabel}</p>
                                  </div>
                                </div>
                                {row.detail.reviewStatus === "reviewed" ? (
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Review Note</p>
                                    <div className="mt-2 space-y-2 text-sm text-slate-300">
                                      <p>
                                        <span className="text-muted-foreground">Status:</span> Reviewed
                                      </p>
                                      <p>
                                        <span className="text-muted-foreground">Reviewed:</span>{" "}
                                        {row.detail.reviewedAt
                                          ? new Date(row.detail.reviewedAt).toLocaleString()
                                          : "Recently"}
                                      </p>
                                      <p>
                                        <span className="text-muted-foreground">Note:</span>{" "}
                                        {row.detail.reviewNote ?? "No note captured"}
                                      </p>
                                    </div>
                                  </div>
                                ) : null}
                                {row.detail.operatorName || (row.detail.operatorHistory?.length ?? 0) > 0 ? (
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Operator Audit</p>
                                    <div className="mt-2 space-y-2 text-sm text-slate-300">
                                      <p>
                                        <span className="text-muted-foreground">Operator owner:</span>{" "}
                                        {row.detail.operatorName ?? "Unassigned"}
                                      </p>
                                      {(row.detail.operatorHistory?.length ?? 0) > 1 ? (
                                        <p>
                                          <span className="text-muted-foreground">Ownership changes:</span>{" "}
                                          {(row.detail.operatorHistory?.length ?? 0) - 1}
                                        </p>
                                      ) : null}
                                      {row.detail.operatorHistory?.[row.detail.operatorHistory.length - 1]?.reason ? (
                                        <p>
                                          <span className="text-muted-foreground">Latest ownership reason:</span>{" "}
                                          {row.detail.operatorHistory[row.detail.operatorHistory.length - 1]?.reason}
                                        </p>
                                      ) : null}
                                    </div>
                                    {(row.detail.operatorHistory?.length ?? 0) > 0 ? (
                                      <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 p-3">
                                        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                                          Ownership Timeline
                                        </p>
                                        <div className="mt-2 space-y-2">
                                          {row.detail.operatorHistory?.slice().reverse().map((assignment, index) => (
                                            <div
                                              key={`${row.id}-assignment-${index}`}
                                              className="border-l border-white/10 pl-3 text-xs text-slate-300"
                                            >
                                              <p className="text-white/80">
                                                {assignment.operatorName} on {new Date(assignment.assignedAt).toLocaleString()}.
                                              </p>
                                              {assignment.reason ? (
                                                <p className="mt-1 text-muted-foreground">{assignment.reason}</p>
                                              ) : null}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
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
