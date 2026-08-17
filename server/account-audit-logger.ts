import { operationalLogger, type OperationalLogger } from "./operational-logger";

export type AccountAuditEvent =
  | "created"
  | "connected"
  | "disconnected"
  | "removed"
  | "renamed"
  | "role_changed";

export interface AccountAuditInput {
  userId: string;
  accountId: string;
  platform: string;
  accountType: string;
  previousAccountType?: string;
}

export function logAccountAuditEvent(
  event: AccountAuditEvent,
  input: AccountAuditInput,
  logger: Pick<OperationalLogger, "info"> = operationalLogger,
): void {
  logger.info(`account.${event}`, {
    userId: input.userId,
    accountId: input.accountId,
    platform: input.platform,
    accountType: input.accountType,
    ...(input.previousAccountType
      ? { previousAccountType: input.previousAccountType }
      : {}),
  });
}
