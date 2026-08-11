import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GripVertical,
  History,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  PlugZap,
  Unplug,
  Sparkles,
  Power,
  Crown,
  Layers,
  Inbox,
  ShieldAlert,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { RiskSettingsDialog, type RiskSettings, DEFAULT_RISK_SETTINGS } from "@/components/risk-settings-dialog";
import { useUser } from "@/contexts/user-context";
import { useToast } from "@/hooks/use-toast";
import {
  describeGroupRiskSummary,
  summarizeGroupRisk,
  toAccountRiskBadgeView,
  type AccountRiskItem,
} from "@/lib/account-risk";
import type {
  CopyGroupActivity,
  CopyGroupRuntimeSummary,
  CopyGroupSnapshotApiResponse,
  CopyGroupStatus,
} from "@/lib/copy-groups";
import {
  buildCopyGroupActivityTimeline,
  describeCopyGroupBoardState,
} from "@/lib/copy-groups";
import {
  buildCopyGroupSyncPlan,
  hydrateBoardStateFromSnapshot,
} from "@/lib/copy-group-persistence";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Account } from "@shared/schema";

// ─── Demo data ───────────────────────────────────────────────────────────────

const NULL_FIELDS = {
  userId: "demo",
  tradovateUsername: null,
  tradovateAccountId: null,
  tradovateEnvironment: null,
  tradeifyUsername: null,
  tradeifyAccountId: null,
  tradeifyApiKey: null,
  rithmicUsername: null,
  rithmicAccountId: null,
  rithmicPassword: null,
  rithmicEnvironment: null,
  rithmicSystemName: null,
  rithmicExchange: null,
  apiKey: null,
  apiSecret: null,
  copySizingMode: "MULTIPLIER",
  fixedQuantity: null,
  reverseCopying: false,
  maxContracts: null,
  blockedTickers: null,
  maxOpenPositions: null,
  allowedDirections: null,
  maxDailyLoss: null,
  maxDailyLossPct: null,
  maxWeeklyLoss: null,
  maxWeeklyLossPct: null,
  maxDrawdownPct: null,
  maxConsecutiveLosses: null,
  allowedTickers: null,
  maxTradesPerDay: null,
  minAccountBalance: null,
  tradingStartTime: null,
  tradingEndTime: null,
  tradingDays: null,
  cooldownAfterLoss: null,
  onBreachAction: null,
  lastSync: null,
} as const;

const DEMO_ACCOUNTS: Account[] = [
  {
    ...NULL_FIELDS,
    id: "demo-1",
    name: "ES Futures Master",
    platform: "Rithmic",
    accountType: "master",
    isConnected: true,
    balance: "125000.00",
    pnl: "2340.00",
    openPositions: 3,
    positionScaling: 100,
    riskMode: "custom",
  },
  {
    ...NULL_FIELDS,
    id: "demo-2",
    name: "NQ Follower Alpha",
    platform: "Tradovate",
    accountType: "follower",
    isConnected: true,
    balance: "52000.00",
    pnl: "890.00",
    openPositions: 2,
    positionScaling: 75,
    riskMode: "custom",
  },
  {
    ...NULL_FIELDS,
    id: "demo-3",
    name: "NQ Follower Beta",
    platform: "Tradovate",
    accountType: "follower",
    isConnected: false,
    balance: "48000.00",
    pnl: "-120.00",
    openPositions: 0,
    positionScaling: 50,
    riskMode: "global",
  },
  {
    ...NULL_FIELDS,
    id: "demo-4",
    name: "CL Swing Master",
    platform: "Tradeify",
    accountType: "master",
    isConnected: true,
    balance: "78500.00",
    pnl: "1650.00",
    openPositions: 1,
    positionScaling: 100,
    riskMode: "custom",
  },
  {
    ...NULL_FIELDS,
    id: "demo-5",
    name: "CL Follower A",
    platform: "Tradovate",
    accountType: "follower",
    isConnected: true,
    balance: "30000.00",
    pnl: "540.00",
    openPositions: 1,
    positionScaling: 50,
    riskMode: "global",
  },
  {
    ...NULL_FIELDS,
    id: "demo-6",
    name: "GC Scalp Follower",
    platform: "Rithmic",
    accountType: "follower",
    isConnected: false,
    balance: "25000.00",
    pnl: "0.00",
    openPositions: 0,
    positionScaling: 25,
    riskMode: "global",
  },
];

const DEMO_GROUPS: TradingGroup[] = [
  { id: "demo-group-1", name: "Scalping Desk", color: "#3b82f6", isActive: true,  masterId: "demo-1", disabledAccountIds: [] },
  { id: "demo-group-2", name: "Swing Trades",  color: "#22c55e", isActive: false, masterId: "demo-4", disabledAccountIds: [] },
];

// all demo accounts are pre-placed so both groups have a master + followers
const DEMO_ASSIGNMENTS: Record<string, string> = {
  "demo-1": "demo-group-1",
  "demo-2": "demo-group-1",
  "demo-3": "demo-group-1",
  "demo-4": "demo-group-2",
  "demo-5": "demo-group-2",
  "demo-6": "demo-group-2",
};

// ─── Data model ─────────────────────────────────────────────────────────────

export interface TradingGroup {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  masterId: string | null;
  disabledAccountIds: string[];
  runtimePreference?: "ready" | "paused" | "emergency_stopped";
}

const UNGROUPED_ID = "__ungrouped__";

const PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
  "#eab308",
];

function loadGroups(): TradingGroup[] {
  try {
    const raw = localStorage.getItem("trading-groups-v1");
    if (!raw) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (JSON.parse(raw) as any[]).map((g) => ({
        isActive: true,
        masterId: null,
        disabledAccountIds: [],
        runtimePreference: g?.isActive === false ? "paused" : "ready",
        ...g,
      }));
  } catch {
    return [];
  }
}

function loadAssignments(): Record<string, string> {
  try {
    const raw = localStorage.getItem("group-assignments-v1");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveGroups(groups: TradingGroup[]) {
  localStorage.setItem("trading-groups-v1", JSON.stringify(groups));
}

function saveAssignments(assignments: Record<string, string>) {
  localStorage.setItem("group-assignments-v1", JSON.stringify(assignments));
}

function getLocalRuntimeStatus(group: TradingGroup): CopyGroupStatus {
  if (group.runtimePreference === "emergency_stopped") {
    return "EMERGENCY_STOPPED";
  }

  if (group.runtimePreference === "paused" || group.isActive === false) {
    return "PAUSED";
  }

  return "STOPPED";
}

function describeLatestOperatorAction(
  recentActivityPreview: CopyGroupActivity[],
): string | null {
  const lifecycleEntry = recentActivityPreview.find((entry) => entry.category === "LIFECYCLE");
  if (!lifecycleEntry) {
    return null;
  }

  if (lifecycleEntry.message.startsWith("Emergency stop activated")) {
    return "Emergency stop applied";
  }

  if (lifecycleEntry.message.includes(" paused.")) {
    return "Paused by operator";
  }

  if (lifecycleEntry.message.includes(" resumed.")) {
    return "Resumed by operator";
  }

  if (lifecycleEntry.message.startsWith("Restored emergency stop")) {
    return "Emergency stop restored after reload";
  }

  if (lifecycleEntry.message.startsWith("Restored paused copy group")) {
    return "Paused state restored after reload";
  }

  if (lifecycleEntry.message.startsWith("Recovered copy group")) {
    return "Recovered into ready state after reload";
  }

  return lifecycleEntry.message;
}

function describeHoldReason(input: {
  runtimeStatus: CopyGroupStatus;
  runtimeSummary?: CopyGroupRuntimeSummary;
  riskDetail: { detail: string; tone: "ok" | "warn" | "danger" | "muted" };
  recentActivityPreview: CopyGroupActivity[];
}): string | null {
  const latestLifecycleEntry = input.recentActivityPreview.find((entry) => entry.category === "LIFECYCLE");

  if (input.runtimeStatus === "EMERGENCY_STOPPED") {
    return latestLifecycleEntry?.message ?? input.runtimeSummary?.detail ?? "Emergency stop is active until the group is cleared.";
  }

  if (input.runtimeStatus === "PAUSED") {
    if (input.riskDetail.tone === "danger" || input.riskDetail.tone === "warn") {
      return input.riskDetail.detail;
    }

    return latestLifecycleEntry?.message ?? input.runtimeSummary?.detail ?? "This group is paused until an operator resumes it.";
  }

  if (input.riskDetail.tone === "danger") {
    return input.riskDetail.detail;
  }

  return null;
}

// ─── Draggable account card ──────────────────────────────────────────────────

interface DraggableCardProps {
  account: Account;
  isDragOverlay?: boolean;
  isDemo?: boolean;
  /**
   * undefined  → Ungrouped / no group context: show real broker type
   * true       → this account IS the group master
   * false      → inside a group but NOT the master → show "follower"
   */
  isMaster?: boolean;
  isDisabled?: boolean;
  groupId?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  accountActionDisabled?: boolean;
  connectButtonLabel?: string;
  disconnectButtonLabel?: string;
  onToggleEnabled?: () => void;
  riskStatusLabel?: string;
  riskStatusTone?: "ok" | "warn" | "danger" | "muted";
}

function DraggableCard({
  account,
  isDragOverlay,
  isDemo,
  isMaster,
  isDisabled,
  groupId,
  onConnect,
  onDisconnect,
  accountActionDisabled,
  connectButtonLabel = "Connect",
  disconnectButtonLabel = "Disconnect",
  onToggleEnabled,
  riskStatusLabel,
  riskStatusTone = "muted",
}: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: account.id });

  // Also a drop target for the master crown token
  const { setNodeRef: setDropRef, isOver: isMasterOver } = useDroppable({ id: `master-drop:${account.id}` });

  const setNodeRef = (el: HTMLDivElement | null) => { setDragRef(el); setDropRef(el); };

  const balance = account.balance ? parseFloat(String(account.balance)) : 0;
  const pnl = account.pnl ? parseFloat(String(account.pnl)) : 0;
  const pnlPositive = pnl >= 0;

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined;
  const riskToneClass =
    riskStatusTone === "ok"
      ? "border-emerald-400/20 text-emerald-300"
      : riskStatusTone === "warn"
        ? "border-amber-400/20 text-amber-300"
        : riskStatusTone === "danger"
          ? "border-red-400/20 text-red-300"
          : "text-muted-foreground";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`relative transition-opacity ${isDragging ? "opacity-30" : isDisabled ? "opacity-50" : "opacity-100"}`}
    >
      <Card
        className={`p-3 select-none transition-all ${
          isDragOverlay
            ? "rotate-2 shadow-2xl ring-2 ring-primary/60 scale-105"
            : isMasterOver
            ? "ring-2 ring-amber-400/70 border-amber-400/60 shadow-md shadow-amber-400/20"
            : isDisabled
            ? "border-red-500/20 bg-muted/40"
            : "hover:shadow-md"
        }`}
      >
        <div className="flex items-start gap-2">
          {/* Drag handle — only this activates dragging */}
          <div
            ref={setActivatorNodeRef}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors touch-none"
            title="Drag to move"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {isMaster && !isDisabled && (
                groupId && !isDragOverlay
                  ? <DraggableCrownOnCard groupId={groupId} accountId={account.id} />
                  : <span title="Active master — followers copy this account" className="shrink-0">
                      <Crown className="h-3 w-3 text-amber-500" />
                    </span>
              )}
              <span className="font-semibold text-sm leading-tight truncate max-w-[100px]">
                {account.name}
              </span>
              <Badge
                variant={
                  (isMaster === undefined ? account.accountType : isMaster ? "master" : "follower") === "master"
                    ? "default"
                    : "secondary"
                }
                className="text-[10px] px-1.5 py-0 h-4 shrink-0"
              >
                {isMaster === undefined ? account.accountType : isMaster ? "master" : "follower"}
              </Badge>
              {isDisabled && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0 border-red-500/40 text-red-500">
                  Paused
                </Badge>
              )}
              {riskStatusLabel && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${riskToneClass}`}>
                  {riskStatusLabel}
                </Badge>
              )}
              {/* Per-account toggle */}
              {!isDragOverlay && onToggleEnabled && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleEnabled(); }}
                  title={isDisabled ? "Re-enable this account" : "Pause this account"}
                  className={`ml-auto shrink-0 rounded p-0.5 transition-colors ${
                    isDisabled
                      ? "text-red-500 hover:text-green-500"
                      : "text-muted-foreground/30 hover:text-red-500"
                  }`}
                >
                  <Power className="h-3 w-3" />
                </button>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {account.platform}
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${
                    account.isConnected ? "bg-green-500" : "bg-muted-foreground/40"
                  }`}
                />
                <span className="text-[11px] text-muted-foreground">
                  {account.isConnected ? "Live" : "Off"}
                </span>
              </div>
              <span className="text-[11px] font-medium tabular-nums">
                ${balance.toLocaleString()}
              </span>
              <span
                className={`text-[11px] font-medium tabular-nums ${
                  pnlPositive ? "text-green-600" : "text-red-500"
                }`}
              >
                {pnlPositive ? "+" : ""}${Math.abs(pnl).toLocaleString()}
              </span>
            </div>

            {/* Action button */}
            <div className="mt-2">
              {isDemo ? (
                <div className="flex items-center justify-center h-6 rounded-md border border-dashed border-muted-foreground/30 gap-1">
                  <Sparkles className="h-3 w-3 text-muted-foreground/50" />
                  <span className="text-[10px] text-muted-foreground/50">example account</span>
                </div>
              ) : account.isConnected ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] px-2 w-full"
                  onClick={(e) => { e.stopPropagation(); onDisconnect?.(); }}
                  disabled={accountActionDisabled}
                >
                  <Unplug className="h-3 w-3 mr-1" />
                  {disconnectButtonLabel}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-6 text-[11px] px-2 w-full"
                  onClick={(e) => { e.stopPropagation(); onConnect?.(); }}
                  disabled={accountActionDisabled}
                >
                  <PlugZap className="h-3 w-3 mr-1" />
                  {connectButtonLabel}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Draggable crown on the master card itself ───────────────────────────────

function DraggableCrownOnCard({ groupId, accountId }: { groupId: string; accountId: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `master-card-token:${groupId}:${accountId}`,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      title="Drag to transfer master to another account"
      className={`shrink-0 cursor-grab active:cursor-grabbing touch-none transition-opacity ${
        isDragging ? "opacity-20" : "opacity-100"
      }`}
    >
      <Crown className="h-3 w-3 text-amber-500" />
    </div>
  );
}

// ─── Draggable master crown token ────────────────────────────────────────────

function DraggableMasterToken({
  groupId,
  masterName,
  hasWarning,
}: {
  groupId: string;
  masterName: string | null;
  hasWarning: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `master-token:${groupId}`,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      title="Drag onto an account to make it the master"
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md cursor-grab active:cursor-grabbing touch-none select-none transition-opacity ${
        isDragging ? "opacity-20" : "opacity-100"
      } ${
        hasWarning
          ? "bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25"
          : masterName
          ? "bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20"
          : "bg-muted/60 border border-border/60 hover:bg-muted"
      }`}
    >
      <Crown
        className={`h-3 w-3 shrink-0 ${
          hasWarning || masterName ? "text-amber-500" : "text-muted-foreground/40"
        }`}
      />
      <span
        className={`text-[11px] font-medium max-w-[140px] truncate ${
          hasWarning
            ? "text-amber-600 dark:text-amber-400"
            : masterName
            ? "text-foreground/80"
            : "text-muted-foreground/60"
        }`}
      >
        {hasWarning ? "Set a master" : masterName ?? "No master"}
      </span>
      <GripVertical className="h-3 w-3 text-muted-foreground/25 shrink-0" />
    </div>
  );
}

// ─── Droppable group lane ─────────────────────────────────────────────────────

interface GroupLaneProps {
  group: { id: string; name: string; color: string; isActive?: boolean; masterId?: string | null; disabledAccountIds?: string[] };
  accounts: Account[];
  isUngrouped?: boolean;
  isDemo?: boolean;
  totalPnl: number;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onToggle: (id: string) => void;
  onSetMaster: (groupId: string, masterId: string | null) => void;
  onToggleAccount: (groupId: string, accountId: string) => void;
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, name: string) => void;
  accountActionDisabled?: boolean;
  getConnectButtonLabel?: (accountId: string) => string;
  getDisconnectButtonLabel?: (accountId: string) => string;
  onSaveRisk?: (groupId: string, settings: RiskSettings) => void;
  onClearRisk?: (groupId: string) => void;
  riskSettings?: Partial<RiskSettings>;
  accountRiskById?: Record<string, AccountRiskItem | undefined>;
  runtimeStatus?: CopyGroupStatus;
  runtimeSummary?: CopyGroupRuntimeSummary;
  recentActivityPreview?: CopyGroupActivity[];
  runtimeLoading?: boolean;
  runtimeUnavailable?: boolean;
  lifecycleActionPending?: boolean;
  onStartGroup?: (groupId: string) => void;
  onPauseGroup?: (groupId: string) => void;
  onResumeGroup?: (groupId: string) => void;
  onEmergencyStopGroup?: (groupId: string) => void;
  onResetGroup?: (groupId: string) => void;
}

function GroupLane({
  group,
  accounts,
  isUngrouped,
  isDemo,
  totalPnl,
  onRename,
  onDelete,
  onColorChange,
  onToggle,
  onSetMaster,
  onToggleAccount,
  onConnect,
  onDisconnect,
  accountActionDisabled = false,
  getConnectButtonLabel,
  getDisconnectButtonLabel,
  onSaveRisk,
  onClearRisk,
  riskSettings,
  accountRiskById = {},
  runtimeStatus,
  runtimeSummary,
  recentActivityPreview = [],
  runtimeLoading = false,
  runtimeUnavailable = false,
  lifecycleActionPending = false,
  onStartGroup,
  onPauseGroup,
  onResumeGroup,
  onEmergencyStopGroup,
  onResetGroup,
}: GroupLaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id });
  const { setNodeRef: setClearRef, isOver: isClearOver } = useDroppable({ id: `master-clear:${group.id}` });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [showPalette, setShowPalette] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyActivity, setHistoryActivity] = useState<CopyGroupActivity[]>(recentActivityPreview);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const timelineItems = buildCopyGroupActivityTimeline(historyActivity, 12);

  useEffect(() => {
    if (historyOpen) {
      return;
    }

    setHistoryActivity(recentActivityPreview);
  }, [historyOpen, recentActivityPreview]);

  useEffect(() => {
    if (!historyOpen || isUngrouped || isDemo) {
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    void (async () => {
      const response = await fetch(`/api/copy-groups/${group.id}/activity`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load copy-group history");
      }

      const payload = await response.json();
      if (cancelled) {
        return;
      }

      setHistoryActivity(payload.activity ?? []);
    })().catch((error) => {
      if (cancelled) {
        return;
      }

      setHistoryError(error instanceof Error ? error.message : "Unable to load history.");
    }).finally(() => {
      if (!cancelled) {
        setHistoryLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [group.id, historyOpen, isDemo, isUngrouped]);

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed) onRename(group.id, trimmed);
    setEditing(false);
  };

  const accentColor      = isUngrouped ? "#94a3b8" : group.color;
  const resolvedRuntimeStatus = isUngrouped
    ? "RUNNING"
    : (runtimeStatus ?? getLocalRuntimeStatus(group as TradingGroup));
  const isActive = resolvedRuntimeStatus !== "PAUSED" && resolvedRuntimeStatus !== "EMERGENCY_STOPPED";
  const masterId         = group.masterId ?? null;
  const disabledIds      = isUngrouped ? [] : (group.disabledAccountIds ?? []);
  const effectiveMasterId = masterId && !disabledIds.includes(masterId) ? masterId : null;
  const masterAccounts   = accounts.filter((a) => a.accountType === "master");
  const followerAccounts = accounts.filter((a) => a.accountType !== "master");
  const hasMasterWarning = !isUngrouped && !effectiveMasterId && accounts.some((a) => !disabledIds.includes(a.id));
  const activeFollowerCount = followerAccounts.filter((account) => !disabledIds.includes(account.id)).length;
  const groupRiskSummary = summarizeGroupRisk({
    accountIds: followerAccounts.map((account) => account.id),
    accountRiskById,
    disabledAccountIds: disabledIds,
  });
  const groupRiskDetail = describeGroupRiskSummary(groupRiskSummary, activeFollowerCount);
  const groupBoardState = describeCopyGroupBoardState({
    isActive,
    activeAccountCount: accounts.filter((account) => !disabledIds.includes(account.id)).length,
    hasMasterWarning,
    riskSummary: groupRiskSummary,
    riskDetail: groupRiskDetail,
  });
  const groupRiskToneClass =
    groupRiskSummary.tone === "ok"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : groupRiskSummary.tone === "warn"
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : groupRiskSummary.tone === "danger"
          ? "border-red-400/20 bg-red-400/10 text-red-300"
          : "border-white/10 bg-white/[0.04] text-zinc-300";
  const recentWarningCount = recentActivityPreview.filter((entry) => entry.severity === "WARN").length;
  const recentErrorCount = recentActivityPreview.filter((entry) => entry.severity === "ERROR").length;
  const recentLifecycleCount = recentActivityPreview.filter((entry) => entry.category === "LIFECYCLE").length;
  const recentHealthCount = recentActivityPreview.filter((entry) => entry.category === "HEALTH").length;
  const latestPreviewMessage = recentActivityPreview[0]?.message;
  const latestOperatorAction = describeLatestOperatorAction(recentActivityPreview);
  const holdReason = describeHoldReason({
    runtimeStatus: resolvedRuntimeStatus,
    runtimeSummary,
    riskDetail: groupRiskDetail,
    recentActivityPreview,
  });

  return (
    <div
      className={`w-full rounded-xl overflow-hidden border transition-opacity duration-200 ${!isActive ? "opacity-60" : ""}`}
      style={{ borderColor: `${accentColor}30` }}
    >
      {/* ── Header bar ── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 flex-wrap"
        style={{
          background: `${accentColor}12`,
          borderLeft: `4px solid ${isActive ? accentColor : "#94a3b8"}`,
        }}
      >
        {/* Color dot + palette */}
        {!isUngrouped && (
          <div className="relative shrink-0">
            <button
              className="h-3 w-3 rounded-full ring-1 ring-white/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: group.color }}
              onClick={() => setShowPalette((p) => !p)}
              title="Change color"
            />
            {showPalette && (
              <div className="absolute top-5 left-0 z-20 flex gap-1.5 flex-wrap p-2.5 rounded-lg border bg-popover shadow-xl w-[136px]">
                {PALETTE.map((color) => (
                  <button
                    key={color}
                    className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      outline: group.color === color ? "2px solid white" : "none",
                      outlineOffset: "1px",
                      boxShadow: group.color === color ? `0 0 0 3px ${color}40` : undefined,
                    }}
                    onClick={() => { onColorChange(group.id, color); setShowPalette(false); }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Name / editing */}
        {editing ? (
          <div className="flex items-center gap-1 flex-1 min-w-[140px]">
            <Input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-6 text-xs py-0 px-1.5"
            />
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0" onClick={commitRename}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0" onClick={() => setEditing(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="text-sm font-semibold truncate max-w-[180px]">{group.name}</span>
        )}

        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
          {accounts.length}
        </Badge>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            size="sm" variant="ghost"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => { setEditName(group.name); setEditing(true); setShowPalette(false); }}
            title="Rename group"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          {!isUngrouped && !isDemo && (
            <Button
              size="sm" variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(group.id)}
              title="Delete group"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Divider */}
        {!isUngrouped && <div className="h-4 w-px bg-border/60 shrink-0" />}

        {/* Master crown — drag chip onto a card to set master; drag a card back here to clear */}
        {!isUngrouped && (
          <div
            ref={setClearRef}
            className={`flex items-center gap-1 shrink-0 rounded-md transition-all ${
              isClearOver
                ? "ring-2 ring-red-400/70 bg-red-500/10"
                : ""
            }`}
            title={masterId ? "Drop an account card here to remove master" : undefined}
          >
            <DraggableMasterToken
              groupId={group.id}
              masterName={effectiveMasterId ? (accounts.find((a) => a.id === effectiveMasterId)?.name ?? null) : null}
              hasWarning={hasMasterWarning}
            />
          </div>
        )}

        {/* Divider */}
        {!isUngrouped && <div className="h-4 w-px bg-border/60 shrink-0" />}

        {/* Trading toggle */}
        {!isUngrouped && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0 border ${
              resolvedRuntimeStatus === "RUNNING"
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
                : resolvedRuntimeStatus === "PAUSED"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : resolvedRuntimeStatus === "EMERGENCY_STOPPED"
                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                    : "border-white/10 bg-white/[0.04] text-zinc-300"
            }`}
          >
            <Power className="h-3 w-3" />
            {resolvedRuntimeStatus === "RUNNING"
              ? "Running"
              : resolvedRuntimeStatus === "PAUSED"
                ? "Paused"
                : resolvedRuntimeStatus === "EMERGENCY_STOPPED"
                  ? "Emergency Stop"
                  : resolvedRuntimeStatus === "STARTING" || resolvedRuntimeStatus === "STOPPING"
                    ? "Updating"
                    : "Ready"}
          </span>
        )}

        {!isUngrouped && (
          <div className="flex items-center gap-1.5 shrink-0">
            {resolvedRuntimeStatus === "RUNNING" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => onPauseGroup?.(group.id)}
                disabled={lifecycleActionPending}
              >
                Pause
              </Button>
            ) : resolvedRuntimeStatus === "PAUSED" ? (
              <Button
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => onResumeGroup?.(group.id)}
                disabled={lifecycleActionPending}
              >
                Resume
              </Button>
            ) : resolvedRuntimeStatus === "EMERGENCY_STOPPED" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => onResetGroup?.(group.id)}
                disabled={lifecycleActionPending}
              >
                Clear Stop
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => onStartGroup?.(group.id)}
                disabled={lifecycleActionPending || hasMasterWarning}
              >
                Start
              </Button>
            )}

            {(resolvedRuntimeStatus === "RUNNING" || resolvedRuntimeStatus === "PAUSED") && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-red-500/30 bg-red-500/10 text-[11px] text-red-400 hover:bg-red-500/20 hover:text-red-300"
                onClick={() => onEmergencyStopGroup?.(group.id)}
                disabled={lifecycleActionPending}
              >
                Emergency
              </Button>
            )}
          </div>
        )}

        {/* Risk mode badge — visible only while trading is ON */}
        {!isUngrouped && resolvedRuntimeStatus !== "EMERGENCY_STOPPED" && isActive && (
          riskSettings
            ? (
              /* Custom mode — amber badge with × to reset */
              <span className="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5 text-[10px] font-semibold tracking-wide bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
                <ShieldAlert className="h-2.5 w-2.5" />
                Risk Settings – Custom
                {onClearRisk && (
                  <button
                    onClick={() => onClearRisk(group.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-amber-500/20 transition-colors"
                    title="Reset to Global defaults"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
            ) : (
              /* Global mode — blue badge */
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25 shrink-0 select-none">
                <ShieldAlert className="h-2.5 w-2.5" />
                Risk Settings – Global
              </span>
            )
        )}

        {!isUngrouped && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide shrink-0 ${groupRiskToneClass}`}>
            <ShieldAlert className="h-2.5 w-2.5" />
            {groupBoardState.label}
          </span>
        )}

        {/* Risk settings button — dialog lives here as its own trigger */}
        {!isUngrouped && onSaveRisk && (
          <RiskSettingsDialog
            name={group.name}
            kind="group"
            settings={{ ...DEFAULT_RISK_SETTINGS, ...(riskSettings ?? {}) } as RiskSettings}
            onSave={(settings) => onSaveRisk(group.id, settings)}
          >
            <button
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shrink-0 bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
              title="Group risk settings"
            >
              <ShieldAlert className="h-3 w-3" />
              Risk
              {riskSettings && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
            </button>
          </RiskSettingsDialog>
        )}

        {!isUngrouped && (
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <button
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shrink-0 bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
                title="Recent copy-group history"
                type="button"
              >
                <History className="h-3 w-3" />
                History
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{group.name} history</DialogTitle>
                <DialogDescription>
                  Recent lifecycle, health, and execution updates captured for this copy group.
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[420px] pr-4">
                <div className="space-y-3">
                  {historyLoading ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-zinc-400">
                      Loading recent history...
                    </div>
                  ) : historyError ? (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-6 text-sm text-red-200">
                      {historyError}
                    </div>
                  ) : timelineItems.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-zinc-400">
                      No recent history yet. Group registration and runtime changes will appear here.
                    </div>
                  ) : (
                    timelineItems.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-xl border px-4 py-3 ${
                          item.tone === "danger"
                            ? "border-red-500/20 bg-red-500/10"
                            : item.tone === "warn"
                              ? "border-amber-500/20 bg-amber-500/10"
                              : item.tone === "ok"
                                ? "border-emerald-500/20 bg-emerald-500/10"
                                : "border-white/10 bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wide ${
                              item.tone === "danger"
                                ? "border-red-500/30 text-red-200"
                                : item.tone === "warn"
                                  ? "border-amber-500/30 text-amber-100"
                                  : item.tone === "ok"
                                    ? "border-emerald-500/30 text-emerald-100"
                                    : "border-white/10 text-zinc-300"
                            }`}
                          >
                            {item.category}
                          </Badge>
                          <span
                            className={`text-[10px] uppercase tracking-[0.18em] ${
                              item.tone === "danger"
                                ? "text-red-200/80"
                                : item.tone === "warn"
                                  ? "text-amber-100/80"
                                  : item.tone === "ok"
                                    ? "text-emerald-100/80"
                                    : "text-zinc-500"
                            }`}
                          >
                            {item.timestampLabel}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-white">{item.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}

        {/* P&L — pushed right */}
        {accounts.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">P&L</span>
            <span className={`text-sm font-semibold tabular-nums ${totalPnl >= 0 ? "text-green-500" : "text-red-400"}`}>
              {totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {!isUngrouped && runtimeLoading && !runtimeSummary && (
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-white/8 bg-white/[0.03]">
          <Skeleton className="h-3 w-20 bg-white/10" />
          <Skeleton className="h-3 flex-1 max-w-[240px] bg-white/10" />
          <Skeleton className="ml-auto h-3 w-28 bg-white/10" />
        </div>
      )}

      {!isUngrouped && runtimeUnavailable && !runtimeLoading && !runtimeSummary && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-amber-500/20 bg-amber-500/10">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            Status unavailable
          </span>
          <span className="text-[11px] text-amber-100/80">
            Copy-group health could not be loaded. Trading preferences on this board were not changed.
          </span>
        </div>
      )}

      {!isUngrouped && runtimeSummary && (
        <div
          className={`flex items-center gap-2 px-4 py-1.5 border-b ${
            runtimeSummary.tone === "danger"
              ? "bg-red-500/10 border-red-500/20"
              : runtimeSummary.tone === "warn"
                ? "bg-amber-500/10 border-amber-500/20"
                : runtimeSummary.tone === "ok"
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-white/[0.03] border-white/8"
          }`}
        >
          <span
            className={`text-[11px] font-semibold uppercase tracking-wide ${
              runtimeSummary.tone === "danger"
                ? "text-red-300"
                : runtimeSummary.tone === "warn"
                  ? "text-amber-300"
                  : runtimeSummary.tone === "ok"
                    ? "text-emerald-300"
                    : "text-zinc-300"
            }`}
          >
            {runtimeSummary.label}
          </span>
          <span
            className={`text-[11px] ${
              runtimeSummary.tone === "danger"
                ? "text-red-200/80"
                : runtimeSummary.tone === "warn"
                  ? "text-amber-100/80"
                  : runtimeSummary.tone === "ok"
                    ? "text-emerald-100/80"
                    : "text-zinc-400"
            }`}
          >
            {runtimeSummary.detail}
          </span>
          {runtimeSummary.updatedLabel && (
            <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              Updated {runtimeSummary.updatedLabel}
            </span>
          )}
        </div>
      )}

      {!isUngrouped && runtimeSummary?.label === "Restored offline" && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-amber-500/20 bg-amber-500/10">
          <History className="h-3 w-3 text-amber-300" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            Reload recovery
          </span>
          <span className="text-[11px] text-amber-100/80">
            Review recent group history before restarting this copy group.
          </span>
        </div>
      )}

      {!isUngrouped && recentActivityPreview.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 bg-white/[0.02] px-4 py-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Recovery Snapshot
          </span>
          {recentErrorCount > 0 && (
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-200">
              {recentErrorCount} recent error{recentErrorCount === 1 ? "" : "s"}
            </span>
          )}
          {recentWarningCount > 0 && (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
              {recentWarningCount} warning{recentWarningCount === 1 ? "" : "s"}
            </span>
          )}
          {recentLifecycleCount > 0 && (
            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-100">
              {recentLifecycleCount} lifecycle update{recentLifecycleCount === 1 ? "" : "s"}
            </span>
          )}
          {recentHealthCount > 0 && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
              {recentHealthCount} health signal{recentHealthCount === 1 ? "" : "s"}
            </span>
          )}
          {latestPreviewMessage && (
            <span className="min-w-[220px] flex-1 text-[11px] text-zinc-400">
              Latest: {latestPreviewMessage}
            </span>
          )}
        </div>
      )}

      {!isUngrouped && (latestOperatorAction || holdReason) && (
        <div className="grid gap-1.5 border-b border-white/8 bg-black/10 px-4 py-2">
          {latestOperatorAction && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Last operator action
              </span>
              <span className="text-[11px] text-zinc-300">
                {latestOperatorAction}
              </span>
            </div>
          )}
          {holdReason && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Hold reason
              </span>
              <span className="text-[11px] text-zinc-400">
                {holdReason}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Paused banner */}
      {resolvedRuntimeStatus === "PAUSED" && !isUngrouped && accounts.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/10 border-b border-red-500/20">
          <Power className="h-3 w-3 text-red-500/70" />
          <span className="text-[11px] font-semibold text-red-500/80 uppercase tracking-wide">Trading paused</span>
        </div>
      )}

      {resolvedRuntimeStatus === "EMERGENCY_STOPPED" && !isUngrouped && accounts.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/12 border-b border-red-500/30">
          <ShieldAlert className="h-3 w-3 text-red-400" />
          <span className="text-[11px] font-semibold text-red-300 uppercase tracking-wide">
            Emergency stop active
          </span>
        </div>
      )}

      {!isUngrouped &&
      resolvedRuntimeStatus !== "EMERGENCY_STOPPED" &&
      isActive &&
      groupBoardState.tone !== "ok" && (
        <div
          className={`flex items-center gap-1.5 px-4 py-1.5 border-b ${
            groupBoardState.tone === "danger"
              ? "bg-red-500/10 border-red-500/20"
              : groupBoardState.tone === "warn"
                ? "bg-amber-500/10 border-amber-500/20"
                : "bg-white/[0.04] border-white/8"
          }`}
        >
          <ShieldAlert
            className={`h-3 w-3 ${
              groupBoardState.tone === "danger"
                ? "text-red-400"
                : groupBoardState.tone === "warn"
                  ? "text-amber-400"
                  : "text-zinc-300"
            }`}
          />
          <span
            className={`text-[11px] font-semibold uppercase tracking-wide ${
              groupBoardState.tone === "danger"
                ? "text-red-300"
                : groupBoardState.tone === "warn"
                  ? "text-amber-300"
                  : "text-zinc-200"
            }`}
          >
            {groupBoardState.label}
          </span>
          <span
            className={`text-[11px] ${
              groupBoardState.tone === "danger"
                ? "text-red-200/80"
                : groupBoardState.tone === "warn"
                  ? "text-amber-100/80"
                  : "text-zinc-300"
            }`}
          >
            {groupBoardState.detail}
          </span>
        </div>
      )}

      {/* ── Drop zone — cards laid out horizontally ── */}
      <div
        ref={setNodeRef}
        className="flex flex-wrap gap-3 p-3 min-h-[104px] transition-all"
        style={{
          background: isOver
            ? `${accentColor}10`
            : isUngrouped
            ? "transparent"
            : `${accentColor}05`,
          outline: isUngrouped
            ? `2px dashed ${isOver ? accentColor : "hsl(var(--border))"}`
            : undefined,
          outlineOffset: "-2px",
          boxShadow: isOver ? `inset 0 0 0 2px ${accentColor}30` : undefined,
        }}
      >
        {accounts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[80px] pointer-events-none">
            <p className="text-xs font-medium transition-all" style={{ color: isOver ? accentColor : "hsl(var(--muted-foreground))" }}>
              {isOver ? "↓ Release to add" : "Drop accounts here"}
            </p>
          </div>
        ) : (
          [...accounts]
            .sort((a, b) => {
              if (a.id === effectiveMasterId) return -1;
              if (b.id === effectiveMasterId) return 1;
              return 0;
            })
            .map((account) => (
              <div key={account.id} className="w-[260px]">
                <DraggableCard
                  account={account}
                  isDemo={isDemo}
                  isMaster={isUngrouped ? undefined : account.id === effectiveMasterId}
                  isDisabled={disabledIds.includes(account.id)}
                  groupId={isUngrouped ? undefined : group.id}
                  onToggleEnabled={!isUngrouped ? () => onToggleAccount(group.id, account.id) : undefined}
                  onConnect={() => onConnect(account.id)}
                  onDisconnect={() => onDisconnect(account.id, account.name)}
                  accountActionDisabled={accountActionDisabled}
                  connectButtonLabel={getConnectButtonLabel?.(account.id)}
                  disconnectButtonLabel={getDisconnectButtonLabel?.(account.id)}
                  riskStatusLabel={toAccountRiskBadgeView(accountRiskById[account.id]).label}
                  riskStatusTone={toAccountRiskBadgeView(accountRiskById[account.id]).tone}
                />
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AccountGroupsViewProps {
  accounts: Account[];
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, name: string) => void;
  accountActionDisabled?: boolean;
  getConnectButtonLabel?: (accountId: string) => string;
  getDisconnectButtonLabel?: (accountId: string) => string;
  accountRiskById?: Record<string, AccountRiskItem | undefined>;
  /** Increment this counter from the parent to trigger addGroup without a ref */
  addGroupTrigger?: number;
}

export function AccountGroupsView({
  accounts,
  onConnect,
  onDisconnect,
  accountActionDisabled = false,
  getConnectButtonLabel,
  getDisconnectButtonLabel,
  accountRiskById = {},
  addGroupTrigger,
}: AccountGroupsViewProps) {
  const { user } = useUser();
  const { toast } = useToast();
  // ── Mode detection ─────────────────────────────────────────────────────
  const isDemo = accounts.length === 0;
  const syncSignatureRef = useRef<string | null>(null);
  const hydratedBoardSignatureRef = useRef<string | null>(null);

  // ── Real-account state (persisted) ────────────────────────────────────
  const [groups, setGroups] = useState<TradingGroup[]>(loadGroups);
  const [assignments, setAssignments] = useState<Record<string, string>>(loadAssignments);

  // ── Ungrouped lane name (persisted for real, ephemeral for demo) ─────
  const [ungroupedName, setUngroupedName] = useState(() => {
    try { return localStorage.getItem("ungrouped-name-v1") || "Ungrouped"; } catch { return "Ungrouped"; }
  });
  const [demoUngroupedName, setDemoUngroupedName] = useState("Ungrouped");

  // ── Demo state (ephemeral — resets on page reload intentionally) ───────
  const [demoGroups, setDemoGroups] = useState<TradingGroup[]>([...DEMO_GROUPS]);
  const [demoAssignments, setDemoAssignments] = useState<Record<string, string>>(DEMO_ASSIGNMENTS);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return localStorage.getItem("demo-banner-dismissed") === "1"; } catch { return false; }
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingLifecycleGroupId, setPendingLifecycleGroupId] = useState<string | null>(null);

  // ── Group risk settings (persisted in localStorage) ────────────────────
  const [groupRiskSettings, setGroupRiskSettings] = useState<Record<string, Partial<RiskSettings>>>(() => {
    try {
      const raw = localStorage.getItem("group-risk-settings-v1");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [riskDialogGroupId, setRiskDialogGroupId] = useState<string | null>(null);
  const {
    data: registeredGroupsData,
    isLoading: isCopyGroupSnapshotLoading,
    isError: isCopyGroupSnapshotError,
  } = useQuery<CopyGroupSnapshotApiResponse>({
    queryKey: ["/api/copy-groups/snapshot"],
    queryFn: async () => {
      const response = await fetch("/api/copy-groups/snapshot", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load copy-group snapshot");
      }

      return response.json();
    },
    enabled: !isDemo && !!user?.id,
    refetchOnWindowFocus: false,
  });

  const saveGroupRiskSetting = (groupId: string, settings: RiskSettings) => {
    setGroupRiskSettings((prev) => {
      const next = { ...prev, [groupId]: settings };
      try { localStorage.setItem("group-risk-settings-v1", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const clearGroupRiskSetting = (groupId: string) => {
    setGroupRiskSettings((prev) => {
      const next = { ...prev };
      delete next[groupId];
      try { localStorage.setItem("group-risk-settings-v1", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Fire addGroup whenever parent increments the trigger
  useEffect(() => {
    if (!addGroupTrigger) return;
    addGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addGroupTrigger]);

  useEffect(() => {
    if (isDemo || !user?.id || !registeredGroupsData) {
      return;
    }

    if (registeredGroupsData.groups.length === 0 && groups.length > 0) {
      return;
    }

    const nextBoardState = hydrateBoardStateFromSnapshot(registeredGroupsData, groups);
    const nextSignature = JSON.stringify(nextBoardState);
    const currentSignature = JSON.stringify({ groups, assignments });

    if (
      nextSignature === currentSignature ||
      nextSignature === hydratedBoardSignatureRef.current
    ) {
      hydratedBoardSignatureRef.current = nextSignature;
      return;
    }

    hydratedBoardSignatureRef.current = nextSignature;
    setGroups(nextBoardState.groups);
    setAssignments(nextBoardState.assignments);
    setGroupRiskSettings((currentSettings) => {
      const nextSettings = nextBoardState.groupRiskSettings;
      const currentSignature = JSON.stringify(currentSettings);
      const nextSettingsSignature = JSON.stringify(nextSettings);

      if (currentSignature === nextSettingsSignature) {
        return currentSettings;
      }

      try {
        localStorage.setItem("group-risk-settings-v1", nextSettingsSignature);
      } catch {}

      return nextSettings;
    });
    saveGroups(nextBoardState.groups);
    saveAssignments(nextBoardState.assignments);
  }, [assignments, groups, isDemo, registeredGroupsData, user?.id]);

  useEffect(() => {
    if (isDemo || !user?.id) {
      return;
    }

    const persistedName = user.copyGroupsUngroupedName?.trim() || "Ungrouped";
    setUngroupedName((currentName) => {
      if (currentName === persistedName) {
        return currentName;
      }

      try {
        localStorage.setItem("ungrouped-name-v1", persistedName);
      } catch {}

      return persistedName;
    });
  }, [isDemo, user?.copyGroupsUngroupedName, user?.id]);

  useEffect(() => {
    if (isDemo || !user?.id || !registeredGroupsData) {
      return;
    }

    const runningGroupIds = new Set(registeredGroupsData.runningGroups ?? []);
    const syncableGroups = groups.filter((group) => !runningGroupIds.has(group.id));
    const registeredGroupIds = (registeredGroupsData.groups ?? []).map(
      (registeredGroup) => registeredGroup.group.group.groupId,
    );
    const syncPlan = buildCopyGroupSyncPlan({
      userId: user.id,
      groups: syncableGroups,
      assignments,
      accounts,
      groupRiskSettings,
      registeredGroupIds: registeredGroupIds.filter((groupId) => !runningGroupIds.has(groupId)),
    });
    const syncSignature = JSON.stringify({
      payloads: syncPlan.payloads,
      removedGroupIds: syncPlan.removedGroupIds,
      runningGroupIds: Array.from(runningGroupIds).sort(),
    });

    if (syncSignatureRef.current === syncSignature) {
      return;
    }

    let cancelled = false;

    void (async () => {
      for (const groupId of syncPlan.removedGroupIds) {
        await apiRequest("DELETE", `/api/copy-groups/${groupId}`);
      }

      for (const payload of syncPlan.payloads) {
        await apiRequest("POST", "/api/copy-groups/register", payload);
      }

      if (cancelled) {
        return;
      }

      syncSignatureRef.current = syncSignature;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/copy-groups/snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/runtime/accounts-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/runtime/dashboard-overview"] }),
      ]);
    })().catch((error) => {
      if (cancelled) {
        return;
      }

      console.error("Failed to sync copy group board state:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [accounts, assignments, groupRiskSettings, groups, isDemo, registeredGroupsData, user?.id]);

  // ── Derived display values ─────────────────────────────────────────────
  const setGroupRuntimePreference = (
    groupId: string,
    runtimePreference: "ready" | "paused" | "emergency_stopped",
  ) => {
    persistGroups(
      groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              isActive: runtimePreference === "ready",
              runtimePreference,
            }
          : group,
      ),
    );
  };

  const syncSingleGroupRegistration = async (
    groupId: string,
    runtimePreference: "ready" | "paused" | "emergency_stopped",
  ) => {
    if (!user?.id) {
      return;
    }

    const targetGroup = groups.find((group) => group.id === groupId);
    if (!targetGroup) {
      return;
    }

    const plan = buildCopyGroupSyncPlan({
      userId: user.id,
      groups: [
        {
          ...targetGroup,
          isActive: runtimePreference === "ready",
          runtimePreference,
        },
      ],
      assignments,
      accounts,
      groupRiskSettings,
      registeredGroupIds: [groupId],
    });

    const payload = plan.payloads[0];
    if (!payload) {
      return;
    }

    await apiRequest("POST", "/api/copy-groups/register", payload);
  };

  const invalidateCopyGroupQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/copy-groups/snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/runtime/accounts-overview"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/runtime/dashboard-overview"] }),
    ]);
  };

  const persistUngroupedLaneName = async (name: string) => {
    const trimmedName = name.trim() || "Ungrouped";

    setUngroupedName(trimmedName);
    try { localStorage.setItem("ungrouped-name-v1", trimmedName); } catch {}

    if (isDemo || !user?.id) {
      return;
    }

    const response = await apiRequest("PATCH", "/api/user/settings", {
      copyGroupsUngroupedName: trimmedName,
    });
    const payload = await response.json();

    queryClient.setQueryData(["/api/auth/me"], payload);
  };

  const applyGroupRuntimePreference = async (
    groupId: string,
    runtimePreference: "ready" | "paused" | "emergency_stopped",
  ) => {
    const previousGroup = groups.find((group) => group.id === groupId);
    setPendingLifecycleGroupId(groupId);
    setGroupRuntimePreference(groupId, runtimePreference);

    try {
      await syncSingleGroupRegistration(groupId, runtimePreference);
      await invalidateCopyGroupQueries();
      toast({
        title:
          runtimePreference === "ready"
            ? "Group ready"
            : runtimePreference === "paused"
              ? "Group paused"
              : "Emergency stop applied",
        description:
          runtimePreference === "ready"
            ? "This group is saved in a safe ready state."
            : runtimePreference === "paused"
              ? "This group will stay paused until you change it."
              : "This group is locked until you clear the stop.",
      });
    } catch (error) {
      if (previousGroup) {
        persistGroups(
          groups.map((group) => (group.id === groupId ? previousGroup : group)),
        );
      }

      console.error("Failed to apply copy-group runtime preference:", error);
      toast({
        title: "Group update failed",
        description: error instanceof Error ? error.message : "Unable to save the group state right now.",
        variant: "destructive",
      });
    } finally {
      setPendingLifecycleGroupId(null);
    }
  };

  const displayAccounts  = isDemo ? DEMO_ACCOUNTS : accounts;
  const displayGroups    = isDemo ? demoGroups    : groups;
  const displayAssign    = isDemo ? demoAssignments : assignments;
  const runtimeStatusByGroupId = new Map(
    (registeredGroupsData?.groups ?? []).map((registeredGroup) => [
      registeredGroup.group.group.groupId,
      registeredGroup.runtime?.state?.status ?? "STOPPED",
    ]),
  );
  const activityByGroupId = new Map(
    (registeredGroupsData?.groups ?? []).map((registeredGroup) => [
      registeredGroup.group.group.groupId,
      registeredGroup.activityPreview,
    ]),
  );
  const runtimeSummaryByGroupId = new Map(
    (registeredGroupsData?.groups ?? []).map((registeredGroup) => [
      registeredGroup.group.group.groupId,
      registeredGroup.runtimeSummary,
    ]),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  // ── Helpers ────────────────────────────────────────────────────────────

  const persistGroups = (next: TradingGroup[]) => { setGroups(next); saveGroups(next); };
  const persistAssignments = (next: Record<string, string>) => { setAssignments(next); saveAssignments(next); };

  const getGroupAccounts = (groupId: string): Account[] => {
    if (groupId === UNGROUPED_ID) {
      return displayAccounts.filter((a) => {
        const g = displayAssign[a.id];
        return !g || !displayGroups.find((grp) => grp.id === g);
      });
    }
    return displayAccounts.filter((a) => displayAssign[a.id] === groupId);
  };

  // ── Group actions (no-op in demo) ──────────────────────────────────────

  const addGroup = () => {
    const id    = `group-${Date.now()}`;
    if (isDemo) {
      const color = PALETTE[demoGroups.length % PALETTE.length];
      setDemoGroups((prev) => [...prev, { id, name: `Group ${prev.length + 1}`, color, isActive: true, masterId: null, disabledAccountIds: [], runtimePreference: "ready" }]);
      return;
    }
    const color = PALETTE[groups.length % PALETTE.length];
    persistGroups([...groups, { id, name: `Group ${groups.length + 1}`, color, isActive: true, masterId: null, disabledAccountIds: [], runtimePreference: "ready" }]);
  };

  const renameGroup = (id: string, name: string) => {
    if (id === UNGROUPED_ID) {
      if (isDemo) { setDemoUngroupedName(name); return; }
      const previousName = ungroupedName;
      void persistUngroupedLaneName(name).catch((error) => {
        setUngroupedName(previousName);
        try { localStorage.setItem("ungrouped-name-v1", previousName); } catch {}
        console.error("Failed to save ungrouped lane name:", error);
        toast({
          title: "Lane rename failed",
          description:
            error instanceof Error
              ? error.message
              : "Unable to save the ungrouped lane name right now.",
          variant: "destructive",
        });
      });
      return;
    }
    if (isDemo) { setDemoGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g))); return; }
    persistGroups(groups.map((g) => (g.id === id ? { ...g, name } : g)));
  };

  const deleteGroup = (id: string) => {
    if (isDemo) return; // keep demo intact
    const next = { ...assignments };
    Object.keys(next).forEach((aid) => { if (next[aid] === id) delete next[aid]; });
    persistAssignments(next);
    persistGroups(groups.filter((g) => g.id !== id));
  };

  const changeColor = (id: string, color: string) => {
    if (isDemo) { setDemoGroups((prev) => prev.map((g) => (g.id === id ? { ...g, color } : g))); return; }
    persistGroups(groups.map((g) => (g.id === id ? { ...g, color } : g)));
  };

  const toggleGroup = (id: string) => {
    if (isDemo) {
      setDemoGroups((prev) => prev.map((g) => (g.id === id ? {
        ...g,
        isActive: !g.isActive,
        runtimePreference: g.isActive ? "paused" : "ready",
      } : g)));
      return;
    }
    persistGroups(groups.map((g) => (g.id === id ? {
      ...g,
      isActive: !g.isActive,
      runtimePreference: g.isActive ? "paused" : "ready",
    } : g)));
  };

  const setMaster = (groupId: string, masterId: string | null) => {
    if (isDemo) { setDemoGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, masterId } : g))); return; }
    persistGroups(groups.map((g) => (g.id === groupId ? { ...g, masterId } : g)));
  };

  const toggleAccountEnabled = (groupId: string, accountId: string) => {
    const updateGroup = (g: TradingGroup): TradingGroup => {
      if (g.id !== groupId) return g;
      const isCurrentlyDisabled = (g.disabledAccountIds ?? []).includes(accountId);
      if (isCurrentlyDisabled) {
        // Re-enabling — just remove from disabled list
        return { ...g, disabledAccountIds: (g.disabledAccountIds ?? []).filter((id) => id !== accountId) };
      }
      // Disabling — add to disabled list
      const newDisabled = [...(g.disabledAccountIds ?? []), accountId];
      // Auto-promote: if this was the active master, switch to next available enabled master
      let newMasterId = g.masterId;
      if (g.masterId === accountId) {
        const groupAccts = getGroupAccounts(groupId);
        const next = groupAccts.find(
          (a) => a.accountType === "master" && a.id !== accountId && !newDisabled.includes(a.id),
        );
        newMasterId = next ? next.id : null;
      }
      return { ...g, disabledAccountIds: newDisabled, masterId: newMasterId };
    };
    if (isDemo) { setDemoGroups((prev) => prev.map(updateGroup)); return; }
    persistGroups(groups.map(updateGroup));
  };

  // ── Drag events ────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeItemId = active.id as string;
    const overId       = over.id as string;

    // ── Master crown token (header chip) dropped onto a card ─────────────
    if (activeItemId.startsWith("master-token:")) {
      if (overId.startsWith("master-drop:")) {
        const groupId   = activeItemId.slice("master-token:".length);
        const accountId = overId.slice("master-drop:".length);
        setMaster(groupId, accountId);
      }
      return;
    }

    // ── Master crown on a card dragged to another card ────────────────────
    if (activeItemId.startsWith("master-card-token:")) {
      const rest       = activeItemId.slice("master-card-token:".length);
      const colonIdx   = rest.indexOf(":");
      const groupId    = rest.slice(0, colonIdx);
      if (overId.startsWith("master-drop:")) {
        const targetAccountId = overId.slice("master-drop:".length);
        setMaster(groupId, targetAccountId);
      }
      return;
    }

    // ── Account card dropped on the crown zone → clear master ─────────────
    if (overId.startsWith("master-clear:")) {
      const groupId = overId.slice("master-clear:".length);
      setMaster(groupId, null);
      return; // don't move the card
    }

    // ── Account card moved to a group ────────────────────────────────────
    const accountId = activeItemId;

    // If the card was dropped on another card's droppable, resolve to that card's group
    let targetGroupId = overId;
    if (overId.startsWith("master-drop:")) {
      const targetAccountId = overId.slice("master-drop:".length);
      targetGroupId = (isDemo ? demoAssignments : assignments)[targetAccountId] ?? UNGROUPED_ID;
    }

    // Auto-demote: if the dragged account was the master of its old group, clear masterId there
    const clearOldMaster = (grps: TradingGroup[], oldAssign: Record<string, string>): TradingGroup[] => {
      const oldGroupId = oldAssign[accountId];
      if (!oldGroupId || oldGroupId === targetGroupId) return grps;
      return grps.map((g) => g.id === oldGroupId && g.masterId === accountId ? { ...g, masterId: null } : g);
    };

    if (isDemo) {
      setDemoAssignments((prev) => {
        const next = { ...prev };
        if (targetGroupId === UNGROUPED_ID) delete next[accountId];
        else next[accountId] = targetGroupId;
        return next;
      });
      setDemoGroups((prev) => clearOldMaster(prev, demoAssignments));
    } else {
      const next = { ...assignments };
      if (targetGroupId === UNGROUPED_ID) delete next[accountId];
      else next[accountId] = targetGroupId;
      persistAssignments(next);
      persistGroups(clearOldMaster(groups, assignments));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const [subView, setSubView] = useState<"kanban" | "ungrouped">("kanban");

  const isMasterTokenDrag = (activeId?.startsWith("master-token:") || activeId?.startsWith("master-card-token:")) ?? false;
  const activeAccount     = activeId && !isMasterTokenDrag ? displayAccounts.find((a) => a.id === activeId) : null;
  const ungroupedAccounts = getGroupAccounts(UNGROUPED_ID);

  const lanes = [
    { id: UNGROUPED_ID, name: isDemo ? demoUngroupedName : ungroupedName, color: "#94a3b8", isUngrouped: true as const },
    ...displayGroups.map((g) => ({ ...g, isUngrouped: false as const })),
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* Demo banner */}
      {isDemo && !bannerDismissed && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary">Interactive demo — try it now</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag the example cards between groups using the ⠿ handle. Add real accounts to replace these.
            </p>
          </div>
          <Button
            size="sm" variant="ghost"
            className="h-6 w-6 p-0 shrink-0 text-muted-foreground"
            onClick={() => { setBannerDismissed(true); try { localStorage.setItem("demo-banner-dismissed", "1"); } catch {} }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Toolbar: tabs left, actions right */}
      <div className="flex items-center justify-between gap-4">
        {/* Sub-view tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <Button
            variant={subView === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSubView("kanban")}
          >
            <Layers className="h-4 w-4 mr-1.5" />
            Board
          </Button>
          <Button
            variant={subView === "ungrouped" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSubView("ungrouped")}
          >
            <Inbox className="h-4 w-4 mr-1.5" />
            Ungrouped
          </Button>
        </div>

        {subView === "kanban" && (
          <Button variant="default" onClick={addGroup} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Group
          </Button>
        )}
      </div>

      {/* ── Groups board ── */}
      {subView === "kanban" && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex flex-col gap-4">
            {lanes.map((lane) => {
              const laneAccounts = getGroupAccounts(lane.id);
              const totalPnl = laneAccounts.reduce(
                (sum, a) => sum + (a.pnl ? parseFloat(String(a.pnl)) : 0),
                0,
              );
              return (
                <GroupLane
                  key={lane.id}
                  group={lane}
                  accounts={laneAccounts}
                  isUngrouped={lane.isUngrouped}
                  isDemo={isDemo}
                  totalPnl={totalPnl}
                  onRename={renameGroup}
                  onDelete={deleteGroup}
                  onColorChange={changeColor}
                  onToggle={toggleGroup}
                  onSetMaster={setMaster}
                  onToggleAccount={toggleAccountEnabled}
                  onConnect={onConnect}
                  onDisconnect={onDisconnect}
                  accountActionDisabled={accountActionDisabled}
                  getConnectButtonLabel={getConnectButtonLabel}
                  getDisconnectButtonLabel={getDisconnectButtonLabel}
                  onSaveRisk={saveGroupRiskSetting}
                  onClearRisk={clearGroupRiskSetting}
                  riskSettings={groupRiskSettings[lane.id]}
                  accountRiskById={accountRiskById}
                  runtimeStatus={lane.isUngrouped ? undefined : runtimeStatusByGroupId.get(lane.id)}
                  runtimeSummary={lane.isUngrouped ? undefined : runtimeSummaryByGroupId.get(lane.id)}
                  recentActivityPreview={lane.isUngrouped ? [] : activityByGroupId.get(lane.id) ?? []}
                  runtimeLoading={!lane.isUngrouped && isCopyGroupSnapshotLoading}
                  runtimeUnavailable={!lane.isUngrouped && isCopyGroupSnapshotError}
                  lifecycleActionPending={pendingLifecycleGroupId === lane.id}
                  onStartGroup={(groupId) => void applyGroupRuntimePreference(groupId, "ready")}
                  onPauseGroup={(groupId) => void applyGroupRuntimePreference(groupId, "paused")}
                  onResumeGroup={(groupId) => void applyGroupRuntimePreference(groupId, "ready")}
                  onEmergencyStopGroup={(groupId) => void applyGroupRuntimePreference(groupId, "emergency_stopped")}
                  onResetGroup={(groupId) => void applyGroupRuntimePreference(groupId, "ready")}
                />
              );
            })}

            {/* Add Group button */}
            <button
              onClick={addGroup}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary py-4"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm font-medium">Add Group</span>
            </button>
          </div>

          <DragOverlay dropAnimation={null}>
            {isMasterTokenDrag ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 shadow-xl shadow-amber-500/20 backdrop-blur-sm">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Set as Master</span>
              </div>
            ) : activeAccount ? (
              <DraggableCard account={activeAccount} isDragOverlay isDemo={isDemo} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Ungrouped panel ── */}
      {subView === "ungrouped" && (
        <div>
          {ungroupedAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[260px] rounded-xl border-2 border-dashed border-border text-center p-8">
              <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">All accounts are in a group</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Switch to Board to drag accounts between groups.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                {ungroupedAccounts.length} account{ungroupedAccounts.length !== 1 ? "s" : ""} not assigned to any group. Switch to Board to drag them into place.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ungroupedAccounts.map((account) => (
                  <DndContext key={account.id} sensors={sensors}>
                    <DraggableCard
                      account={account}
                      isDemo={isDemo}
                      onConnect={() => onConnect(account.id)}
                      onDisconnect={() => onDisconnect(account.id, account.name)}
                      accountActionDisabled={accountActionDisabled}
                      connectButtonLabel={getConnectButtonLabel?.(account.id)}
                      disconnectButtonLabel={getDisconnectButtonLabel?.(account.id)}
                    />
                  </DndContext>
                ))}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}
