import assert from "node:assert/strict";
import test from "node:test";

import { filterAndSortAccountRoster, type AccountRosterItem } from "./account-roster";

const items: AccountRosterItem[] = [
  { account: { id: "2", name: "Zulu Follower", platform: "Rithmic", accountType: "follower", isConnected: false } },
  { account: { id: "1", name: "Alpha Master", platform: "Tradovate", accountType: "master", isConnected: true } },
  { account: { id: "3", name: "Beta Follower", platform: "Rithmic", accountType: "follower", isConnected: true } },
];

test("account roster search matches names, platforms, and roles", () => {
  assert.deepEqual(
    filterAndSortAccountRoster(items, { query: "alpha", filter: "all", sort: "name" }).map((item) => item.account.id),
    ["1"],
  );
  assert.deepEqual(
    filterAndSortAccountRoster(items, { query: "RITHMIC", filter: "all", sort: "name" }).map((item) => item.account.id),
    ["3", "2"],
  );
});

test("account roster combines connection and role filters with stable sorting", () => {
  assert.deepEqual(
    filterAndSortAccountRoster(items, { query: "", filter: "connected", sort: "name" }).map((item) => item.account.id),
    ["1", "3"],
  );
  assert.deepEqual(
    filterAndSortAccountRoster(items, { query: "", filter: "follower", sort: "connection" }).map((item) => item.account.id),
    ["3", "2"],
  );
});

test("account roster sorting never mutates the source response", () => {
  const sourceOrder = items.map((item) => item.account.id);
  const roleOrder = filterAndSortAccountRoster(items, { query: "", filter: "all", sort: "role" });
  assert.deepEqual(roleOrder.map((item) => item.account.id), ["1", "3", "2"]);
  assert.deepEqual(items.map((item) => item.account.id), sourceOrder);
});
