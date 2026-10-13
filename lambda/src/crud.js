/**
 * Auth-guarded CRUD for /items (Phase 2, Step 9).
 *
 * Token validation: Better Auth session lookup straight from the API Gateway
 * event headers (cookie OR Authorization: Bearer via the bearer plugin).
 *
 * Payload schema validation lives HERE: API Gateway HTTP APIs (v2) have no
 * REST-style request models, so input validation is enforced as the first
 * line of the handler (the decision flagged in Step 6).
 */
import { eq, and, desc } from "drizzle-orm";
import { createDb } from "./db.js";
import { createAuth } from "./auth.js";
import { buildHeaders, normalizePath } from "./auth-handler.js";
import { items, auditLog } from "./schema/app.js";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export function parseBody(event) {
  if (event.body == null) return null;
  try {
    return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body);
  } catch {
    return null;
  }
}

/** PRD §4.2 input schema validation (enforced in-Lambda for HTTP API v2). */
export function validateItemInput(input, { partial = false } = {}) {
  const errors = [];
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Body must be a JSON object"] };
  }
  const allowed = new Set(["title", "description", "completed"]);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) errors.push(`Unknown field: ${key}`);
  }
  if (!partial || "title" in input) {
    if (typeof input.title !== "string" || input.title.trim().length === 0) {
      errors.push("title is required and must be a non-empty string");
    } else if (input.title.length > 200) {
      errors.push("title must be at most 200 characters");
    }
  }
  if ("description" in input && input.description !== null && typeof input.description !== "string") {
    errors.push("description must be a string or null");
  }
  if ("completed" in input && typeof input.completed !== "boolean") {
    errors.push("completed must be a boolean");
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

// Best-effort audit trail: a failed audit write must not fail the request.
async function writeAudit(db, entry) {
  try {
    await db.insert(auditLog).values(entry);
  } catch (err) {
    console.error("audit_log write failed", err);
  }
}

export async function handleItems(event, deps = {}) {
  const env = deps.env ?? process.env;
  const db = deps.db ?? createDb(env);
  const auth = deps.auth ?? createAuth(env);

  // --- Token/session validation (PRD §3 step 3-4) --------------------------
  const session = await auth.api.getSession({ headers: buildHeaders(event) });
  if (!session?.user) return json(401, { message: "Unauthorized" });
  const user = session.user;

  const method = (event.requestContext?.http?.method ?? "GET").toUpperCase();
  const id = normalizePath(event).match(/^\/items\/([^/]+)$/)?.[1];
  const owner = eq(items.createdBy, user.id);

  if (method === "GET" && !id) {
    const rows = await db
      .select()
      .from(items)
      .where(owner)
      .orderBy(desc(items.createdAt));
    return json(200, { items: rows });
  }

  if (method === "POST" && !id) {
    const body = parseBody(event);
    const check = validateItemInput(body);
    if (!check.ok) return json(400, { message: "Validation failed", errors: check.errors });
    const [created] = await db
      .insert(items)
      .values({
        title: body.title.trim(),
        description: body.description ?? null,
        completed: body.completed ?? false,
        createdBy: user.id,
      })
      .returning();
    await writeAudit(db, {
      actorId: user.id,
      actorEmail: user.email,
      action: "item.create",
      entity: "item",
      entityId: created.id,
    });
    return json(201, { item: created });
  }

  if (method === "GET" && id) {
    const [row] = await db
      .select()
      .from(items)
      .where(and(eq(items.id, id), owner));
    return row ? json(200, { item: row }) : json(404, { message: "Not found" });
  }

  if (method === "PUT" && id) {
    const body = parseBody(event);
    const check = validateItemInput(body, { partial: true });
    if (!check.ok) return json(400, { message: "Validation failed", errors: check.errors });
    const patch = {};
    if ("title" in body) patch.title = body.title.trim();
    if ("description" in body) patch.description = body.description;
    if ("completed" in body) patch.completed = body.completed;
    patch.updatedAt = new Date();
    const [updated] = await db
      .update(items)
      .set(patch)
      .where(and(eq(items.id, id), owner))
      .returning();
    if (!updated) return json(404, { message: "Not found" });
    await writeAudit(db, {
      actorId: user.id,
      actorEmail: user.email,
      action: "item.update",
      entity: "item",
      entityId: updated.id,
    });
    return json(200, { item: updated });
  }

  if (method === "DELETE" && id) {
    const [deleted] = await db
      .delete(items)
      .where(and(eq(items.id, id), owner))
      .returning({ id: items.id });
    if (!deleted) return json(404, { message: "Not found" });
    await writeAudit(db, {
      actorId: user.id,
      actorEmail: user.email,
      action: "item.delete",
      entity: "item",
      entityId: deleted.id,
    });
    return { statusCode: 204, body: "" };
  }

  return json(404, { message: "No such route" });
}
