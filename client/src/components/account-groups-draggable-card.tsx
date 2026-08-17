import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Crown, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AccountGroupCardConnectionAction } from "@/components/account-group-card-connection-action";
import { AccountGroupCardHeader } from "@/components/account-group-card-header";
import type { Account } from "@shared/schema";

export interface AccountGroupsDraggableCardProps {
  account: Account;
  isDragOverlay?: boolean;
  isDemo?: boolean;
  compactView?: boolean;
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

export function getAccountGroupsDraggableCardBalance(
  balance: Account["balance"],
) {
  return balance ? parseFloat(String(balance)) : 0;
}

export function getAccountGroupsDraggableCardPnl(pnl: Account["pnl"]) {
  return pnl ? parseFloat(String(pnl)) : 0;
}

export function getAccountGroupsDraggableCardBadgeLabel(input: {
  accountType: Account["accountType"];
  isMaster?: boolean;
}) {
  if (input.isMaster === undefined) {
    return input.accountType;
  }

  return input.isMaster ? "master" : "follower";
}

export function getAccountGroupsDraggableCardRiskToneClass(
  riskStatusTone: "ok" | "warn" | "danger" | "muted",
) {
  if (riskStatusTone === "ok") {
    return "border-emerald-400/20 text-emerald-300";
  }

  if (riskStatusTone === "warn") {
    return "border-amber-400/20 text-amber-300";
  }

  if (riskStatusTone === "danger") {
    return "border-red-400/20 text-red-300";
  }

  return "text-muted-foreground";
}

export function getAccountGroupsDraggableCardConnectionState(
  isConnected?: boolean,
) {
  return {
    label: isConnected ? "Live" : "Off",
    dotClass: isConnected ? "bg-green-500" : "bg-muted-foreground/40",
    textClass: isConnected ? "text-emerald-600" : "text-muted-foreground",
  };
}

export function getAccountGroupsDraggableCardPnlToneClass(pnl: number) {
  return pnl >= 0 ? "text-green-600" : "text-red-500";
}

export function getAccountGroupsDraggableCardPnlLabel(pnl: number) {
  return `${pnl >= 0 ? "+" : ""}$${Math.abs(pnl).toLocaleString()}`;
}

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

export function AccountGroupsDraggableCard({
  account,
  isDragOverlay,
  isDemo,
  compactView = false,
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
}: AccountGroupsDraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: account.id });
  const { setNodeRef: setDropRef, isOver: isMasterOver } = useDroppable({
    id: `master-drop:${account.id}`,
  });

  const setNodeRef = (el: HTMLDivElement | null) => {
    setDragRef(el);
    setDropRef(el);
  };

  const balance = getAccountGroupsDraggableCardBalance(account.balance);
  const pnl = getAccountGroupsDraggableCardPnl(account.pnl);
  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined;
  const badgeLabel = getAccountGroupsDraggableCardBadgeLabel({
    accountType: account.accountType,
    isMaster,
  });
  const riskToneClass = getAccountGroupsDraggableCardRiskToneClass(
    riskStatusTone,
  );
  const connectionState = getAccountGroupsDraggableCardConnectionState(
    Boolean(account.isConnected),
  );

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
          <div
            ref={setActivatorNodeRef}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors touch-none"
            title="Drag to move"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            <AccountGroupCardHeader
              accountName={account.name}
              badgeLabel={badgeLabel}
              badgeVariant={badgeLabel === "master" ? "default" : "secondary"}
              isDisabled={isDisabled}
              riskStatusLabel={riskStatusLabel}
              riskToneClass={riskToneClass}
              masterAdornment={
                isMaster && !isDisabled
                  ? (
                    groupId && !isDragOverlay
                      ? <DraggableCrownOnCard groupId={groupId} accountId={account.id} />
                      : <span title="Active master — followers copy this account" className="shrink-0">
                          <Crown className="h-3 w-3 text-amber-500" />
                        </span>
                  )
                  : undefined
              }
              onToggleEnabled={!isDragOverlay ? onToggleEnabled : undefined}
            />

            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {account.platform}
            </p>

            {compactView ? (
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span
                  className={`inline-flex items-center gap-1 ${connectionState.textClass}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${connectionState.dotClass}`}
                  />
                  {connectionState.label}
                </span>
                <span className="text-muted-foreground">
                  Compact view keeps account detail lighter.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${connectionState.dotClass}`}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {connectionState.label}
                  </span>
                </div>
                <span className="text-[11px] font-medium tabular-nums">
                  ${balance.toLocaleString()}
                </span>
                <span
                  className={`text-[11px] font-medium tabular-nums ${getAccountGroupsDraggableCardPnlToneClass(
                    pnl,
                  )}`}
                >
                  {getAccountGroupsDraggableCardPnlLabel(pnl)}
                </span>
              </div>
            )}

            <div className="mt-2">
              <AccountGroupCardConnectionAction
                isDemo={isDemo}
                isConnected={Boolean(account.isConnected)}
                accountActionDisabled={accountActionDisabled}
                connectButtonLabel={connectButtonLabel}
                disconnectButtonLabel={disconnectButtonLabel}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
