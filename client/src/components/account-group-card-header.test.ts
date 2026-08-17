import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getAccountGroupCardHeaderToggleTitle,
  getAccountGroupCardHeaderToggleToneClass,
  shouldShowAccountGroupCardPausedBadge,
} from "@/components/account-group-card-header";

test("account group card header keeps badge and pause controls together", () => {
  const source = readFileSync("client/src/components/account-group-card-header.tsx", "utf8");

  assert.match(source, /Paused/);
  assert.match(source, /riskStatusLabel/);
  assert.match(source, /getAccountGroupCardHeaderToggleTitle/);
  assert.match(source, /getAccountGroupCardHeaderToggleToneClass/);
  assert.match(source, /shouldShowAccountGroupCardPausedBadge/);
});

test("card header helpers preserve toggle title and tone styling for paused and active accounts", () => {
  assert.equal(
    getAccountGroupCardHeaderToggleTitle(true),
    "Re-enable this account",
  );
  assert.equal(
    getAccountGroupCardHeaderToggleTitle(false),
    "Pause this account",
  );

  assert.equal(
    getAccountGroupCardHeaderToggleToneClass(true),
    "text-red-500 hover:text-green-500",
  );
  assert.equal(
    getAccountGroupCardHeaderToggleToneClass(false),
    "text-muted-foreground/30 hover:text-red-500",
  );

  assert.equal(shouldShowAccountGroupCardPausedBadge(true), true);
  assert.equal(shouldShowAccountGroupCardPausedBadge(false), false);
  assert.equal(shouldShowAccountGroupCardPausedBadge(undefined), false);
});
