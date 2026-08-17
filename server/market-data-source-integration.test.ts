import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const clientSource = readFileSync(
  new URL("../client/src/components/live-leaderboard.tsx", import.meta.url),
  "utf8",
);

test("market API and WebSocket publish explicit feed status", () => {
  assert.match(routeSource, /feed: marketDataService\.getStatus\(\)/);
  assert.match(routeSource, /type: 'market_status'/);
});

test("leaderboard only marks verified provider prices as live", () => {
  assert.match(clientSource, /message\.data\?\.source === 'FINNHUB'/);
  assert.doesNotMatch(clientSource, /ws\.onopen[\s\S]{0,120}setIsLive\(true\)/);
});
