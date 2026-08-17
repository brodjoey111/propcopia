import { AccountGroupsBoardContent } from "@/components/account-groups-board-content";
import { AccountGroupsBoardToolbar } from "@/components/account-groups-board-toolbar";
import { AccountGroupsDemoBanner } from "@/components/account-groups-demo-banner";
import { useAccountGroupsController } from "@/hooks/use-account-groups-controller";
import type { AccountRiskItem } from "@/lib/account-risk";
import type { Account } from "@shared/schema";

interface AccountGroupsViewProps {
  accounts: Account[];
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, name: string) => void;
  accountActionDisabled?: boolean;
  getConnectButtonLabel?: (accountId: string) => string;
  getDisconnectButtonLabel?: (accountId: string) => string;
  accountRiskById?: Record<string, AccountRiskItem | undefined>;
  addGroupTrigger?: number;
}

export function AccountGroupsView({
  accounts,
  onConnect,
  onDisconnect,
  accountActionDisabled = false,
  getConnectButtonLabel,
  getDisconnectButtonLabel,
  accountRiskById = {},
  addGroupTrigger,
}: AccountGroupsViewProps) {
  const {
    isDemo,
    bannerDismissed,
    dismissBanner,
    boardView,
    setBoardView,
    subView,
    setSubView,
    sensors,
    addGroup,
    boardContentState,
  } = useAccountGroupsController({
    accounts,
    onConnect,
    onDisconnect,
    accountActionDisabled,
    getConnectButtonLabel,
    getDisconnectButtonLabel,
    accountRiskById,
    addGroupTrigger,
  });

  return (
    <div className="flex flex-col gap-4">
      {isDemo && !bannerDismissed && (
        <AccountGroupsDemoBanner onDismiss={dismissBanner} />
      )}

      <AccountGroupsBoardToolbar
        subView={subView}
        boardView={boardView}
        onSubViewChange={setSubView}
        onBoardViewChange={setBoardView}
        onAddGroup={addGroup}
      />

      <AccountGroupsBoardContent
        subView={subView}
        sensors={sensors}
        {...boardContentState}
      />
    </div>
  );
}
