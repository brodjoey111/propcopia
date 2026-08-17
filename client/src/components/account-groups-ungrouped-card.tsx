import { buildAccountGroupCardConnectionBindings } from "@/components/account-group-card-action-bindings";
import { AccountGroupsDraggableCard } from "@/components/account-groups-draggable-card";
import type { Account } from "@shared/schema";

interface AccountGroupsUngroupedCardProps {
  account: Account;
  isDemo: boolean;
  compactView: boolean;
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, name: string) => void;
  accountActionDisabled: boolean;
  getConnectButtonLabel?: (accountId: string) => string;
  getDisconnectButtonLabel?: (accountId: string) => string;
}

export function buildAccountGroupsUngroupedCardButtonLabels(input: {
  accountId: string;
  getConnectButtonLabel?: (accountId: string) => string;
  getDisconnectButtonLabel?: (accountId: string) => string;
}) {
  return {
    connectButtonLabel: input.getConnectButtonLabel?.(input.accountId),
    disconnectButtonLabel: input.getDisconnectButtonLabel?.(input.accountId),
  };
}

export function AccountGroupsUngroupedCard({
  account,
  isDemo,
  compactView,
  onConnect,
  onDisconnect,
  accountActionDisabled,
  getConnectButtonLabel,
  getDisconnectButtonLabel,
}: AccountGroupsUngroupedCardProps) {
  const connectionBindings = buildAccountGroupCardConnectionBindings({
    account,
    onConnect,
    onDisconnect,
  });
  const buttonLabels = buildAccountGroupsUngroupedCardButtonLabels({
    accountId: account.id,
    getConnectButtonLabel,
    getDisconnectButtonLabel,
  });

  return (
    <AccountGroupsDraggableCard
      account={account}
      isDemo={isDemo}
      compactView={compactView}
      onConnect={connectionBindings.onConnect}
      onDisconnect={connectionBindings.onDisconnect}
      accountActionDisabled={accountActionDisabled}
      connectButtonLabel={buttonLabels.connectButtonLabel}
      disconnectButtonLabel={buttonLabels.disconnectButtonLabel}
    />
  );
}
