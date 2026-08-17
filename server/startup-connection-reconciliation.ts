import { eq } from "drizzle-orm";
import { accounts } from "../shared/schema.ts";

type DbLike = {
  update: () => ReturnType<(typeof import("./db.ts"))["db"]["update"]>;
};

export async function resetStaleAccountConnections(
  database?: DbLike,
  onReset?: (account: { id: string; userId: string }) => void,
): Promise<number> {
  const targetDatabase = database ?? (await import("./db.ts")).db;
  const resetAccounts = await targetDatabase
    .update(accounts)
    .set({ isConnected: false })
    .where(eq(accounts.isConnected, true))
    .returning({ id: accounts.id, userId: accounts.userId });

  for (const account of resetAccounts) {
    if (account.userId) {
      onReset?.(account);
    }
  }

  return resetAccounts.length;
}
