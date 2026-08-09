import test from "node:test";
import assert from "node:assert/strict";
import { apiRequest } from "./queryClient.ts";

test('apiRequest sends authenticated requests with credentials: "include"', async () => {
  const originalFetch = globalThis.fetch;

  try {
    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }) as typeof fetch;

    await apiRequest("POST", "/api/accounts", {
      name: "Rithmic Account",
    });

    assert.equal(capturedUrl, "/api/accounts");
    assert.equal(capturedInit?.method, "POST");
    assert.equal(capturedInit?.credentials, "include");
    assert.deepEqual(capturedInit?.headers, {
      "Content-Type": "application/json",
    });
    assert.equal(capturedInit?.body, JSON.stringify({ name: "Rithmic Account" }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('apiRequest sends authenticated GET requests with credentials: "include"', async () => {
  const originalFetch = globalThis.fetch;

  try {
    let capturedUrl: string | undefined;
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }) as typeof fetch;

    await apiRequest("GET", "/api/auth/me");

    assert.equal(capturedUrl, "/api/auth/me");
    assert.equal(capturedInit?.method, "GET");
    assert.equal(capturedInit?.credentials, "include");
    assert.deepEqual(capturedInit?.headers, {});
    assert.equal(capturedInit?.body, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
