import assert from "node:assert/strict";
import test from "node:test";
import { RithmicAPI } from "./rithmic-api";

test("Rithmic connection tests reuse an authenticated ticker session", async () => {
  const api = new RithmicAPI({ username: "offline", password: "offline" });
  let authenticationCalls = 0;

  (api as any).isAuthenticated = () => true;
  (api as any).authenticate = async () => {
    authenticationCalls += 1;
    return { success: true, message: "unexpected authentication" };
  };
  (api as any).fetchAccountList = async () => [
    { id: "R-1", name: "Test Account", accountType: "futures", active: true },
  ];

  const result = await api.testConnection();

  assert.equal(result.success, true);
  assert.equal(authenticationCalls, 0);
  assert.deepEqual(api.getDiscoveredAccounts(), result.data);
});

test("Rithmic discovered-account snapshots cannot mutate the client cache", async () => {
  const api = new RithmicAPI({ username: "offline", password: "offline" });
  (api as any).isAuthenticated = () => true;
  (api as any).fetchAccountList = async () => [
    { id: "R-1", name: "Test Account", accountType: "futures", active: true },
  ];
  await api.testConnection();

  const first = api.getDiscoveredAccounts();
  first[0].name = "Changed";

  assert.equal(api.getDiscoveredAccounts()[0].name, "Test Account");
});
