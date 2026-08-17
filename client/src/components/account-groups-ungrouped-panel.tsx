import type { ReactNode } from "react";
import { DndContext, type PointerSensor, type TouchSensor } from "@dnd-kit/core";
import { Inbox } from "lucide-react";
import type { Account } from "@shared/schema";

interface AccountGroupsUngroupedPanelProps {
  accounts: Account[];
  sensors: ReturnType<typeof import("@dnd-kit/core").useSensors>;
  renderAccountCard: (account: Account) => ReactNode;
}

export function shouldShowAccountGroupsUngroupedEmptyState(
  accountsCount: number,
) {
  return accountsCount === 0;
}

export function getAccountGroupsUngroupedCountLabel(accountsCount: number) {
  return `${accountsCount} account${accountsCount !== 1 ? "s" : ""} not assigned to any group.`;
}

export function getAccountGroupsUngroupedBoardHint() {
  return "Switch to Board to drag accounts between groups.";
}

export function AccountGroupsUngroupedPanel({
  accounts,
  sensors,
  renderAccountCard,
}: AccountGroupsUngroupedPanelProps) {
  if (shouldShowAccountGroupsUngroupedEmptyState(accounts.length)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[260px] rounded-xl border-2 border-dashed border-border text-center p-8">
        <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">All accounts are in a group</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {getAccountGroupsUngroupedBoardHint()}
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground mb-3">
        {getAccountGroupsUngroupedCountLabel(accounts.length)}{" "}
        {getAccountGroupsUngroupedBoardHint().replace(
          "between groups.",
          "into place.",
        )}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {accounts.map((account) => (
          <DndContext key={account.id} sensors={sensors}>
            {renderAccountCard(account)}
          </DndContext>
        ))}
      </div>
    </>
  );
}
