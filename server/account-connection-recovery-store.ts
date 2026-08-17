export type AccountRecoveryStatus =
  | "reconnecting"
  | "recovered"
  | "failed"
  | "disconnected"
  | "startup_offline";

export interface AccountConnectionRecoveryRecord {
  accountId: string;
  userId: string;
  status: AccountRecoveryStatus;
  attempts: number;
  updatedAt: string;
  startedAt?: string;
  recoveredAt?: string;
  failedAt?: string;
  disconnectedAt?: string;
  message?: string;
}

export class AccountConnectionRecoveryStore {
  private readonly records = new Map<string, AccountConnectionRecoveryRecord>();

  begin(userId: string, accountId: string, now = new Date().toISOString()): void {
    const existing = this.records.get(accountId);
    this.records.set(accountId, {
      accountId,
      userId,
      status: "reconnecting",
      attempts: (existing?.attempts ?? 0) + 1,
      startedAt: now,
      updatedAt: now,
    });
  }

  recovered(userId: string, accountId: string, now = new Date().toISOString()): void {
    this.finish(userId, accountId, "recovered", now, { recoveredAt: now });
  }

  failed(userId: string, accountId: string, message: string, now = new Date().toISOString()): void {
    this.finish(userId, accountId, "failed", now, { failedAt: now, message });
  }

  disconnected(userId: string, accountId: string, now = new Date().toISOString()): void {
    this.finish(userId, accountId, "disconnected", now, { disconnectedAt: now });
  }

  startupOffline(userId: string, accountId: string, now = new Date().toISOString()): void {
    this.finish(userId, accountId, "startup_offline", now, {
      disconnectedAt: now,
      message: "Saved connection was reset to a safe offline state after server startup.",
    });
  }

  listForUser(userId: string): AccountConnectionRecoveryRecord[] {
    return Array.from(this.records.values())
      .filter((record) => record.userId === userId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  remove(userId: string, accountId: string): void {
    const record = this.records.get(accountId);
    if (record?.userId === userId) {
      this.records.delete(accountId);
    }
  }

  clear(): void {
    this.records.clear();
  }

  private finish(
    userId: string,
    accountId: string,
    status: AccountRecoveryStatus,
    now: string,
    patch: Partial<AccountConnectionRecoveryRecord>,
  ): void {
    const existing = this.records.get(accountId);
    this.records.set(accountId, {
      accountId,
      userId,
      attempts: existing?.attempts ?? 0,
      ...existing,
      ...patch,
      status,
      updatedAt: now,
    });
  }
}

export const accountConnectionRecoveryStore = new AccountConnectionRecoveryStore();
