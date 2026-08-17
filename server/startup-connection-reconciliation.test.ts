import test from "node:test";
import assert from "node:assert/strict";

import { resetStaleAccountConnections } from "./startup-connection-reconciliation";

function createDatabaseDouble(resetRows: Array<{ id: string }>) {
  const state = {
    setArgument: undefined as unknown,
    whereArgument: undefined as unknown,
  };

  const database = {
    update() {
      return {
        set(values: unknown) {
          state.setArgument = values;
          return {
            where(condition: unknown) {
              state.whereArgument = condition;
              return {
                returning() {
                  return Promise.resolve(resetRows);
                },
              };
            },
          };
        },
      };
    },
  };

  return { database, state };
}

test("startup reconciliation marks stale connected accounts offline", async () => {
  const { database, state } = createDatabaseDouble([
    { id: "account-1", userId: "user-1" },
    { id: "account-2", userId: "user-2" },
  ]);

  const resetCount = await resetStaleAccountConnections(database as never);

  assert.equal(resetCount, 2);
  assert.deepEqual(state.setArgument, { isConnected: false });
  assert.ok(state.whereArgument);
});

test("startup reconciliation reports reset account ownership for recovery visibility", async () => {
  const { database } = createDatabaseDouble([{ id: "account-1", userId: "user-1" }]);
  const recovered: Array<{ id: string; userId: string }> = [];

  await resetStaleAccountConnections(database as never, (account) => recovered.push(account));

  assert.deepEqual(recovered, [{ id: "account-1", userId: "user-1" }]);
});

test("startup reconciliation reports zero when no stale connections exist", async () => {
  const { database } = createDatabaseDouble([]);

  const resetCount = await resetStaleAccountConnections(database as never);

  assert.equal(resetCount, 0);
});
