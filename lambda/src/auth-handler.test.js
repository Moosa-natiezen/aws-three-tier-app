import { test } from "node:test";
import assert from "node:assert/strict";
import { eventToRequest, responseToApiGateway } from "./auth-handler.js";

const baseEvent = {
  headers: { host: "api.example.com", "x-forwarded-proto": "https" },
  cookies: ["session=abc; other=1"],
  requestContext: { http: { method: "GET" }, domainName: "api.example.com" },
  rawPath: "/auth/get-session",
  rawQueryString: "a=1&b=2",
};

test("eventToRequest builds https URL with query string", () => {
  const req = eventToRequest(baseEvent);
  assert.equal(req.url, "https://api.example.com/auth/get-session?a=1&b=2");
  assert.equal(req.method, "GET");
});

test("eventToRequest joins v2 cookie array into cookie header", () => {
  const req = eventToRequest(baseEvent);
  assert.equal(req.headers.get("cookie"), "session=abc; other=1");
});

test("eventToRequest decodes base64 POST body", () => {
  const req = eventToRequest({
    ...baseEvent,
    headers: { ...baseEvent.headers, "content-type": "application/json" },
    requestContext: { ...baseEvent.requestContext, http: { method: "POST" } },
    rawQueryString: "",
    body: Buffer.from('{"email":"a@b.c"}').toString("base64"),
    isBase64Encoded: true,
  });
  assert.equal(req.headers.get("content-type"), "application/json");
  return req.text().then((t) => assert.equal(t, '{"email":"a@b.c"}'));
});

test("responseToApiGateway splits Set-Cookie into cookies array", async () => {
  const res = new Response("ok", {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": "a=1; Path=/; HttpOnly",
    },
  });
  res.headers.append("set-cookie", "b=2; Path=/; HttpOnly");
  const out = await responseToApiGateway(res);
  assert.equal(out.statusCode, 200);
  assert.equal(out.body, "ok");
  assert.equal(out.isBase64Encoded, false);
  assert.deepEqual(out.cookies, ["a=1; Path=/; HttpOnly", "b=2; Path=/; HttpOnly"]);
  assert.equal(out.headers["set-cookie"], undefined);
});

test("responseToApiGateway base64-encodes binary bodies", async () => {
  const res = new Response(Buffer.from([0, 1, 2, 255]), {
    status: 200,
    headers: { "content-type": "application/octet-stream" },
  });
  const out = await responseToApiGateway(res);
  assert.equal(out.isBase64Encoded, true);
  assert.deepEqual([...Buffer.from(out.body, "base64")], [0, 1, 2, 255]);
});

test("handleAuthEvent returns 404 for unknown auth route without touching DB", async () => {
  const { handleAuthEvent } = await import("./auth-handler.js");
  const out = await handleAuthEvent(
    { ...baseEvent, cookies: undefined, rawQueryString: "", rawPath: "/auth/definitely-not-a-route" },
    {
      NEON_DATABASE_URL: "postgres://user:pass@127.0.0.1:5432/never-connected",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
      BETTER_AUTH_URL: "http://localhost",
      NODE_ENV: "test",
    },
  );
  assert.equal(out.statusCode, 404);
});
