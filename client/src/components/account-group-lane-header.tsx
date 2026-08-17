import type { ReactNode } from "react";
import { AccountGroupHistoryDialog } from "@/components/account-group-history-dialog";
import { RiskSettingsDialog, DEFAULT_RISK_SETTINGS, type RiskSettings } from "@/components/risk-settings-dialog";
import { buildRecoveryActionPlan } from "@/hooks/use-account-group-runtime-strip-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CopyGroupActivity,
  CopyGroupObservability,
  CopyGroupRuntimeSummary,
  CopyGroupStatus,
} from "@/lib/copy-groups";
import type { Account } from "@shared/schema";
import { Check, Pencil, Power, ShieldAlert, Trash2, X } from "lucide-react";

export function getAccountGroupLaneStatusBadgeToneClass(
  resolvedRuntimeStatus: CopyGroupStatus,
) {
  if (resolvedRuntimeStatus === "RUNNING") {
    return "border-emerald-500/30 bg-emerald-500/15 text-emerald-400";
  }

  if (resolvedRuntimeStatus === "PAUSED") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  }

  if (resolvedRuntimeStatus === "EMERGENCY_STOPPED") {
    return "border-red-500/30 bg-red-500/10 text-red-400";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-300";
}

export function getAccountGroupLaneStatusLabel(
  resolvedRuntimeStatus: CopyGroupStatus,
) {
  if (resolvedRuntimeStatus === "RUNNING") {
    return "Running";
  }

  if (resolvedRuntimeStatus === "PAUSED") {
    return "Paused";
  }

  if (resolvedRuntimeStatus === "EMERGENCY_STOPPED") {
    return "Emergency Stop";
  }

  if (
    resolvedRuntimeStatus === "STARTING" ||
    resolvedRuntimeStatus === "STOPPING"
  ) {
    return "Updating";
  }

  return "Ready";
}

export function getAccountGroupLanePrimaryAction(input: {
  groupId: string;
  resolvedRuntimeStatus: CopyGroupStatus;
  lifecycleActionPending: boolean;
  hasMasterWarning: boolean;
  onStartGroup?: (groupId: string) => void;
  onPauseGroup?: (groupId: string) => void;
  onResumeGroup?: (groupId: string) => void;
  onResetGroup?: (groupId: string) => void;
}) {
  if (input.resolvedRuntimeStatus === "RUNNING") {
    return {
      label: "Pause",
      variant: "outline" as const,
      disabled: input.lifecycleActionPending,
      onClick: () => input.onPauseGroup?.(input.groupId),
    };
  }

  if (input.resolvedRuntimeStatus === "PAUSED") {
    return {
      label: "Resume",
      variant: "default" as const,
      disabled: input.lifecycleActionPending,
      onClick: () => input.onResumeGroup?.(input.groupId),
    };
  }

  if (input.resolvedRuntimeStatus === "EMERGENCY_STOPPED") {
    return {
      label: "Clear Stop",
      variant: "outline" as const,
      disabled: input.lifecycleActionPending,
      onClick: () => input.onResetGroup?.(input.groupId),
    };
  }

  return {
    label: "Start",
    variant: "default" as const,
    disabled: input.lifecycleActionPending || input.hasMasterWarning,
    onClick: () => input.onStartGroup?.(input.groupId),
  };
}

export function shouldShowAccountGroupEmergencyAction(
  resolvedRuntimeStatus: CopyGroupStatus,
) {
  return (
    resolvedRuntimeStatus === "RUNNING" ||
    resolvedRuntimeStatus === "PAUSED"
  );
}

interface AccountGroupLaneHeaderProps {
  group: { id: string; name: string; color: string; masterId?: string | null };
  accounts: Account[];
  isUngrouped?: boolean;
  isDemo?: boolean;
  totalPnl: number;
  accentColor: string;
  isActive: boolean;
  editing: boolean;
  editName: string;
  setEditName: (value: string) => void;
  setEditing: (value: boolean) => void;
  showPalette: boolean;
  setShowPalette: (value: boolean | ((current: boolean) => boolean)) => void;
  commitRename: () => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  masterToken?: ReactNode;
  resolvedRuntimeStatus: CopyGroupStatus;
  lifecycleActionPending: boolean;
  onStartGroup?: (groupId: string) => void;
  onPauseGroup?: (groupId: string) => void;
  onResumeGroup?: (groupId: string) => void;
  onEmergencyStopGroup?: (groupId: string) => void;
  onResetGroup?: (groupId: string) => void;
  hasMasterWarning: boolean;
  riskSettings?: Partial<RiskSettings>;
  onSaveRisk?: (groupId: string, settings: RiskSettings) => void;
  onClearRisk?: (groupId: string) => void;
  groupRiskToneClass: string;
  groupBoardStateLabel: string;
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  historyActivity: CopyGroupActivity[];
  historyObservability: CopyGroupObservability | null;
  historyLoading: boolean;
  historyError: string | null;
  palette: readonly string[];
  runtimeSummary?: CopyGroupRuntimeSummary;
  groupBoardState: {
    tone: "ok" | "warn" | "danger" | "muted";
    label: string;
    detail: string;
  };
  latestOperatorAction?: string | null;
  holdReason?: string | null;
}

export function AccountGroupLaneHeader({
  group,
  accounts,
  isUngrouped,
  isDemo,
  totalPnl,
  accentColor,
  isActive,
  editing,
  editName,
  setEditName,
  setEditing,
  showPalette,
  setShowPalette,
  commitRename,
  onDelete,
  onColorChange,
  masterToken,
  resolvedRuntimeStatus,
  lifecycleActionPending,
  onStartGroup,
  onPauseGroup,
  onResumeGroup,
  onEmergencyStopGroup,
  onResetGroup,
  hasMasterWarning,
  riskSettings,
  onSaveRisk,
  onClearRisk,
  groupRiskToneClass,
  groupBoardStateLabel,
  historyOpen,
  setHistoryOpen,
  historyActivity,
  historyObservability,
  historyLoading,
  historyError,
  palette,
  runtimeSummary,
  groupBoardState,
  latestOperatorAction,
  holdReason,
}: AccountGroupLaneHeaderProps) {
  const recoveryActionPlan = buildRecoveryActionPlan({
    resolvedRuntimeStatus,
    hasMasterWarning,
    lifecycleActionPending,
    runtimeSummary,
    groupBoardState,
    latestOperatorAction,
    holdReason,
  });
  const primaryAction = getAccountGroupLanePrimaryAction({
    groupId: group.id,
    resolvedRuntimeStatus,
    lifecycleActionPending,
    hasMasterWarning,
    onStartGroup,
    onPauseGroup,
    onResumeGroup,
    onResetGroup,
  });

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 flex-wrap"
      style={{
        background: `${accentColor}12`,
        borderLeft: `4px solid ${isActive ? accentColor : "#94a3b8"}`,
      }}
    >
      {!isUngrouped && (
        <div className="relative shrink-0">
          <button
            className="h-3 w-3 rounded-full ring-1 ring-white/20 hover:scale-110 transition-transform"
            style={{ backgroundColor: group.color }}
            onClick={() => setShowPalette((current) => !current)}
            title="Change color"
          />
          {showPalette && (
            <div className="absolute top-5 left-0 z-20 flex gap-1.5 flex-wrap p-2.5 rounded-lg border bg-popover shadow-xl w-[136px]">
              {palette.map((color) => (
                <button
                  key={color}
                  className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    outline: group.color === color ? "2px solid white" : "none",
                    outlineOffset: "1px",
                    boxShadow: group.color === color ? `0 0 0 3px ${color}40` : undefined,
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
      )}

      {editing ? (
        <div className="flex items-center gap-1 flex-1 min-w-[140px]">
          <Input
            autoFocus
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitRename();
              if (event.key === "Escape") setEditing(false);
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
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => {
            setEditName(group.name);
            setEditing(true);
            setShowPalette(false);
          }}
          title="Rename group"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        {!isUngrouped && !isDemo && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(group.id)}
            title="Delete group"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {!isUngrouped && <div className="h-4 w-px bg-border/60 shrink-0" />}
      {!isUngrouped && masterToken}
      {!isUngrouped && <div className="h-4 w-px bg-border/60 shrink-0" />}

      {!isUngrouped && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold shrink-0 border ${getAccountGroupLaneStatusBadgeToneClass(
            resolvedRuntimeStatus,
          )}`}
        >
          <Power className="h-3 w-3" />
          {getAccountGroupLaneStatusLabel(resolvedRuntimeStatus)}
        </span>
      )}

      {!isUngrouped && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant={primaryAction.variant}
            className="h-7 text-[11px]"
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
          >
            {primaryAction.label}
          </Button>

          {shouldShowAccountGroupEmergencyAction(resolvedRuntimeStatus) && (
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

      {!isUngrouped && resolvedRuntimeStatus !== "EMERGENCY_STOPPED" && isActive && (
        riskSettings ? (
          <span className="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5 text-[10px] font-semibold tracking-wide bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
            <ShieldAlert className="h-2.5 w-2.5" />
            Risk Settings - Custom
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
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25 shrink-0 select-none">
            <ShieldAlert className="h-2.5 w-2.5" />
            Risk Settings - Global
          </span>
        )
      )}

      {!isUngrouped && (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide shrink-0 ${groupRiskToneClass}`}>
          <ShieldAlert className="h-2.5 w-2.5" />
          {groupBoardStateLabel}
        </span>
      )}

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
            {riskSettings && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />}
          </button>
        </RiskSettingsDialog>
      )}

      {!isUngrouped && (
        <AccountGroupHistoryDialog
          groupName={group.name}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          historyActivity={historyActivity}
          historyObservability={historyObservability}
          historyLoading={historyLoading}
          historyError={historyError}
        />
      )}

      {accounts.length > 0 && (
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">P&L</span>
          <span className={`text-sm font-semibold tabular-nums ${totalPnl >= 0 ? "text-green-500" : "text-red-400"}`}>
            {totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {recoveryActionPlan && !isUngrouped && (
        <div className={`w-full rounded-lg border px-3 py-2 text-xs ${recoveryActionPlan.toneClass}`}>
          <span className="font-semibold uppercase tracking-[0.18em]">
            {recoveryActionPlan.label}
          </span>
          <p className="mt-1 normal-case tracking-normal text-current/90">
            {recoveryActionPlan.detail}
          </p>
        </div>
      )}
    </div>
  );
}
