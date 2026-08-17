import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./accounts.tsx", import.meta.url), "utf8");

test("accounts page filters one shared roster across grid, list, and table views", () => {
  assert.match(source, /const visibleAccountRuntimeViewModels = filterAndSortAccountRoster/);
  assert.equal((source.match(/visibleAccountRuntimeViewModels\.map/g) ?? []).length, 3);
  assert.match(source, /input-account-roster-search/);
  assert.match(source, /select-account-roster-sort/);
});

test("accounts page gives filtered rosters a clear recovery state", () => {
  assert.match(source, /No accounts match these filters/);
  assert.match(source, /setRosterQuery\(""\)/);
  assert.match(source, /setRosterFilter\("all"\)/);
  assert.match(source, /viewMode !== 'groups'/);
  assert.equal((source.match(/visibleAccountRuntimeViewModels\.length > 0 && viewMode ===/g) ?? []).length, 3);
});
