import assert from "node:assert/strict";
import test from "node:test";
import { UserBrokerSessionRegistry } from "./user-broker-session-registry";

test("broker sessions with the same username remain isolated by user", () => {
  const registry = new UserBrokerSessionRegistry<{ id: string }>();
  registry.forUser("user-a").set("shared-name", { id: "session-a" });
  registry.forUser("user-b").set("shared-name", { id: "session-b" });

  assert.equal(registry.forUser("user-a").get("shared-name")?.id, "session-a");
  assert.equal(registry.forUser("user-b").get("shared-name")?.id, "session-b");
  assert.equal(registry.userCount, 2);
});

test("broker session views stay live for existing services", () => {
  const registry = new UserBrokerSessionRegistry<number>();
  const firstView = registry.forUser("user-a");
  const secondView = registry.forUser("user-a");

  firstView.set("broker-user", 42);

  assert.equal(secondView.get("broker-user"), 42);
});

test("drain returns every session and clears the registry", () => {
  const registry = new UserBrokerSessionRegistry<number>();
  registry.forUser("user-a").set("one", 1);
  registry.forUser("user-b").set("two", 2);

  assert.deepEqual(registry.drain(), [
    { userId: "user-a", username: "one", session: 1 },
    { userId: "user-b", username: "two", session: 2 },
  ]);
  assert.equal(registry.userCount, 0);
});
