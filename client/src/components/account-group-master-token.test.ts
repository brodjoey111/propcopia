import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getAccountGroupMasterTokenContainerClass,
  getAccountGroupMasterTokenDragOpacityClass,
  getAccountGroupMasterTokenIconClass,
  getAccountGroupMasterTokenLabel,
  getAccountGroupMasterTokenLabelClass,
} from "@/components/account-group-master-token";

test("account group master token keeps drag state, warning copy, and master badge styling together", () => {
  const source = readFileSync("client/src/components/account-group-master-token.tsx", "utf8");

  assert.match(source, /useDraggable/);
  assert.match(source, /master-token:\$\{groupId\}/);
  assert.match(source, /Drag onto an account to make it the master/);
  assert.match(source, /getAccountGroupMasterTokenContainerClass/);
  assert.match(source, /getAccountGroupMasterTokenDragOpacityClass/);
  assert.match(source, /getAccountGroupMasterTokenIconClass/);
  assert.match(source, /getAccountGroupMasterTokenLabelClass/);
  assert.match(source, /getAccountGroupMasterTokenLabel/);
});

test("master token helpers preserve warning, assigned, and empty-state display styles", () => {
  assert.equal(
    getAccountGroupMasterTokenContainerClass({
      hasWarning: true,
      masterName: null,
    }),
    "bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25",
  );
  assert.equal(
    getAccountGroupMasterTokenContainerClass({
      hasWarning: false,
      masterName: "Desk Alpha",
    }),
    "bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20",
  );
  assert.equal(
    getAccountGroupMasterTokenContainerClass({
      hasWarning: false,
      masterName: null,
    }),
    "bg-muted/60 border border-border/60 hover:bg-muted",
  );

  assert.equal(
    getAccountGroupMasterTokenIconClass({
      hasWarning: true,
      masterName: null,
    }),
    "text-amber-500",
  );
  assert.equal(
    getAccountGroupMasterTokenIconClass({
      hasWarning: false,
      masterName: null,
    }),
    "text-muted-foreground/40",
  );

  assert.equal(
    getAccountGroupMasterTokenLabelClass({
      hasWarning: true,
      masterName: null,
    }),
    "text-amber-600 dark:text-amber-400",
  );
  assert.equal(
    getAccountGroupMasterTokenLabelClass({
      hasWarning: false,
      masterName: "Desk Alpha",
    }),
    "text-foreground/80",
  );
  assert.equal(
    getAccountGroupMasterTokenLabelClass({
      hasWarning: false,
      masterName: null,
    }),
    "text-muted-foreground/60",
  );

  assert.equal(
    getAccountGroupMasterTokenLabel({
      hasWarning: true,
      masterName: null,
    }),
    "Set a master",
  );
  assert.equal(
    getAccountGroupMasterTokenLabel({
      hasWarning: false,
      masterName: "Desk Alpha",
    }),
    "Desk Alpha",
  );
  assert.equal(
    getAccountGroupMasterTokenLabel({
      hasWarning: false,
      masterName: null,
    }),
    "No master",
  );

  assert.equal(getAccountGroupMasterTokenDragOpacityClass(true), "opacity-20");
  assert.equal(getAccountGroupMasterTokenDragOpacityClass(false), "opacity-100");
});
