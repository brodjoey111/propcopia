import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Power } from "lucide-react";

interface AccountGroupCardHeaderProps {
  accountName: string;
  badgeLabel: string;
  badgeVariant: "default" | "secondary";
  isDisabled?: boolean;
  riskStatusLabel?: string;
  riskToneClass: string;
  masterAdornment?: ReactNode;
  onToggleEnabled?: () => void;
}

export function getAccountGroupCardHeaderToggleTitle(isDisabled?: boolean) {
  return isDisabled ? "Re-enable this account" : "Pause this account";
}

export function getAccountGroupCardHeaderToggleToneClass(isDisabled?: boolean) {
  return isDisabled
    ? "text-red-500 hover:text-green-500"
    : "text-muted-foreground/30 hover:text-red-500";
}

export function shouldShowAccountGroupCardPausedBadge(isDisabled?: boolean) {
  return Boolean(isDisabled);
}

export function AccountGroupCardHeader({
  accountName,
  badgeLabel,
  badgeVariant,
  isDisabled,
  riskStatusLabel,
  riskToneClass,
  masterAdornment,
  onToggleEnabled,
}: AccountGroupCardHeaderProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {masterAdornment}
      <span className="font-semibold text-sm leading-tight truncate max-w-[100px]">
        {accountName}
      </span>
      <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0 h-4 shrink-0">
        {badgeLabel}
      </Badge>
      {shouldShowAccountGroupCardPausedBadge(isDisabled) && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0 border-red-500/40 text-red-500">
          Paused
        </Badge>
      )}
      {riskStatusLabel && (
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${riskToneClass}`}>
          {riskStatusLabel}
        </Badge>
      )}
      {onToggleEnabled && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggleEnabled();
          }}
          title={getAccountGroupCardHeaderToggleTitle(isDisabled)}
          className={`ml-auto shrink-0 rounded p-0.5 transition-colors ${getAccountGroupCardHeaderToggleToneClass(
            isDisabled,
          )}`}
        >
          <Power className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
