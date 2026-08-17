import { buildAccountGroupCardConnectionBindings } from "@/components/account-group-card-action-bindings";
import { AccountGroupDropZone } from "@/components/account-group-drop-zone";
import { AccountGroupsDraggableCard } from "@/components/account-groups-draggable-card";
import { toAccountRiskBadgeView, type AccountRiskItem } from "@/lib/account-risk";
import type { Account } from "@shared/schema";

interface AccountGroupLaneCardsProps {
  accounts: Account[];
  accentColor: string;
  isOver: boolean;
  isUngrouped?: boolean;
  setNodeRef: (node: HTMLDivElement | null) => void;
  effectiveMasterId: string | null;
  isDemo?: boolean;
  compactView?: boolean;
  disabledIds: string[];
  groupId: string;
  onToggleAccount: (groupId: string, accountId: string) => void;
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, name: string) => void;
  accountActionDisabled?: boolean;
  getConnectButtonLabel?: (accountId: string) => string;
  getDisconnectButtonLabel?: (accountId: string) => string;
  accountRiskById?: Record<string, AccountRiskItem | undefined>;
}

export function buildAccountGroupLaneToggleEnabledAction(input: {
  isUngrouped?: boolean;
  groupId: string;
  accountId: string;
  onToggleAccount: (groupId: string, accountId: string) => void;
}) {
  if (input.isUngrouped) {
    return undefined;
  }

  return () => input.onToggleAccount(input.groupId, input.accountId);
}

export function AccountGroupLaneCards({
  accounts,
  accentColor,
  isOver,
  isUngrouped,
  setNodeRef,
  effectiveMasterId,
  isDemo,
  compactView,
  disabledIds,
  groupId,
  onToggleAccount,
  onConnect,
  onDisconnect,
  accountActionDisabled,
  getConnectButtonLabel,
  getDisconnectButtonLabel,
  accountRiskById = {},
}: AccountGroupLaneCardsProps) {
  return (
    <AccountGroupDropZone
      accounts={accounts}
      accentColor={accentColor}
      isOver={isOver}
      isUngrouped={isUngrouped}
      setNodeRef={setNodeRef}
      effectiveMasterId={effectiveMasterId}
      renderAccountCard={(account) => (
        <AccountGroupLaneCard
          key={account.id}
          account={account}
          isDemo={isDemo}
          compactView={compactView}
          isMaster={isUngrouped ? undefined : account.id === effectiveMasterId}
          isDisabled={disabledIds.includes(account.id)}
          groupId={isUngrouped ? undefined : groupId}
          onToggleEnabled={buildAccountGroupLaneToggleEnabledAction({
            isUngrouped,
            groupId,
            accountId: account.id,
            onToggleAccount,
          })}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          accountActionDisabled={accountActionDisabled}
          getConnectButtonLabel={getConnectButtonLabel}
          getDisconnectButtonLabel={getDisconnectButtonLabel}
          accountRiskById={accountRiskById}
        />
      )}
    />
  );
}

interface AccountGroupLaneCardProps {
  account: Account;
  isDemo?: boolean;
  compactView?: boolean;
  isMaster?: boolean;
  isDisabled?: boolean;
  groupId?: string;
  onToggleEnabled?: () => void;
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, name: string) => void;
  accountActionDisabled?: boolean;
  getConnectButtonLabel?: (accountId: string) => string;
  getDisconnectButtonLabel?: (accountId: string) => string;
  accountRiskById: Record<string, AccountRiskItem | undefined>;
}

function AccountGroupLaneCard({
  account,
  isDemo,
  compactView,
  isMaster,
  isDisabled,
  groupId,
  onToggleEnabled,
  onConnect,
  onDisconnect,
  accountActionDisabled,
  getConnectButtonLabel,
  getDisconnectButtonLabel,
  accountRiskById,
}: AccountGroupLaneCardProps) {
  const connectionBindings = buildAccountGroupCardConnectionBindings({
    account,
    onConnect,
    onDisconnect,
  });
  const riskBadge = toAccountRiskBadgeView(accountRiskById[account.id]);

  return (
    <div className="w-[260px]">
      <AccountGroupsDraggableCard
        account={account}
        isDemo={isDemo}
        compactView={compactView}
        isMaster={isMaster}
        isDisabled={isDisabled}
        groupId={groupId}
        onToggleEnabled={onToggleEnabled}
        onConnect={connectionBindings.onConnect}
        onDisconnect={connectionBindings.onDisconnect}
        accountActionDisabled={accountActionDisabled}
        connectButtonLabel={getConnectButtonLabel?.(account.id)}
        disconnectButtonLabel={getDisconnectButtonLabel?.(account.id)}
        riskStatusLabel={riskBadge.label}
        riskStatusTone={riskBadge.tone}
      />
    </div>
  );
}
