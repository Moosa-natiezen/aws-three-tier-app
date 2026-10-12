import { test } from "node:test";
import assert from "node:assert/strict";
import { handler } from "./index.js";

test("GET /health returns 200 with status ok", async () => {
  const res = await handler({
    requestContext: { http: { method: "GET" }, routeKey: "GET /health" },
    rawPath: "/health",
  });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).status, "ok");
});

test("unhandled route returns 501 placeholder", async () => {
  const res = await handler({
    requestContext: { http: { method: "GET" }, routeKey: "GET /items" },
    rawPath: "/items",
  });
  assert.equal(res.statusCode, 501);
});

test("OPTIONS preflight returns 204 with CORS headers", async () => {
  const res = await handler({
    requestContext: { http: { method: "OPTIONS" } },
    rawPath: "/",
  });
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers["access-control-allow-origin"], "*");
});
