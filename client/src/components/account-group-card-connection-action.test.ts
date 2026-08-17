import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createAccountGroupCardConnectionClickHandler,
  getAccountGroupCardConnectionDemoLabel,
  getAccountGroupCardConnectionMode,
} from "@/components/account-group-card-connection-action";

test("account group card connection action covers demo, connect, and disconnect states", () => {
  const source = readFileSync("client/src/components/account-group-card-connection-action.tsx", "utf8");

  assert.match(source, /getAccountGroupCardConnectionDemoLabel/);
  assert.match(source, /getAccountGroupCardConnectionMode/);
  assert.match(source, /createAccountGroupCardConnectionClickHandler/);
});

test("connection action helpers preserve mode selection and click propagation handling", () => {
  assert.equal(
    getAccountGroupCardConnectionMode({ isDemo: true, isConnected: false }),
    "demo",
  );
  assert.equal(
    getAccountGroupCardConnectionMode({ isDemo: false, isConnected: true }),
    "disconnect",
  );
  assert.equal(
    getAccountGroupCardConnectionMode({ isDemo: false, isConnected: false }),
    "connect",
  );

  const calls: string[] = [];
  const clickHandler = createAccountGroupCardConnectionClickHandler(() => {
    calls.push("action");
  });

  clickHandler({
    stopPropagation: () => {
      calls.push("stop");
    },
  });

  assert.deepEqual(calls, ["stop", "action"]);
  assert.equal(getAccountGroupCardConnectionDemoLabel(), "example account");
});
