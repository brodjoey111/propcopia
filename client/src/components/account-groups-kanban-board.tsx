import { DndContext, DragOverlay } from "@dnd-kit/core";
import type { ComponentProps, ReactNode } from "react";
import { Plus } from "lucide-react";
import { AccountGroupsDragOverlay } from "@/components/account-groups-drag-overlay";

export function calculateAccountGroupsLaneTotalPnl(
  accounts: Array<{ pnl?: string | number | null }>,
) {
  return accounts.reduce(
    (sum, account) => sum + (account.pnl ? parseFloat(String(account.pnl)) : 0),
    0,
  );
}

export function getAccountGroupsKanbanBoardAddGroupLabel() {
  return "Add Group";
}

interface AccountGroupsKanbanBoardProps<TLane extends { id: string }> {
  sensors: ComponentProps<typeof DndContext>["sensors"];
  lanes: TLane[];
  getGroupAccounts: (groupId: string) => { pnl?: string | number | null }[];
  onDragStart: ComponentProps<typeof DndContext>["onDragStart"];
  onDragEnd: ComponentProps<typeof DndContext>["onDragEnd"];
  onAddGroup: () => void;
  renderLane: (lane: TLane, totalPnl: number) => ReactNode;
  renderOverlay: ReactNode;
}

export function AccountGroupsKanbanBoard<TLane extends { id: string }>({
  sensors,
  lanes,
  getGroupAccounts,
  onDragStart,
  onDragEnd,
  onAddGroup,
  renderLane,
  renderOverlay,
}: AccountGroupsKanbanBoardProps<TLane>) {
  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-4">
        {lanes.map((lane) => {
          const laneAccounts = getGroupAccounts(lane.id);
          const totalPnl = calculateAccountGroupsLaneTotalPnl(laneAccounts);

          return renderLane(lane, totalPnl);
        })}

        <button
          onClick={onAddGroup}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary py-4"
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm font-medium">
            {getAccountGroupsKanbanBoardAddGroupLabel()}
          </span>
        </button>
      </div>

      <DragOverlay dropAnimation={null}>
        <AccountGroupsDragOverlay overlayCard={renderOverlay} />
      </DragOverlay>
    </DndContext>
  );
}
