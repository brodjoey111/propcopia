import type { Account } from "@shared/schema";

import {
  buildRithmicConformanceSummary,
  type RithmicLoginMetadata,
} from "./rithmic-login-metadata";
import type { RithmicReconnectValidation } from "./rithmic-reconnect-validation";
import { resolveRithmicSystemName } from "./rithmic-system-name";

export interface RithmicReadinessApiLike {
  isAuthenticated(): boolean;
  getLastLoginMetadata?(): RithmicLoginMetadata | undefined;
}

export interface RithmicReadinessResult {
  accountId: string;
  accountName: string;
  status: "ready" | "action_required";
  ready: boolean;
  environment: "test" | "live";
  systemName: string;
  hasExplicitSystemName: boolean;
  exchange: string | null;
  savedBrokerUsername: string | null;
  hasSavedCredentials: boolean;
  hasSavedAccountId: boolean;
  sessionActive: boolean;
  reconnectValidated: boolean;
  reconnectValidation?: RithmicReconnectValidation;
  loginMetadata?: RithmicLoginMetadata;
  conformance?: ReturnType<typeof buildRithmicConformanceSummary>;
  blockers: string[];
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function buildRithmicReadiness(
  account: Account,
  api?: RithmicReadinessApiLike,
  reconnectValidation?: RithmicReconnectValidation,
): RithmicReadinessResult {
  const savedBrokerUsername = normalizeOptionalString(account.rithmicUsername);
  const savedPassword = normalizeOptionalString(account.rithmicPassword);
  const savedAccountId = normalizeOptionalString(account.rithmicAccountId);
  const explicitSystemName = normalizeOptionalString(account.rithmicSystemName);
  const environment = account.rithmicEnvironment === "live" ? "live" : "test";
  const sessionActive = api?.isAuthenticated() === true;
  const loginMetadata = api?.getLastLoginMetadata?.();
  const blockers: string[] = [];

  if (!savedBrokerUsername || !savedPassword) {
    blockers.push("Saved Rithmic username or password is missing.");
  }

  if (!savedAccountId) {
    blockers.push("Saved Rithmic account ID is missing.");
  }

  if (!sessionActive) {
    blockers.push("Rithmic session is not connected.");
  }

  if (!loginMetadata) {
    blockers.push("Rithmic login metadata has not been captured in the active session.");
  }

  if (!reconnectValidation) {
    blockers.push("Saved reconnect has not been re-validated since the last server start.");
  }

  return {
    accountId: account.id,
    accountName: account.name,
    status: blockers.length === 0 ? "ready" : "action_required",
    ready: blockers.length === 0,
    environment,
    systemName: resolveRithmicSystemName(account),
    hasExplicitSystemName: explicitSystemName !== null,
    exchange: normalizeOptionalString(account.rithmicExchange),
    savedBrokerUsername,
    hasSavedCredentials: !!savedBrokerUsername && !!savedPassword,
    hasSavedAccountId: !!savedAccountId,
    sessionActive,
    reconnectValidated: reconnectValidation !== undefined,
    reconnectValidation,
    loginMetadata,
    conformance: loginMetadata
      ? buildRithmicConformanceSummary(loginMetadata)
      : undefined,
    blockers,
  };
}
