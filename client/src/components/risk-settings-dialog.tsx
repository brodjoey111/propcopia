import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Sliders,
  TrendingDown,
  Filter,
  Clock,
  AlertTriangle,
  Plus,
  X,
  Globe,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RiskSettings {
  // Risk mode (accounts only)
  riskMode?: "global" | "custom";
  // Position limits
  positionScaling: number;
  maxContracts: number | null;
  maxOpenPositions: number | null;
  allowedDirections: "both" | "long_only" | "short_only";
  // Loss limits
  maxDailyLoss: number | null;
  maxDailyLossPct: number | null;
  maxWeeklyLoss: number | null;
  maxWeeklyLossPct: number | null;
  maxDrawdownPct: number | null;
  maxConsecutiveLosses: number | null;
  // Trade filters
  blockedTickers: string[];
  allowedTickers: string[];
  maxTradesPerDay: number | null;
  minAccountBalance: number | null;
  // Schedule
  tradingStartTime: string | null;
  tradingEndTime: string | null;
  tradingDays: string[];
  cooldownAfterLoss: number | null;
  // Breach action
  onBreachAction: "pause" | "alert" | "close_and_pause";
}

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  riskMode: "custom",
  positionScaling: 100,
  maxContracts: null,
  maxOpenPositions: null,
  allowedDirections: "both",
  maxDailyLoss: null,
  maxDailyLossPct: null,
  maxWeeklyLoss: null,
  maxWeeklyLossPct: null,
  maxDrawdownPct: null,
  maxConsecutiveLosses: null,
  blockedTickers: [],
  allowedTickers: [],
  maxTradesPerDay: null,
  minAccountBalance: null,
  tradingStartTime: null,
  tradingEndTime: null,
  tradingDays: ["mon", "tue", "wed", "thu", "fri"],
  cooldownAfterLoss: null,
  onBreachAction: "pause",
};

const DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function numOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function intOrNull(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function fmt(v: number | null | undefined): string {
  return v != null ? String(v) : "";
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 pt-1">
      {children}
    </p>
  );
}

// ─── Ticker badge list ────────────────────────────────────────────────────────

function TickerList({
  tickers,
  disabled,
  onRemove,
}: {
  tickers: string[];
  disabled?: boolean;
  onRemove: (t: string) => void;
}) {
  if (!tickers.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {tickers.map((t) => (
        <Badge key={t} variant="secondary" className="gap-1 pr-1 h-6 text-xs">
          {t}
          {!disabled && (
            <button
              type="button"
              onClick={() => onRemove(t)}
              className="ml-0.5 text-muted-foreground hover:text-foreground rounded-sm"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
    </div>
  );
}

function TickerInput({
  value,
  onChange,
  onAdd,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex gap-2">
      <Input
        className="h-8 text-sm"
        placeholder={placeholder ?? "e.g. ES, NQ, YM"}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
        disabled={disabled}
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-8 w-8 shrink-0"
        onClick={onAdd}
        disabled={!value.trim() || disabled}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

interface RiskSettingsDialogProps {
  /** Name shown in the header */
  name: string;
  /** Whether this is an account (shows riskMode toggle) or a group */
  kind: "account" | "group";
  /** Current settings */
  settings: Partial<RiskSettings>;
  /** Global defaults to preview when riskMode === 'global' */
  globalSettings?: Partial<RiskSettings>;
  /** Called when user saves */
  onSave: (settings: RiskSettings) => void;
  /** Trigger element (omit for controlled mode) */
  children?: React.ReactNode;
  /** Controlled open state (use without children) */
  open?: boolean;
  /** Controlled open-change handler */
  onOpenChange?: (open: boolean) => void;
}

export function RiskSettingsDialog({
  name,
  kind,
  settings,
  globalSettings,
  onSave,
  children,
  open: controlledOpen,
  onOpenChange: onControlledOpenChange,
}: RiskSettingsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onControlledOpenChange?.(v);
  };
  const [s, setS] = useState<RiskSettings>({ ...DEFAULT_RISK_SETTINGS });

  // ticker input states
  const [blockedInput, setBlockedInput] = useState("");
  const [allowedInput, setAllowedInput] = useState("");
  const [activeTab, setActiveTab] = useState("position");

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) return;
    setS({
      ...DEFAULT_RISK_SETTINGS,
      ...settings,
      blockedTickers: settings.blockedTickers ?? [],
      allowedTickers: settings.allowedTickers ?? [],
      tradingDays: settings.tradingDays?.length
        ? settings.tradingDays
        : ["mon", "tue", "wed", "thu", "fri"],
    });
    setBlockedInput("");
    setAllowedInput("");
    setActiveTab("position");
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const isGlobal = kind === "account" && s.riskMode === "global";
  const effective = isGlobal
    ? { ...DEFAULT_RISK_SETTINGS, ...globalSettings }
    : s;

  function merge(patch: Partial<RiskSettings>) {
    setS((prev) => ({ ...prev, ...patch }));
  }

  // ── Ticker helpers ───────────────────────────────────────────────────

  function addBlocked() {
    const t = blockedInput.trim().toUpperCase();
    if (t && !s.blockedTickers.includes(t)) {
      merge({ blockedTickers: [...s.blockedTickers, t] });
    }
    setBlockedInput("");
  }
  function removeBlocked(t: string) {
    merge({ blockedTickers: s.blockedTickers.filter((x) => x !== t) });
  }
  function addAllowed() {
    const t = allowedInput.trim().toUpperCase();
    if (t && !s.allowedTickers.includes(t)) {
      merge({ allowedTickers: [...s.allowedTickers, t] });
    }
    setAllowedInput("");
  }
  function removeAllowed(t: string) {
    merge({ allowedTickers: s.allowedTickers.filter((x) => x !== t) });
  }

  function toggleDay(day: string) {
    if (isGlobal) return;
    const curr = s.tradingDays;
    merge({
      tradingDays: curr.includes(day)
        ? curr.filter((d) => d !== day)
        : [...curr, day],
    });
  }

  function handleSave() {
    onSave(s);
    setOpen(false);
  }

  // ── Active limits count per tab ──────────────────────────────────────

  function countPosition() {
    let n = 0;
    if (isGlobal) return 0;
    if (s.positionScaling !== 100) n++;
    if (s.maxContracts) n++;
    if (s.maxOpenPositions) n++;
    if (s.allowedDirections !== "both") n++;
    return n;
  }
  function countLoss() {
    if (isGlobal) return 0;
    return [
      s.maxDailyLoss,
      s.maxDailyLossPct,
      s.maxWeeklyLoss,
      s.maxWeeklyLossPct,
      s.maxDrawdownPct,
      s.maxConsecutiveLosses,
    ].filter(Boolean).length;
  }
  function countFilters() {
    if (isGlobal) return 0;
    let n = s.blockedTickers.length + s.allowedTickers.length;
    if (s.maxTradesPerDay) n++;
    if (s.minAccountBalance) n++;
    return n;
  }
  function countSchedule() {
    if (isGlobal) return 0;
    let n = 0;
    if (s.tradingStartTime || s.tradingEndTime) n++;
    if (s.tradingDays.length !== 5 || s.tradingDays.includes("sat") || s.tradingDays.includes("sun")) n++;
    if (s.cooldownAfterLoss) n++;
    return n;
  }

  function TabBadge({ count }: { count: number }) {
    if (!count) return null;
    return (
      <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-semibold text-primary">
        {count}
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Risk Settings</DialogTitle>
              <DialogDescription className="text-xs">
                {kind === "account" ? "Account" : "Group"}: {name}
              </DialogDescription>
            </div>
          </div>

          {/* ── Risk mode toggle (accounts only) ── */}
          {kind === "account" && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <RadioGroup
                value={s.riskMode}
                onValueChange={(v) => merge({ riskMode: v as "global" | "custom" })}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="global" id="rm-global" />
                  <Label htmlFor="rm-global" className="flex items-center gap-1.5 cursor-pointer font-normal text-sm">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    Use global defaults
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="rm-custom" />
                  <Label htmlFor="rm-custom" className="flex items-center gap-1.5 cursor-pointer font-normal text-sm">
                    <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
                    Custom settings
                  </Label>
                </div>
              </RadioGroup>
              {isGlobal && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {(globalSettings?.positionScaling ?? 100)}% scaling
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        {/* ── Tabs ── */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden mt-4"
        >
          <TabsList className="mx-6 shrink-0 h-9 grid grid-cols-5">
            <TabsTrigger value="position" className="text-xs px-2">
              <Sliders className="h-3.5 w-3.5 mr-1" />
              Position
              <TabBadge count={countPosition()} />
            </TabsTrigger>
            <TabsTrigger value="losses" className="text-xs px-2">
              <TrendingDown className="h-3.5 w-3.5 mr-1" />
              Losses
              <TabBadge count={countLoss()} />
            </TabsTrigger>
            <TabsTrigger value="filters" className="text-xs px-2">
              <Filter className="h-3.5 w-3.5 mr-1" />
              Filters
              <TabBadge count={countFilters()} />
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs px-2">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Schedule
              <TabBadge count={countSchedule()} />
            </TabsTrigger>
            <TabsTrigger value="breach" className="text-xs px-2">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Breach
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 pb-4 pt-4">

            {/* ════════════════════════════ POSITION ════════════════════════════ */}
            <TabsContent value="position" className="mt-0 space-y-5">
              {/* Scaling */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Position Scaling</Label>
                  <span className="text-sm font-semibold tabular-nums text-primary">
                    {isGlobal ? effective.positionScaling : s.positionScaling}%
                  </span>
                </div>
                <Slider
                  min={10} max={200} step={5}
                  value={[isGlobal ? (effective.positionScaling ?? 100) : s.positionScaling]}
                  onValueChange={([v]) => merge({ positionScaling: v })}
                  disabled={isGlobal}
                />
                <p className="text-xs text-muted-foreground">
                  Scale copied trade sizes relative to the master (10% = quarter size, 200% = double size).
                </p>
              </div>

              <Separator />

              {/* Max contracts per trade */}
              <div className="space-y-1.5">
                <Label className="text-sm">Max Contracts per Trade</Label>
                <Input
                  className="h-8 text-sm"
                  type="number" min="1" placeholder="No limit"
                  value={isGlobal ? fmt(effective.maxContracts) : fmt(s.maxContracts)}
                  onChange={(e) => merge({ maxContracts: intOrNull(e.target.value) })}
                  disabled={isGlobal}
                />
                <p className="text-xs text-muted-foreground">
                  Hard cap on contracts per single trade. Trades above this limit are rejected.
                </p>
              </div>

              {/* Max simultaneous open positions */}
              <div className="space-y-1.5">
                <Label className="text-sm">Max Open Positions</Label>
                <Input
                  className="h-8 text-sm"
                  type="number" min="1" placeholder="No limit"
                  value={isGlobal ? fmt(effective.maxOpenPositions) : fmt(s.maxOpenPositions)}
                  onChange={(e) => merge({ maxOpenPositions: intOrNull(e.target.value) })}
                  disabled={isGlobal}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of positions allowed open at the same time on this account.
                </p>
              </div>

              <Separator />

              {/* Trade direction */}
              <div className="space-y-2">
                <Label className="text-sm">Allowed Trade Directions</Label>
                <RadioGroup
                  value={isGlobal ? (effective.allowedDirections ?? "both") : s.allowedDirections}
                  onValueChange={(v) => merge({ allowedDirections: v as RiskSettings["allowedDirections"] })}
                  disabled={isGlobal}
                  className="grid grid-cols-3 gap-2"
                >
                  {(
                    [
                      { value: "both", label: "Both", icon: ArrowLeftRight },
                      { value: "long_only", label: "Long Only", icon: ArrowUpRight },
                      { value: "short_only", label: "Short Only", icon: ArrowDownRight },
                    ] as const
                  ).map(({ value, label, icon: Icon }) => (
                    <label
                      key={value}
                      htmlFor={`dir-${value}`}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-3 cursor-pointer transition-all select-none ${
                        (isGlobal ? effective.allowedDirections : s.allowedDirections) === value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      } ${isGlobal ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <RadioGroupItem value={value} id={`dir-${value}`} className="sr-only" />
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">{label}</span>
                    </label>
                  ))}
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  Block long or short trades. Useful for prop firm rules or directional bias.
                </p>
              </div>
            </TabsContent>

            {/* ════════════════════════════ LOSSES ═════════════════════════════ */}
            <TabsContent value="losses" className="mt-0 space-y-5">
              <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                <strong>Auto-pause triggers.</strong> When any limit is hit, the configured breach action fires (see Breach tab). Leave blank to disable.
              </div>

              <SectionLabel>Daily</SectionLabel>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Daily Loss ($)</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      className="h-8 text-sm pl-6"
                      type="number" min="0" placeholder="No limit"
                      value={fmt(s.maxDailyLoss)}
                      onChange={(e) => merge({ maxDailyLoss: numOrNull(e.target.value) })}
                      disabled={isGlobal}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Daily Loss (%)</Label>
                  <div className="relative">
                    <Input
                      className="h-8 text-sm pr-6"
                      type="number" min="0" max="100" step="0.5" placeholder="No limit"
                      value={fmt(s.maxDailyLossPct)}
                      onChange={(e) => merge({ maxDailyLossPct: numOrNull(e.target.value) })}
                      disabled={isGlobal}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-3">
                Either limit triggers. % is calculated on the account's starting balance for the day.
              </p>

              <Separator />
              <SectionLabel>Weekly</SectionLabel>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Weekly Loss ($)</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      className="h-8 text-sm pl-6"
                      type="number" min="0" placeholder="No limit"
                      value={fmt(s.maxWeeklyLoss)}
                      onChange={(e) => merge({ maxWeeklyLoss: numOrNull(e.target.value) })}
                      disabled={isGlobal}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Weekly Loss (%)</Label>
                  <div className="relative">
                    <Input
                      className="h-8 text-sm pr-6"
                      type="number" min="0" max="100" step="0.5" placeholder="No limit"
                      value={fmt(s.maxWeeklyLossPct)}
                      onChange={(e) => merge({ maxWeeklyLossPct: numOrNull(e.target.value) })}
                      disabled={isGlobal}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                </div>
              </div>

              <Separator />
              <SectionLabel>Drawdown &amp; Streaks</SectionLabel>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Drawdown from Peak (%)</Label>
                  <div className="relative">
                    <Input
                      className="h-8 text-sm pr-6"
                      type="number" min="0" max="100" step="0.5" placeholder="No limit"
                      value={fmt(s.maxDrawdownPct)}
                      onChange={(e) => merge({ maxDrawdownPct: numOrNull(e.target.value) })}
                      disabled={isGlobal}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Trailing peak-to-trough limit.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Consecutive Losses</Label>
                  <Input
                    className="h-8 text-sm"
                    type="number" min="1" placeholder="No limit"
                    value={fmt(s.maxConsecutiveLosses)}
                    onChange={(e) => merge({ maxConsecutiveLosses: intOrNull(e.target.value) })}
                    disabled={isGlobal}
                  />
                  <p className="text-xs text-muted-foreground">Pause after N losses in a row.</p>
                </div>
              </div>
            </TabsContent>

            {/* ════════════════════════════ FILTERS ════════════════════════════ */}
            <TabsContent value="filters" className="mt-0 space-y-5">

              <SectionLabel>Symbol Blacklist</SectionLabel>
              <div className="space-y-1.5">
                <Label className="text-xs">Blocked Tickers</Label>
                <TickerInput
                  value={blockedInput}
                  onChange={setBlockedInput}
                  onAdd={addBlocked}
                  disabled={isGlobal}
                  placeholder="e.g. ES, NQ — trades skipped"
                />
                <TickerList
                  tickers={isGlobal ? (effective.blockedTickers ?? []) : s.blockedTickers}
                  disabled={isGlobal}
                  onRemove={removeBlocked}
                />
                <p className="text-xs text-muted-foreground pt-0.5">
                  Any trade in these symbols will be skipped entirely.
                </p>
              </div>

              <Separator />
              <SectionLabel>Symbol Whitelist</SectionLabel>
              <div className="space-y-1.5">
                <Label className="text-xs">Allowed Tickers Only</Label>
                <TickerInput
                  value={allowedInput}
                  onChange={setAllowedInput}
                  onAdd={addAllowed}
                  disabled={isGlobal}
                  placeholder="e.g. ES, NQ — only these copied"
                />
                <TickerList
                  tickers={isGlobal ? (effective.allowedTickers ?? []) : s.allowedTickers}
                  disabled={isGlobal}
                  onRemove={removeAllowed}
                />
                <p className="text-xs text-muted-foreground pt-0.5">
                  When set, <em>only</em> trades in these symbols are copied. Overrides the blacklist.
                </p>
              </div>

              <Separator />
              <SectionLabel>Volume &amp; Balance</SectionLabel>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Trades per Day</Label>
                  <Input
                    className="h-8 text-sm"
                    type="number" min="1" placeholder="No limit"
                    value={fmt(s.maxTradesPerDay)}
                    onChange={(e) => merge({ maxTradesPerDay: intOrNull(e.target.value) })}
                    disabled={isGlobal}
                  />
                  <p className="text-xs text-muted-foreground">Stops copying after N trades today.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Min Account Balance ($)</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input
                      className="h-8 text-sm pl-6"
                      type="number" min="0" placeholder="No limit"
                      value={fmt(s.minAccountBalance)}
                      onChange={(e) => merge({ minAccountBalance: numOrNull(e.target.value) })}
                      disabled={isGlobal}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Skip trades if balance drops below this.</p>
                </div>
              </div>
            </TabsContent>

            {/* ════════════════════════════ SCHEDULE ═══════════════════════════ */}
            <TabsContent value="schedule" className="mt-0 space-y-5">

              <SectionLabel>Trading Hours (UTC)</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Market Open Time</Label>
                  <Input
                    className="h-8 text-sm"
                    type="time"
                    value={s.tradingStartTime ?? ""}
                    onChange={(e) => merge({ tradingStartTime: e.target.value || null })}
                    disabled={isGlobal}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Market Close Time</Label>
                  <Input
                    className="h-8 text-sm"
                    type="time"
                    value={s.tradingEndTime ?? ""}
                    onChange={(e) => merge({ tradingEndTime: e.target.value || null })}
                    disabled={isGlobal}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-3">
                Trades arriving outside this window are queued or dropped. Leave blank for 24h copying.
              </p>

              <Separator />
              <SectionLabel>Active Trading Days</SectionLabel>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map(({ value, label }) => {
                  const active = (isGlobal ? (effective.tradingDays ?? []) : s.tradingDays).includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleDay(value)}
                      disabled={isGlobal}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all select-none ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      } ${isGlobal ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground -mt-3">
                No trades will be copied on days that aren't highlighted.
              </p>

              <Separator />
              <SectionLabel>Recovery</SectionLabel>
              <div className="space-y-1.5">
                <Label className="text-xs">Cooldown After Loss (minutes)</Label>
                <Input
                  className="h-8 text-sm"
                  type="number" min="1" max="1440" placeholder="No cooldown"
                  value={fmt(s.cooldownAfterLoss)}
                  onChange={(e) => merge({ cooldownAfterLoss: intOrNull(e.target.value) })}
                  disabled={isGlobal}
                />
                <p className="text-xs text-muted-foreground">
                  After any losing trade, pause copying for this many minutes before resuming.
                </p>
              </div>
            </TabsContent>

            {/* ════════════════════════════ BREACH ═════════════════════════════ */}
            <TabsContent value="breach" className="mt-0 space-y-5">
              <div className="rounded-md border border-blue-500/25 bg-blue-500/5 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-400">
                This determines what happens when any loss limit, drawdown limit, or consecutive-loss limit is reached.
              </div>

              <SectionLabel>Action on Limit Breach</SectionLabel>
              <RadioGroup
                value={s.onBreachAction}
                onValueChange={(v) => merge({ onBreachAction: v as RiskSettings["onBreachAction"] })}
                className="space-y-3"
              >
                {(
                  [
                    {
                      value: "pause",
                      title: "Pause Copying",
                      desc: "Stop copying new trades. Existing positions stay open. You can manually resume.",
                      color: "amber",
                    },
                    {
                      value: "alert",
                      title: "Alert Only",
                      desc: "Continue copying but send an in-app notification. No automatic action taken.",
                      color: "blue",
                    },
                    {
                      value: "close_and_pause",
                      title: "Close Positions & Pause",
                      desc: "Immediately send exit-position requests to close all open positions, then pause copying. Most aggressive option.",
                      color: "red",
                    },
                  ] as const
                ).map(({ value, title, desc, color }) => (
                  <label
                    key={value}
                    htmlFor={`breach-${value}`}
                    className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
                      s.onBreachAction === value
                        ? `border-${color}-500/40 bg-${color}-500/5`
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <RadioGroupItem value={value} id={`breach-${value}`} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </TabsContent>

          </div>
        </Tabs>

        {/* ── Footer ── */}
        <div className="flex justify-between items-center border-t px-6 py-3 shrink-0">
          <p className="text-xs text-muted-foreground">
            {isGlobal
              ? "Showing global defaults — switch to Custom to override."
              : "Custom settings active for this " + kind + "."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
