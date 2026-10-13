/**
 * API Gateway HTTP API (payload v2.0) <-> Better Auth web-standard handler.
 * There is no official Better Auth Lambda adapter (verified: not in the
 * package export map), so this conversion is explicit and auditable:
 *   event -> Request  (rawPath/rawQueryString, v2 cookies array, base64 body)
 *   Response -> v2    (statusCode, headers, cookies[], isBase64Encoded)
 */
import { createAuth } from "./auth.js";

/**
 * HTTP APIs invoked through a named stage (dev/prod) include the stage as
 * the first path segment (/dev/auth/...). Routes and Better Auth's basePath
 * are stage-less, so strip it before matching.
 */
export function normalizePath(event) {
  const raw = event.rawPath ?? "/";
  const stage = event.requestContext?.stage;
  if (stage && raw.startsWith(`/${stage}/`)) return raw.slice(stage.length + 1);
  if (stage && raw === `/${stage}`) return "/";
  return raw;
}

export function eventToRequest(event) {
  const method = (event.requestContext?.http?.method ?? "GET").toUpperCase();
  const proto =
    event.headers?.["x-forwarded-proto"]?.split(",")[0]?.trim() ?? "https";
  const host =
    event.headers?.host ?? event.requestContext?.domainName ?? "localhost";
  const rawQuery = event.rawQueryString
    ? `?${event.rawQueryString}`
    : "";
  const request = new Request(`${proto}://${host}${normalizePath(event)}${rawQuery}`, {
    method,
    headers: buildHeaders(event),
    body: buildBody(event, method),
  });
  return request;
}

export function buildHeaders(event) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(event.headers ?? {})) {
    if (value != null && name.toLowerCase() !== "cookie") {
      headers.set(name, value);
    }
  }
  // HTTP API v2 exposes cookies as a separate array
  if (event.cookies?.length) {
    headers.set("cookie", event.cookies.join("; "));
  }
  return headers;
}

function buildBody(event, method) {
  if (event.body == null || method === "GET" || method === "HEAD") return undefined;
  const buf = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body, "utf8");
  return new Uint8Array(buf);
}

export async function responseToApiGateway(response) {
  const setCookies = response.headers.getSetCookie?.() ?? [];
  const headers = {};
  response.headers.forEach((value, name) => {
    if (name.toLowerCase() !== "set-cookie") headers[name] = value;
  });

  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const isText =
    contentType.startsWith("text/") ||
    /json|javascript|xml|form-urlencoded|graphql/.test(contentType);

  return {
    statusCode: response.status,
    headers,
    ...(setCookies.length ? { cookies: setCookies } : {}),
    body: isText ? bytes.toString("utf8") : bytes.toString("base64"),
    isBase64Encoded: !isText,
  };
}

export async function handleAuthEvent(event, env = process.env) {
  const auth = createAuth(env);
  return responseToApiGateway(await auth.handler(eventToRequest(event)));
}
