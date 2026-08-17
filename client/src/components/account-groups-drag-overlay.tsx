import { AccountGroupsMasterDragBadge } from "@/components/account-groups-master-drag-badge";
import React, { type ReactNode } from "react";

interface AccountGroupsDragOverlayProps {
  overlayCard: ReactNode;
}

export function resolveAccountGroupsDragOverlayContent(
  overlayCard: ReactNode,
) {
  return overlayCard ?? <AccountGroupsMasterDragBadge />;
}

export function AccountGroupsDragOverlay({ overlayCard }: AccountGroupsDragOverlayProps) {
  return resolveAccountGroupsDragOverlayContent(overlayCard);
}
