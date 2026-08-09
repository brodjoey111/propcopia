import { and, eq } from "drizzle-orm";
import { accounts, type Account } from "../shared/schema.ts";

type DbLike = {
  select: () => ReturnType<(typeof import("./db.ts"))["db"]["select"]>;
  update: () => ReturnType<(typeof import("./db.ts"))["db"]["update"]>;
};

type UpdateAccountConnectionStateInput = {
  accountId: string;
  userId: string;
  isConnected: boolean;
  database?: DbLike;
};

export async function updateAccountConnectionState({
  accountId,
  userId,
  isConnected,
  database,
}: UpdateAccountConnectionStateInput): Promise<Account | null> {
  const targetDatabase = database ?? (await import("./db.ts")).db;

  const [existing] = await targetDatabase
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

  if (!existing) {
    return null;
  }

  const [updated] = await targetDatabase
    .update(accounts)
    .set({ isConnected })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .returning();

  return (updated as Account | undefined) ?? null;
}
