import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");

test("global error middleware normalizes and logs errors without rethrowing", () => {
  assert.match(source, /normalizeHttpError\(err\)/);
  assert.match(source, /operationalLogger\.(?:warn|error)/);
  assert.match(source, /res\.headersSent/);
  assert.match(source, /next\(err\)/);
  assert.doesNotMatch(source, /throw err/);
});
