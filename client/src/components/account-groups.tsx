import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import {
  GripVertical,
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
} from "lucide-react";
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
  apiKey: null,
  apiSecret: null,
  maxContracts: null,
  blockedTickers: null,
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
  onConnect?: () => void;
  onDisconnect?: () => void;
  onToggleEnabled?: () => void;
}

function DraggableCard({
  account,
  isDragOverlay,
  isDemo,
  isMaster,
  isDisabled,
  onConnect,
  onDisconnect,
  onToggleEnabled,
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
                <span title="Active master — followers copy this account" className="shrink-0">
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
                >
                  <Unplug className="h-3 w-3 mr-1" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-6 text-[11px] px-2 w-full"
                  onClick={(e) => { e.stopPropagation(); onConnect?.(); }}
                >
                  <PlugZap className="h-3 w-3 mr-1" />
                  Connect
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
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
}: GroupLaneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [showPalette, setShowPalette] = useState(false);

  const commitRename = () => {
    const trimmed = editName.trim();
    if (trimmed) onRename(group.id, trimmed);
    setEditing(false);
  };

  const accentColor      = isUngrouped ? "#94a3b8" : group.color;
  const isActive         = isUngrouped ? true : (group.isActive !== false);
  const masterId         = group.masterId ?? null;
  const disabledIds      = isUngrouped ? [] : (group.disabledAccountIds ?? []);
  const effectiveMasterId = masterId && !disabledIds.includes(masterId) ? masterId : null;
  const masterAccounts   = accounts.filter((a) => a.accountType === "master");
  const followerAccounts = accounts.filter((a) => a.accountType !== "master");
  const hasMasterWarning = !isUngrouped && !effectiveMasterId && accounts.some((a) => !disabledIds.includes(a.id));

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

        {/* Master crown — drag onto a card to set master */}
        {!isUngrouped && (
          <DraggableMasterToken
            groupId={group.id}
            masterName={effectiveMasterId ? (accounts.find((a) => a.id === effectiveMasterId)?.name ?? null) : null}
            hasWarning={hasMasterWarning}
          />
        )}

        {/* Divider */}
        {!isUngrouped && <div className="h-4 w-px bg-border/60 shrink-0" />}

        {/* Trading toggle */}
        {!isUngrouped && (
          <button
            onClick={() => onToggle(group.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all shrink-0 ${
              isActive
                ? "bg-green-500/15 text-green-600 hover:bg-green-500/25 dark:text-green-400 border border-green-500/30"
                : "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/25"
            }`}
          >
            <Power className="h-3 w-3" />
            {isActive ? "Trading ON" : "Trading OFF"}
          </button>
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

      {/* Paused banner */}
      {!isActive && !isUngrouped && accounts.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-red-500/10 border-b border-red-500/20">
          <Power className="h-3 w-3 text-red-500/70" />
          <span className="text-[11px] font-semibold text-red-500/80 uppercase tracking-wide">Trading paused</span>
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
                  onToggleEnabled={!isUngrouped ? () => onToggleAccount(group.id, account.id) : undefined}
                  onConnect={() => onConnect(account.id)}
                  onDisconnect={() => onDisconnect(account.id, account.name)}
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
  /** Increment this counter from the parent to trigger addGroup without a ref */
  addGroupTrigger?: number;
}

export function AccountGroupsView({
  accounts,
  onConnect,
  onDisconnect,
  addGroupTrigger,
}: AccountGroupsViewProps) {
  // ── Mode detection ─────────────────────────────────────────────────────
  const isDemo = accounts.length === 0;

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

  // Fire addGroup whenever parent increments the trigger
  useEffect(() => {
    if (!addGroupTrigger) return;
    addGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addGroupTrigger]);

  // ── Derived display values ─────────────────────────────────────────────
  const displayAccounts  = isDemo ? DEMO_ACCOUNTS : accounts;
  const displayGroups    = isDemo ? demoGroups    : groups;
  const displayAssign    = isDemo ? demoAssignments : assignments;

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
      setDemoGroups((prev) => [...prev, { id, name: `Group ${prev.length + 1}`, color, isActive: true, masterId: null, disabledAccountIds: [] }]);
      return;
    }
    const color = PALETTE[groups.length % PALETTE.length];
    persistGroups([...groups, { id, name: `Group ${groups.length + 1}`, color, isActive: true, masterId: null, disabledAccountIds: [] }]);
  };

  const renameGroup = (id: string, name: string) => {
    if (id === UNGROUPED_ID) {
      if (isDemo) { setDemoUngroupedName(name); return; }
      setUngroupedName(name);
      try { localStorage.setItem("ungrouped-name-v1", name); } catch {}
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
    if (isDemo) { setDemoGroups((prev) => prev.map((g) => (g.id === id ? { ...g, isActive: !g.isActive } : g))); return; }
    persistGroups(groups.map((g) => (g.id === id ? { ...g, isActive: !g.isActive } : g)));
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

    // ── Master crown token dropped onto a card ────────────────────────────
    if (activeItemId.startsWith("master-token:")) {
      if (overId.startsWith("master-drop:")) {
        const groupId   = activeItemId.slice("master-token:".length);
        const accountId = overId.slice("master-drop:".length);
        setMaster(groupId, accountId);
      }
      return;
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

  const isMasterTokenDrag = activeId?.startsWith("master-token:") ?? false;
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
                Switch to Groups to drag accounts between lanes.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                {ungroupedAccounts.length} account{ungroupedAccounts.length !== 1 ? "s" : ""} not assigned to any group — switch to Groups to drag them in.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {ungroupedAccounts.map((account) => (
                  <DndContext key={account.id} sensors={sensors}>
                    <DraggableCard
                      account={account}
                      isDemo={isDemo}
                      onConnect={() => onConnect(account.id)}
                      onDisconnect={() => onDisconnect(account.id, account.name)}
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
