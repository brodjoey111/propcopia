import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pricingSource = readFileSync(new URL("./pricing.tsx", import.meta.url), "utf8");
const landingSource = readFileSync(new URL("./landing.tsx", import.meta.url), "utf8");

test("public pricing uses the shared catalog and accurately reports billing readiness", () => {
  for (const source of [pricingSource, landingSource]) {
    assert.match(source, /BILLING_PLANS/);
    assert.match(source, /Checkout is not active/);
    assert.doesNotMatch(source, /All plans include a 14-day free trial/);
  }
  assert.match(pricingSource, /Stripe checkout and the customer billing portal will be enabled/);
  assert.match(pricingSource, /Plan limits remain visible but unenforced/);
});
