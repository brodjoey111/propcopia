import { eq } from "drizzle-orm";
import { accounts } from "../shared/schema.ts";

type DbLike = {
  update: () => ReturnType<(typeof import("./db.ts"))["db"]["update"]>;
};

export async function resetStaleAccountConnections(database?: DbLike): Promise<number> {
  const targetDatabase = database ?? (await import("./db.ts")).db;
  const resetAccounts = await targetDatabase
    .update(accounts)
    .set({ isConnected: false })
    .where(eq(accounts.isConnected, true))
    .returning({ id: accounts.id });

  return resetAccounts.length;
}
