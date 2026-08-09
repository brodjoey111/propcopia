import test from "node:test";
import assert from "node:assert/strict";
import { updateAccountConnectionState } from "./account-connection-service.ts";

function createDatabaseDouble(existingRow: unknown, updatedRow: unknown) {
  const selectState = { whereArgument: undefined as unknown };
  const updateState = {
    setArgument: undefined as unknown,
    whereArgument: undefined as unknown,
  };

  const database = {
    select() {
      return {
        from() {
          return {
            where(condition: unknown) {
              selectState.whereArgument = condition;
              return Promise.resolve(existingRow ? [existingRow] : []);
            },
          };
        },
      };
    },
    update() {
      return {
        set(values: unknown) {
          updateState.setArgument = values;
          return {
            where(condition: unknown) {
              updateState.whereArgument = condition;
              return {
                returning() {
                  return Promise.resolve(updatedRow ? [updatedRow] : []);
                },
              };
            },
          };
        },
      };
    },
  };

  return { database, selectState, updateState };
}

test("updateAccountConnectionState persists a connected account for the signed-in user", async () => {
  const updatedAccount = {
    id: "acc-1",
    userId: "user-1",
    isConnected: true,
  };
  const { database, selectState, updateState } = createDatabaseDouble(
    { id: "acc-1", userId: "user-1", isConnected: false },
    updatedAccount,
  );

  const result = await updateAccountConnectionState({
    accountId: "acc-1",
    userId: "user-1",
    isConnected: true,
    database: database as never,
  });

  assert.deepEqual(result, updatedAccount);
  assert.deepEqual(updateState.setArgument, { isConnected: true });
  assert.ok(selectState.whereArgument);
  assert.ok(updateState.whereArgument);
});

test("updateAccountConnectionState skips updates when the account does not belong to the signed-in user", async () => {
  const { database, updateState } = createDatabaseDouble(null, null);

  const result = await updateAccountConnectionState({
    accountId: "missing-account",
    userId: "user-1",
    isConnected: true,
    database: database as never,
  });

  assert.equal(result, null);
  assert.equal(updateState.setArgument, undefined);
  assert.equal(updateState.whereArgument, undefined);
});
