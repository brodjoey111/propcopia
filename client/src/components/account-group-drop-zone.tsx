import type { ReactNode } from "react";
import type { Account } from "@shared/schema";

interface AccountGroupDropZoneProps {
  accounts: Account[];
  accentColor: string;
  isOver: boolean;
  isUngrouped?: boolean;
  setNodeRef: (node: HTMLDivElement | null) => void;
  effectiveMasterId: string | null;
  renderAccountCard: (account: Account) => ReactNode;
}

export function getAccountGroupDropZoneEmptyLabel(isOver: boolean) {
  return isOver ? "Release to add" : "Drop accounts here";
}

export function sortAccountGroupDropZoneAccounts(
  accounts: Account[],
  effectiveMasterId: string | null,
) {
  return [...accounts].sort((left, right) => {
    if (left.id === effectiveMasterId) return -1;
    if (right.id === effectiveMasterId) return 1;
    return 0;
  });
}

export function AccountGroupDropZone({
  accounts,
  accentColor,
  isOver,
  isUngrouped,
  setNodeRef,
  effectiveMasterId,
  renderAccountCard,
}: AccountGroupDropZoneProps) {
  return (
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
          <p
            className="text-xs font-medium transition-all"
            style={{ color: isOver ? accentColor : "hsl(var(--muted-foreground))" }}
          >
            {getAccountGroupDropZoneEmptyLabel(isOver)}
          </p>
        </div>
      ) : (
        sortAccountGroupDropZoneAccounts(accounts, effectiveMasterId).map((account) =>
          renderAccountCard(account),
        )
      )}
    </div>
  );
}
