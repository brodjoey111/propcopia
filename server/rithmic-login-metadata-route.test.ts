import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routesSource = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const apiSource = fs.readFileSync(new URL("./rithmic-api.ts", import.meta.url), "utf8");

test("Rithmic login captures unique user metadata from the login response", () => {
  assert.match(apiSource, /UNIQUE_USER_ID:\s+153428/);
  assert.match(apiSource, /const uniqueUserId = fields\.strings\.get\(FIELD\.UNIQUE_USER_ID\)\?\.\[0\] \?\? '';/);
  assert.match(apiSource, /authData:\s*\{\s*fcmId,\s*ibId,\s*uniqueUserId,\s*timestamp,\s*timezone,\s*\}/);
});

test("Rithmic test-connection route returns login metadata to the client", () => {
  assert.match(routesSource, /app\.post\(\"\/api\/rithmic\/test-connection\"/);
  assert.match(routesSource, /authData: connectionTest\.authData/);
});
