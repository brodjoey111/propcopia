import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { GracefulShutdownCoordinator, closeHttpServer } from "./graceful-shutdown.ts";

test("shutdown steps run in order and continue after a failed cleanup", async () => {
  const calls: string[] = [];
  const coordinator = new GracefulShutdownCoordinator([
    { name: "first", run: () => { calls.push("first"); } },
    { name: "broken", run: () => { calls.push("broken"); throw new Error("failure"); } },
    { name: "last", run: async () => { calls.push("last"); } },
  ]);

  const result = await coordinator.shutdown("SIGTERM");

  assert.deepEqual(calls, ["first", "broken", "last"]);
  assert.deepEqual(result.completedSteps, ["first", "last"]);
  assert.deepEqual(result.failedSteps.map((failure) => failure.name), ["broken"]);
});

test("repeated shutdown signals share one cleanup run", async () => {
  let runs = 0;
  const coordinator = new GracefulShutdownCoordinator([
    { name: "once", run: async () => { runs += 1; } },
  ]);

  const first = coordinator.shutdown("SIGINT");
  const second = coordinator.shutdown("SIGTERM");

  assert.equal(first, second);
  assert.equal((await second).signal, "SIGINT");
  assert.equal(runs, 1);
});

test("HTTP server close resolves after a listening server stops", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  await closeHttpServer(server, 1_000);

  assert.equal(server.listening, false);
});
