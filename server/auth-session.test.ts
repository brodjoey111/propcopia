import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import { establishAuthenticatedSession } from "./auth-session.ts";

test("authenticated sessions rotate before identity is saved", async () => {
  const calls: string[] = [];
  const session = {
    userId: "old-user",
    username: "old-name",
    regenerate(callback: (error?: Error) => void) {
      calls.push("regenerate");
      delete this.userId;
      delete this.username;
      callback();
    },
    save(callback: (error?: Error) => void) {
      calls.push(`save:${this.userId}:${this.username}`);
      callback();
    },
  };

  await establishAuthenticatedSession(
    { session } as unknown as Request,
    { id: "user-2", username: "operator" },
  );

  assert.deepEqual(calls, ["regenerate", "save:user-2:operator"]);
  assert.equal(session.userId, "user-2");
  assert.equal(session.username, "operator");
});

test("session rotation errors stop authentication before identity is assigned", async () => {
  const session = {
    userId: "old-user",
    username: "old-name",
    regenerate(callback: (error?: Error) => void) {
      callback(new Error("rotation failed"));
    },
    save() {
      assert.fail("save should not run after a rotation failure");
    },
  };

  await assert.rejects(
    establishAuthenticatedSession(
      { session } as unknown as Request,
      { id: "user-2", username: "operator" },
    ),
    { message: "rotation failed" },
  );
  assert.equal(session.userId, "old-user");
});
