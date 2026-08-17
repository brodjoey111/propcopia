import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

test("application pages load on demand behind one accessible fallback", () => {
  const lazyPageImports = source.match(/const \w+ = lazy\(\(\) => import\("@\/pages\/[^"]+"\)\);/g) ?? [];

  assert.equal(lazyPageImports.length, 15);
  assert.match(source, /import \{ lazy, Suspense \} from "react"/);
  assert.match(source, /const Dashboard = lazy\(\(\) => import\("@\/pages\/dashboard"\)\)/);
  assert.match(source, /const Accounts = lazy\(\(\) => import\("@\/pages\/accounts"\)\)/);
  assert.match(source, /const Activity = lazy\(\(\) => import\("@\/pages\/activity"\)\)/);
  assert.match(source, /<Suspense fallback=\{<PageLoadingFallback \/>\}>/);
  assert.match(source, /role="status" aria-live="polite"/);
  assert.doesNotMatch(source, /import Dashboard from "@\/pages\/dashboard"/);
});
