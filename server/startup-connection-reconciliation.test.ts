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
    { id: "account-1" },
    { id: "account-2" },
  ]);

  const resetCount = await resetStaleAccountConnections(database as never);

  assert.equal(resetCount, 2);
  assert.deepEqual(state.setArgument, { isConnected: false });
  assert.ok(state.whereArgument);
});

test("startup reconciliation reports zero when no stale connections exist", async () => {
  const { database } = createDatabaseDouble([]);

  const resetCount = await resetStaleAccountConnections(database as never);

  assert.equal(resetCount, 0);
});
