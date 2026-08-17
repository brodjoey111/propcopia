import assert from "node:assert/strict";
import test from "node:test";
import { resolveMarketDataMode } from "./market-data.ts";

test("real market data is unavailable by default without a provider key", () => {
  assert.equal(resolveMarketDataMode({}), "UNAVAILABLE");
});

test("simulation requires an explicit developer opt-in", () => {
  assert.equal(resolveMarketDataMode({ simulatedEnabled: true }), "SIMULATED");
});

test("a configured provider takes precedence over simulation", () => {
  assert.equal(resolveMarketDataMode({
    apiKey: "a-valid-provider-api-key",
    simulatedEnabled: true,
  }), "FINNHUB");
});
