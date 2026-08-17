import assert from "node:assert/strict";
import test from "node:test";
import { MemStorage } from "./storage.ts";

test("password storage updates only the selected user and reports missing users", async () => {
  const storage = new MemStorage();
  const first = await storage.createUser({ username: "first", password: "hash-1" });
  const second = await storage.createUser({ username: "second", password: "hash-2" });

  assert.equal(await storage.updateUserPassword(first.id, "new-hash"), true);
  assert.equal((await storage.getUser(first.id))?.password, "new-hash");
  assert.equal((await storage.getUser(second.id))?.password, "hash-2");
  assert.equal(await storage.updateUserPassword("missing", "unused"), false);
});
