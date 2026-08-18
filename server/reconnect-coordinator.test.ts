import assert from "node:assert/strict";
import test from "node:test";

import { ReconnectCoordinator } from "./reconnect-coordinator";

test("simultaneous reconnects for one account share a single task", async () => {
  const coordinator = new ReconnectCoordinator();
  let taskCalls = 0;
  let release!: (value: string) => void;
  const deferred = new Promise<string>((resolve) => release = resolve);

  const first = coordinator.run("account-1", async () => {
    taskCalls += 1;
    return deferred;
  });
  const second = coordinator.run("account-1", async () => {
    taskCalls += 1;
    return "unexpected";
  });

  assert.equal(first.started, true);
  assert.equal(second.started, false);
  assert.equal(first.promise, second.promise);
  assert.equal(coordinator.isReconnecting("account-1"), true);
  release("connected");
  assert.equal(await second.promise, "connected");
  await Promise.resolve();
  assert.equal(taskCalls, 1);
  assert.equal(coordinator.isReconnecting("account-1"), false);
});

test("different accounts can reconnect independently", async () => {
  const coordinator = new ReconnectCoordinator();
  const first = coordinator.run("account-1", async () => "first");
  const second = coordinator.run("account-2", async () => "second");

  assert.equal(first.started, true);
  assert.equal(second.started, true);
  assert.deepEqual(await Promise.all([first.promise, second.promise]), ["first", "second"]);
});

test("intentional disconnect can wait for an in-flight reconnect to settle", async () => {
  const coordinator = new ReconnectCoordinator();
  let release!: () => void;
  const reconnect = coordinator.run("account-1", () => new Promise<void>((resolve) => release = resolve));
  let disconnectReady = false;
  const waitingDisconnect = coordinator.waitFor("account-1").then(() => disconnectReady = true);

  await Promise.resolve();
  assert.equal(disconnectReady, false);
  release();
  await Promise.all([reconnect.promise, waitingDisconnect]);
  assert.equal(disconnectReady, true);
  assert.equal(coordinator.isReconnecting("account-1"), false);
});

test("intentional disconnect wait still resolves after a failed reconnect", async () => {
  const coordinator = new ReconnectCoordinator();
  const reconnect = coordinator.run("account-1", async () => {
    throw new Error("Login rejected");
  });
  let disconnectReady = false;
  const waitingDisconnect = coordinator.waitFor("account-1").then(() => {
    disconnectReady = true;
  });

  await assert.rejects(reconnect.promise, /Login rejected/);
  await waitingDisconnect;

  assert.equal(disconnectReady, true);
  assert.equal(coordinator.isReconnecting("account-1"), false);
});
