import type { ReactNode } from "react";

interface AccountGroupMasterSlotProps {
  isOver: boolean;
  title?: string;
  setNodeRef: (element: HTMLDivElement | null) => void;
  children: ReactNode;
}

export function getAccountGroupMasterSlotStateClass(isOver: boolean) {
  return isOver ? "ring-2 ring-red-400/70 bg-red-500/10" : "";
}

export function AccountGroupMasterSlot({
  isOver,
  title,
  setNodeRef,
  children,
}: AccountGroupMasterSlotProps) {
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-1 shrink-0 rounded-md transition-all ${getAccountGroupMasterSlotStateClass(
        isOver,
      )}`}
      title={title}
    >
      {children}
    </div>
  );
}
