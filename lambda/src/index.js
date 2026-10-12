/**
 * Backend entrypoint — invoked via API Gateway (HTTP API, payload v2.0).
 * Business logic (Neon CRUD + Better Auth session validation) lands in
 * Step 7-9; this version establishes the routing/response contract.
 */

const CORS_HEADERS = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type,authorization",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
};

const respond = (statusCode, body) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

export async function handler(event) {
  const { routeKey, rawPath } = event.requestContext ?? {};
  const method = event.requestContext?.http?.method ?? "GET";
  const path = rawPath ?? routeKey?.split(" ")[1] ?? "/";

  // CORS preflight (HTTP API passes OPTIONS through when configured)
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (method === "GET" && path === "/health") {
    return respond(200, {
      status: "ok",
      env: process.env.APP_ENV ?? "unknown",
      time: new Date().toISOString(),
    });
  }

  // Placeholder — replaced by auth-guarded CRUD handlers in Step 9
  return respond(501, {
    message: "Not implemented yet",
    hint: `No handler for ${method} ${path} (build step pending)`,
  });
}
