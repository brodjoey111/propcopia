import test from "node:test";
import assert from "node:assert/strict";

import {
  getBrokerSettingsReadinessLabel,
  getBrokerSettingsReadinessToneClass,
} from "./broker-settings-dialog";

test("broker settings readiness label helper returns the expected summary copy", () => {
  assert.equal(getBrokerSettingsReadinessLabel(true), "Ready for Rithmic Test");
  assert.equal(getBrokerSettingsReadinessLabel(false), "Needs attention");
});

test("broker settings readiness tone helper returns success and warning classes", () => {
  assert.match(getBrokerSettingsReadinessToneClass(true), /emerald/);
  assert.match(getBrokerSettingsReadinessToneClass(false), /amber/);
});
