import test from "node:test";
import assert from "node:assert/strict";
import { resolveApiBase, readApiResponse } from "./apiConfig.js";

test("API base defaults to the proxy and trims configured URLs", () => {
  for (const value of [undefined, "", "  ", "/"]) {
    assert.equal(resolveApiBase(value), "/api");
  }
  assert.equal(resolveApiBase(" /api/// "), "/api");
  assert.equal(resolveApiBase(" https://backend.example/api/ "), "https://backend.example/api");
});

test("successful JSON and no-content responses are supported", async () => {
  assert.deepEqual(await readApiResponse(Response.json({ user: { id: "123" } })), { user: { id: "123" } });
  assert.deepEqual(await readApiResponse(new Response(null, { status: 204 })), {});
});

test("authentication errors retain verification and lockout information", async () => {
  const details = { message: "Verify your email", requiresVerification: true, email: "user@phinmaed.com", retryAfterSeconds: 30, lockedUntil: "2026-10-17T00:00:00Z" };
  await assert.rejects(readApiResponse(Response.json(details, { status: 403 })), error => {
    assert.equal(error.status, 403);
    for (const [key, value] of Object.entries(details)) assert.equal(error[key], value);
    return true;
  });
});

test("HTML fallback pages cannot masquerade as successful API responses", async () => {
  await assert.rejects(readApiResponse(new Response("<html>App</html>")), /API configuration/);
});

test("non-JSON outages and empty JSON errors provide useful messages", async () => {
  await assert.rejects(readApiResponse(new Response("Bad gateway", { status: 502 })), { status: 502, message: /temporarily unavailable/ });
  await assert.rejects(readApiResponse(Response.json(null, { status: 401 })), { status: 401, message: /401/ });
});
