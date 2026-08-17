import type { Account } from "@shared/schema";

interface BuildAccountGroupCardConnectionBindingsOptions {
  account: Account;
  onConnect: (accountId: string) => void;
  onDisconnect: (accountId: string, name: string) => void;
}

export function getAccountGroupCardDisconnectTarget(account: Account) {
  return {
    accountId: account.id,
    accountName: account.name,
  };
}

export function buildAccountGroupCardConnectionBindings({
  account,
  onConnect,
  onDisconnect,
}: BuildAccountGroupCardConnectionBindingsOptions) {
  const disconnectTarget = getAccountGroupCardDisconnectTarget(account);

  return {
    onConnect: () => onConnect(account.id),
    onDisconnect: () =>
      onDisconnect(disconnectTarget.accountId, disconnectTarget.accountName),
  };
}
