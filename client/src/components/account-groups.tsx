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
} from "lucide-react";
import type { Account } from "@shared/schema";

// ─── Data model ─────────────────────────────────────────────────────────────

export interface TradingGroup {
  id: string;
  name: string;
  color: string;
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
    return raw ? JSON.parse(raw) : [];
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
  onConnect?: () => void;
  onDisconnect?: () => void;
}

function DraggableCard({
  account,
  isDragOverlay,
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
              <span className="font-semibold text-sm leading-tight truncate max-w-[130px]">
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
              {account.isConnected ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] px-2 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisconnect?.();
                  }}
                >
                  <Unplug className="h-3 w-3 mr-1" />
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-6 text-[11px] px-2 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnect?.();
                  }}
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
  group: { id: string; name: string; color: string };
  accounts: Account[];
  isUngrouped?: boolean;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, name: string) => void;
}

function GroupLane({
  group,
  accounts,
  isUngrouped,
  onRename,
  onDelete,
  onColorChange,
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

  const accentColor = isUngrouped ? "#94a3b8" : group.color;

  return (
    <div className="flex flex-col w-[270px] shrink-0">
      {/* Lane header */}
      <div
        className="rounded-t-xl px-3 py-2"
        style={{
          background: `${accentColor}14`,
          borderTop: `3px solid ${accentColor}`,
          borderLeft: `1px solid ${accentColor}28`,
          borderRight: `1px solid ${accentColor}28`,
        }}
      >
        <div className="flex items-center gap-1.5">
          {/* Color swatch / toggle palette */}
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
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 shrink-0"
                onClick={commitRename}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 shrink-0"
                onClick={() => setEditing(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <span className="text-xs font-semibold flex-1 truncate">
                {group.name}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                {accounts.length}
              </Badge>
              {!isUngrouped && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditName(group.name);
                      setEditing(true);
                      setShowPalette(false);
                    }}
                    title="Rename group"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(group.id)}
                    title="Delete group"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Color palette */}
        {showPalette && !isUngrouped && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {PALETTE.map((color) => (
              <button
                key={color}
                className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  outline:
                    group.color === color ? "2px solid white" : "none",
                  outlineOffset: "1px",
                  boxShadow:
                    group.color === color
                      ? `0 0 0 3px ${color}`
                      : undefined,
                }}
                onClick={() => {
                  onColorChange(group.id, color);
                  setShowPalette(false);
                }}
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
          background: isOver
            ? `${accentColor}12`
            : isUngrouped
            ? "rgba(var(--muted)/0.3)"
            : `${accentColor}06`,
          border: isUngrouped
            ? `2px dashed ${isOver ? accentColor : "hsl(var(--border))"}` 
            : `1px solid ${isOver ? accentColor + "60" : accentColor + "22"}`,
          borderTop: "none",
          boxShadow: isOver ? `inset 0 0 0 2px ${accentColor}30` : undefined,
        }}
      >
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[140px] pointer-events-none">
            <p
              className="text-xs font-medium transition-all"
              style={{ color: isOver ? accentColor : "hsl(var(--muted-foreground))" }}
            >
              {isOver ? "↓ Release to add" : "Drop accounts here"}
            </p>
          </div>
        ) : (
          accounts.map((account) => (
            <DraggableCard
              key={account.id}
              account={account}
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
  const [groups, setGroups] = useState<TradingGroup[]>(loadGroups);
  const [assignments, setAssignments] = useState<Record<string, string>>(
    loadAssignments,
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  // ── Helpers ────────────────────────────────────────────────────────────

  const persistGroups = (next: TradingGroup[]) => {
    setGroups(next);
    saveGroups(next);
  };

  const persistAssignments = (next: Record<string, string>) => {
    setAssignments(next);
    saveAssignments(next);
  };

  const getGroupAccounts = (groupId: string): Account[] => {
    if (groupId === UNGROUPED_ID) {
      return accounts.filter((a) => {
        const g = assignments[a.id];
        return !g || !groups.find((grp) => grp.id === g);
      });
    }
    return accounts.filter((a) => assignments[a.id] === groupId);
  };

  // ── Group actions ──────────────────────────────────────────────────────

  const addGroup = () => {
    const color = PALETTE[groups.length % PALETTE.length];
    const next: TradingGroup = {
      id: `group-${Date.now()}`,
      name: `Group ${groups.length + 1}`,
      color,
    };
    persistGroups([...groups, next]);
  };

  const renameGroup = (id: string, name: string) =>
    persistGroups(groups.map((g) => (g.id === id ? { ...g, name } : g)));

  const deleteGroup = (id: string) => {
    // Return accounts in the deleted group to ungrouped
    const next = { ...assignments };
    Object.keys(next).forEach((accountId) => {
      if (next[accountId] === id) delete next[accountId];
    });
    persistAssignments(next);
    persistGroups(groups.filter((g) => g.id !== id));
  };

  const changeColor = (id: string, color: string) =>
    persistGroups(groups.map((g) => (g.id === id ? { ...g, color } : g)));

  // ── Drag events ────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const accountId = active.id as string;
    const targetGroupId = over.id as string;
    const next = { ...assignments };

    if (targetGroupId === UNGROUPED_ID) {
      delete next[accountId];
    } else {
      next[accountId] = targetGroupId;
    }

    persistAssignments(next);
  };

  // ── Render ─────────────────────────────────────────────────────────────

  const activeAccount = activeId
    ? accounts.find((a) => a.id === activeId)
    : null;

  const lanes = [
    { id: UNGROUPED_ID, name: "Ungrouped", color: "#94a3b8", isUngrouped: true as const },
    ...groups.map((g) => ({ ...g, isUngrouped: false as const })),
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Drag accounts between groups to organize your trading setup
        </p>
        <Button variant="outline" size="sm" onClick={addGroup}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Group
        </Button>
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {lanes.map((lane) => (
            <GroupLane
              key={lane.id}
              group={lane}
              accounts={getGroupAccounts(lane.id)}
              isUngrouped={lane.isUngrouped}
              onRename={renameGroup}
              onDelete={deleteGroup}
              onColorChange={changeColor}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
            />
          ))}

          {/* Add group button as a lane placeholder */}
          {groups.length === 0 && (
            <button
              onClick={addGroup}
              className="flex flex-col items-center justify-center w-[270px] shrink-0 h-[220px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary group"
            >
              <Plus className="h-8 w-8 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-sm font-medium">Create your first group</span>
              <span className="text-xs mt-1 opacity-70">Drag accounts here to trade together</span>
            </button>
          )}
        </div>

        {/* Drag overlay — ghost card that follows the cursor */}
        <DragOverlay dropAnimation={null}>
          {activeAccount ? (
            <DraggableCard account={activeAccount} isDragOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
