import { AccountGroupsDraggableCard } from "@/components/account-groups-draggable-card";
import { AccountGroupsMasterDragBadge } from "@/components/account-groups-master-drag-badge";
import type { Account } from "@shared/schema";

interface AccountGroupsBoardOverlayProps {
  isMasterTokenDrag: boolean;
  activeAccount: Account | null;
  isDemo: boolean;
}

export function getAccountGroupsBoardOverlayMode(input: {
  isMasterTokenDrag: boolean;
  activeAccount: Account | null;
}) {
  if (input.isMasterTokenDrag) {
    return "master-badge" as const;
  }

  if (!input.activeAccount) {
    return "empty" as const;
  }

  return "account-card" as const;
}

export function AccountGroupsBoardOverlay({
  isMasterTokenDrag,
  activeAccount,
  isDemo,
}: AccountGroupsBoardOverlayProps) {
  const mode = getAccountGroupsBoardOverlayMode({
    isMasterTokenDrag,
    activeAccount,
  });

  if (mode === "master-badge") {
    return <AccountGroupsMasterDragBadge />;
  }

  if (mode === "empty") {
    return null;
  }

  const overlayAccount = activeAccount;
  if (!overlayAccount) {
    return null;
  }

  return (
    <AccountGroupsDraggableCard
      account={overlayAccount}
      isDragOverlay
      isDemo={isDemo}
    />
  );
}
