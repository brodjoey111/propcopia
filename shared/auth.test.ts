import assert from "node:assert/strict";
import test from "node:test";
import {
  changePasswordSchema,
  loginCredentialsSchema,
  signupCredentialsSchema,
} from "./auth.ts";

test("signup credentials normalize valid usernames and enforce password length", () => {
  const valid = signupCredentialsSchema.parse({
    username: "  operator_1  ",
    password: "correct-horse-battery-staple",
  });

  assert.equal(valid.username, "operator_1");
  assert.equal(signupCredentialsSchema.safeParse({ username: "ab", password: "long-enough-password" }).success, false);
  assert.equal(signupCredentialsSchema.safeParse({ username: "bad name", password: "long-enough-password" }).success, false);
  assert.equal(signupCredentialsSchema.safeParse({ username: "operator", password: "short" }).success, false);
  assert.equal(signupCredentialsSchema.safeParse({ username: "operator", password: "🔒".repeat(19) }).success, false);
});

test("login accepts existing credentials without applying the stronger signup minimum", () => {
  assert.equal(loginCredentialsSchema.safeParse({ username: "legacy", password: "secret" }).success, true);
  assert.equal(loginCredentialsSchema.safeParse({ username: "", password: "secret" }).success, false);
});

test("password changes require a strong password that differs from the current password", () => {
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: "old-password",
    newPassword: "new-secure-password",
  }).success, true);
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: "same-secure-password",
    newPassword: "same-secure-password",
  }).success, false);
  assert.equal(changePasswordSchema.safeParse({
    currentPassword: "old-password",
    newPassword: "short",
  }).success, false);
});
