/**
 * Backend entrypoint — invoked via API Gateway (HTTP API, payload v2.0).
 * Routing:
 *   /auth/*  -> Better Auth (sign-in, sessions; bearer token support)
 *   /health  -> liveness probe
 *   CRUD     -> wired in Step 9 (Neon app data, auth-guarded)
 */
import { handleAuthEvent, normalizePath } from "./auth-handler.js";
import { handleItems } from "./crud.js";

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
  const method = event.requestContext?.http?.method ?? "GET";
  // Stage-aware: /dev/items -> /items (HTTP APIs include the stage prefix)
  const path = normalizePath(event);

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

  // Better Auth routes (Step 7): sign-in, sign-up, sessions, etc.
  if (path.startsWith("/auth/")) {
    return handleAuthEvent(event);
  }

  // Neon-backed CRUD, auth-guarded (Step 9): /items, /items/{id}
  if (path === "/items" || path.startsWith("/items/")) {
    return handleItems(event);
  }

  return respond(501, {
    message: "Not implemented yet",
    hint: `No handler for ${method} ${path} (build step pending)`,
  });
}
