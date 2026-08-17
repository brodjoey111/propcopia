import { Button } from "@/components/ui/button";
import { Inbox, Layers, Plus } from "lucide-react";

export const ACCOUNT_GROUPS_BOARD_SUB_VIEW_OPTIONS = [
  {
    value: "kanban",
    label: "Board",
    Icon: Layers,
  },
  {
    value: "ungrouped",
    label: "Ungrouped",
    Icon: Inbox,
  },
] as const;

export const ACCOUNT_GROUPS_BOARD_VIEW_OPTIONS = [
  {
    value: "compact",
    label: "Compact view",
  },
  {
    value: "detailed",
    label: "Detailed view",
  },
] as const;

export function shouldShowAccountGroupsBoardKanbanControls(
  subView: "kanban" | "ungrouped",
) {
  return subView === "kanban";
}

interface AccountGroupsBoardToolbarProps {
  subView: "kanban" | "ungrouped";
  boardView: "compact" | "detailed";
  onSubViewChange: (view: "kanban" | "ungrouped") => void;
  onBoardViewChange: (view: "compact" | "detailed") => void;
  onAddGroup: () => void;
}

export function AccountGroupsBoardToolbar({
  subView,
  boardView,
  onSubViewChange,
  onBoardViewChange,
  onAddGroup,
}: AccountGroupsBoardToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {ACCOUNT_GROUPS_BOARD_SUB_VIEW_OPTIONS.map(({ value, label, Icon }) => (
          <Button
            key={value}
            variant={subView === value ? "default" : "ghost"}
            size="sm"
            onClick={() => onSubViewChange(value)}
          >
            <Icon className="h-4 w-4 mr-1.5" />
            {label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {shouldShowAccountGroupsBoardKanbanControls(subView) && (
          <div className="flex gap-1 rounded-lg border border-border bg-background/80 p-1">
            {ACCOUNT_GROUPS_BOARD_VIEW_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                variant={boardView === value ? "default" : "ghost"}
                size="sm"
                onClick={() => onBoardViewChange(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
        {shouldShowAccountGroupsBoardKanbanControls(subView) && (
          <Button variant="default" onClick={onAddGroup} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Group
          </Button>
        )}
      </div>
    </div>
  );
}
