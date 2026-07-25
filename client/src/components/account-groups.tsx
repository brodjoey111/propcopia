import { useState } from "react";
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
  { id: "demo-group-1", name: "Scalping Desk", color: "#3b82f6", isActive: true,  masterId: "demo-1" },
  { id: "demo-group-2", name: "Swing Trades",  color: "#22c55e", isActive: false, masterId: "demo-4" },
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
  isMaster?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

function DraggableCard({
  account,
  isDragOverlay,
  isDemo,
  isMaster,
  onConnect,
  onDisconnect,
}: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: account.id });

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
      className={`relative transition-opacity ${isDragging ? "opacity-30" : "opacity-100"}`}
    >
      <Card
        className={`p-3 select-none ${
          isDragOverlay
            ? "rotate-2 shadow-2xl ring-2 ring-primary/60 scale-105"
            : "hover:shadow-md transition-shadow"
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
              {isMaster && (
                <span title="Group master" className="shrink-0">
                  <Crown className="h-3 w-3 text-amber-500" />
                </span>
              )}
              <span className="font-semibold text-sm leading-tight truncate max-w-[120px]">
                {account.name}
              </span>
              <Badge
                variant={account.accountType === "master" ? "default" : "secondary"}
                className="text-[10px] px-1.5 py-0 h-4 shrink-0"
              >
                {account.accountType}
              </Badge>
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

// ─── Droppable group lane ─────────────────────────────────────────────────────

interface GroupLaneProps {
  group: { id: string; name: string; color: string; isActive?: boolean; masterId?: string | null };
  accounts: Account[];
  isUngrouped?: boolean;
  isDemo?: boolean;
  totalPnl: number;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onToggle: (id: string) => void;
  onSetMaster: (groupId: string, masterId: string | null) => void;
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

  const accentColor  = isUngrouped ? "#94a3b8" : group.color;
  const isActive     = isUngrouped ? true : (group.isActive !== false);
  const masterId     = group.masterId ?? null;
  const masterAccounts  = accounts.filter((a) => a.accountType === "master");
  const followerAccounts = accounts.filter((a) => a.accountType !== "master");
  const masterAccount = accounts.find((a) => a.id === masterId);
  const hasMasterWarning = !isUngrouped && !masterId && accounts.length > 0;

  return (
    <div className={`flex flex-col w-[280px] shrink-0 transition-opacity duration-200 ${!isActive ? "opacity-55" : ""}`}>
      {/* Lane header */}
      <div
        className="rounded-t-xl px-3 py-2.5"
        style={{
          background: `${accentColor}14`,
          borderTop: `3px solid ${isActive ? accentColor : "#94a3b8"}`,
          borderLeft: `1px solid ${accentColor}28`,
          borderRight: `1px solid ${accentColor}28`,
        }}
      >
        {/* ── Row 1: color · name · count · edit · delete · TOGGLE ── */}
        <div className="flex items-center gap-1.5">
          {!isUngrouped && (
            <button
              className="h-3 w-3 rounded-full shrink-0 ring-1 ring-white/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: group.color }}
              onClick={() => setShowPalette((p) => !p)}
              title="Change color"
            />
          )}

          {editing ? (
            <div className="flex items-center gap-1 flex-1">
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
            <>
              <span className="text-xs font-semibold flex-1 truncate">{group.name}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                {accounts.length}
              </Badge>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  size="sm" variant="ghost"
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => { setEditName(group.name); setEditing(true); setShowPalette(false); }}
                  title="Rename group"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                {!isUngrouped && !isDemo && (
                  <Button
                    size="sm" variant="ghost"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(group.id)}
                    title="Delete group"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

            </>
          )}
        </div>

        {/* ── Row 2: master selector ── */}
        {!isUngrouped && (
          <div className={`flex items-center gap-1.5 mt-1.5 pt-1.5 border-t ${hasMasterWarning ? "border-amber-500/30" : "border-white/10"}`}>
            <Crown className={`h-3 w-3 shrink-0 ${hasMasterWarning ? "text-amber-500" : masterAccount ? "text-amber-500/70" : "text-muted-foreground/40"}`} />
            <select
              value={masterId || ""}
              onChange={(e) => onSetMaster(group.id, e.target.value || null)}
              className="flex-1 min-w-0 text-[11px] bg-transparent border-none outline-none cursor-pointer truncate appearance-none"
              style={{ color: masterId ? "inherit" : hasMasterWarning ? "hsl(var(--muted-foreground))" : "hsl(var(--muted-foreground))" }}
            >
              <option value="">{hasMasterWarning ? "⚠ Set a master account" : "— no master —"}</option>
              {masterAccounts.length > 0 && masterAccounts.map((a) => (
                <option key={a.id} value={a.id}>★ {a.name}</option>
              ))}
              {followerAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── Row 3: Trading toggle ── */}
        {!isUngrouped && (
          <button
            onClick={() => onToggle(group.id)}
            className={`mt-2 w-full flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              isActive
                ? "bg-green-500/15 text-green-600 hover:bg-green-500/25 dark:text-green-400 border border-green-500/30"
                : "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/25"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {isActive ? "Trading ON — click to pause" : "Trading OFF — click to enable"}
          </button>
        )}

        {/* ── Row 4: Group P&L ── */}
        {accounts.length > 0 && (
          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/10">
            <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Group P&L</span>
            <span className={`text-xs font-semibold tabular-nums ${totalPnl >= 0 ? "text-green-500" : "text-red-400"}`}>
              {totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Color palette */}
        {showPalette && !isUngrouped && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {PALETTE.map((color) => (
              <button
                key={color}
                className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  outline: group.color === color ? "2px solid white" : "none",
                  outlineOffset: "1px",
                  boxShadow: group.color === color ? `0 0 0 3px ${color}` : undefined,
                }}
                onClick={() => { onColorChange(group.id, color); setShowPalette(false); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 min-h-[180px] rounded-b-xl p-2 space-y-2 transition-all"
        style={{
          background: isOver ? `${accentColor}12` : isUngrouped ? "rgba(var(--muted)/0.3)" : `${accentColor}06`,
          borderTop: "none",
          borderLeft:   isUngrouped ? `2px dashed ${isOver ? accentColor : "hsl(var(--border))"}` : `1px solid ${isOver ? accentColor + "60" : accentColor + "22"}`,
          borderRight:  isUngrouped ? `2px dashed ${isOver ? accentColor : "hsl(var(--border))"}` : `1px solid ${isOver ? accentColor + "60" : accentColor + "22"}`,
          borderBottom: isUngrouped ? `2px dashed ${isOver ? accentColor : "hsl(var(--border))"}` : `1px solid ${isOver ? accentColor + "60" : accentColor + "22"}`,
          boxShadow: isOver ? `inset 0 0 0 2px ${accentColor}30` : undefined,
        }}
      >
        {/* Paused overlay banner */}
        {!isActive && !isUngrouped && accounts.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-1.5 mb-1">
            <Power className="h-3 w-3 text-red-500/70" />
            <span className="text-[11px] font-semibold text-red-500/80 uppercase tracking-wide">Trading paused</span>
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[140px] pointer-events-none">
            <p className="text-xs font-medium transition-all" style={{ color: isOver ? accentColor : "hsl(var(--muted-foreground))" }}>
              {isOver ? "↓ Release to add" : "Drop accounts here"}
            </p>
          </div>
        ) : (
          accounts.map((account) => (
            <DraggableCard
              key={account.id}
              account={account}
              isDemo={isDemo}
              isMaster={account.id === masterId}
              onConnect={() => onConnect(account.id)}
              onDisconnect={() => onDisconnect(account.id, account.name)}
            />
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
}

export function AccountGroupsView({
  accounts,
  onConnect,
  onDisconnect,
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
    if (isDemo) return;
    const color = PALETTE[groups.length % PALETTE.length];
    persistGroups([...groups, { id: `group-${Date.now()}`, name: `Group ${groups.length + 1}`, color, isActive: true, masterId: null }]);
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

  // ── Drag events ────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const accountId    = active.id as string;
    const targetGroupId = over.id as string;

    if (isDemo) {
      setDemoAssignments((prev) => {
        const next = { ...prev };
        if (targetGroupId === UNGROUPED_ID) delete next[accountId];
        else next[accountId] = targetGroupId;
        return next;
      });
    } else {
      const next = { ...assignments };
      if (targetGroupId === UNGROUPED_ID) delete next[accountId];
      else next[accountId] = targetGroupId;
      persistAssignments(next);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const [subView, setSubView] = useState<"kanban" | "ungrouped">("kanban");

  const activeAccount    = activeId ? displayAccounts.find((a) => a.id === activeId) : null;
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
            Groups
          </Button>
          <Button
            variant={subView === "ungrouped" ? "default" : "ghost"}
            size="sm"
            onClick={() => setSubView("ungrouped")}
            className="relative"
          >
            <Inbox className="h-4 w-4 mr-1.5" />
            Ungrouped
            {ungroupedAccounts.length > 0 && (
              <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary">
                {ungroupedAccounts.length}
              </span>
            )}
          </Button>
        </div>

        {!isDemo && subView === "kanban" && (
          <Button variant="outline" size="sm" onClick={addGroup}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Group
          </Button>
        )}
      </div>

      {/* ── Kanban board ── */}
      {subView === "kanban" && (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
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
                  onConnect={onConnect}
                  onDisconnect={onDisconnect}
                />
              );
            })}

            {!isDemo && groups.length === 0 && (
              <button
                onClick={addGroup}
                className="flex flex-col items-center justify-center w-[280px] shrink-0 h-[220px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
              >
                <Plus className="h-8 w-8 mb-2" />
                <span className="text-sm font-medium">Create your first group</span>
                <span className="text-xs mt-1 opacity-70">Drag accounts here to trade together</span>
              </button>
            )}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeAccount ? (
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
