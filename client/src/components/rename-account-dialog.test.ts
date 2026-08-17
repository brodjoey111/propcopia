import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dialogSource = readFileSync(new URL("./rename-account-dialog.tsx", import.meta.url), "utf8");
const accountsPageSource = readFileSync(new URL("../pages/accounts.tsx", import.meta.url), "utf8");

test("rename dialog explains that only the local label changes", () => {
  assert.match(dialogSource, /Broker credentials and account IDs will not change/);
  assert.match(dialogSource, /maxLength=\{80\}/);
  assert.match(dialogSource, /normalizedName !== accountName/);
});

test("accounts page persists names through the owner-scoped account endpoint", () => {
  assert.match(accountsPageSource, /`\/api\/accounts\/\$\{accountId\}\/name`/);
  assert.match(accountsPageSource, /method: 'PATCH'/);
  assert.match(accountsPageSource, /<RenameAccountDialog/);
  assert.match(accountsPageSource, /button-rename-account-/);
});
