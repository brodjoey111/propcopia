import { useDraggable } from "@dnd-kit/core";
import { Crown, GripVertical } from "lucide-react";

interface AccountGroupMasterTokenProps {
  groupId: string;
  masterName: string | null;
  hasWarning: boolean;
}

export function getAccountGroupMasterTokenContainerClass(input: {
  hasWarning: boolean;
  masterName: string | null;
}) {
  if (input.hasWarning) {
    return "bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25";
  }

  if (input.masterName) {
    return "bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20";
  }

  return "bg-muted/60 border border-border/60 hover:bg-muted";
}

export function getAccountGroupMasterTokenIconClass(input: {
  hasWarning: boolean;
  masterName: string | null;
}) {
  return input.hasWarning || input.masterName
    ? "text-amber-500"
    : "text-muted-foreground/40";
}

export function getAccountGroupMasterTokenLabelClass(input: {
  hasWarning: boolean;
  masterName: string | null;
}) {
  if (input.hasWarning) {
    return "text-amber-600 dark:text-amber-400";
  }

  if (input.masterName) {
    return "text-foreground/80";
  }

  return "text-muted-foreground/60";
}

export function getAccountGroupMasterTokenLabel(input: {
  hasWarning: boolean;
  masterName: string | null;
}) {
  if (input.hasWarning) {
    return "Set a master";
  }

  return input.masterName ?? "No master";
}

export function getAccountGroupMasterTokenDragOpacityClass(
  isDragging: boolean,
) {
  return isDragging ? "opacity-20" : "opacity-100";
}

export function AccountGroupMasterToken({
  groupId,
  masterName,
  hasWarning,
}: AccountGroupMasterTokenProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `master-token:${groupId}`,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px,${transform.y}px,0)` }
    : undefined;
  const containerToneClass = getAccountGroupMasterTokenContainerClass({
    hasWarning,
    masterName,
  });
  const iconToneClass = getAccountGroupMasterTokenIconClass({
    hasWarning,
    masterName,
  });
  const labelToneClass = getAccountGroupMasterTokenLabelClass({
    hasWarning,
    masterName,
  });
  const label = getAccountGroupMasterTokenLabel({
    hasWarning,
    masterName,
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      title="Drag onto an account to make it the master"
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md cursor-grab active:cursor-grabbing touch-none select-none transition-opacity ${getAccountGroupMasterTokenDragOpacityClass(
        isDragging,
      )} ${containerToneClass}`}
    >
      <Crown className={`h-3 w-3 shrink-0 ${iconToneClass}`} />
      <span className={`text-[11px] font-medium max-w-[140px] truncate ${labelToneClass}`}>
        {label}
      </span>
      <GripVertical className="h-3 w-3 text-muted-foreground/25 shrink-0" />
    </div>
  );
}
