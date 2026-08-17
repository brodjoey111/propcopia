import { apiRequest } from "./queryClient.ts";
import type { Account } from "@shared/schema";

type AccountsQueryData = { success: boolean; accounts: Account[] } | undefined;

export async function connectAccount(accountId: string) {
  const response = await apiRequest("POST", `/api/accounts/${accountId}/connect`);
  return response.json();
}

export async function disconnectAccount(accountId: string) {
  const response = await apiRequest("POST", `/api/accounts/${accountId}/disconnect`);
  return response.json();
}

export async function revalidateRithmicReadiness(accountId: string) {
  const response = await apiRequest("POST", `/api/accounts/${accountId}/rithmic-readiness/revalidate`);
  return response.json();
}

export function updateAccountConnectionInQueryData(
  data: AccountsQueryData,
  accountId: string,
  isConnected: boolean,
): AccountsQueryData {
  if (!data) {
    return data;
  }

  return {
    ...data,
    accounts: data.accounts.map((account) =>
      account.id === accountId ? { ...account, isConnected } : account,
    ),
  };
}
