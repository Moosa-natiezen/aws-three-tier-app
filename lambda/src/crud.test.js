import { test } from "node:test";
import assert from "node:assert/strict";
import { handleItems, validateItemInput } from "./crud.js";

// --- validators -------------------------------------------------------------
test("validateItemInput accepts a full valid item", () => {
  assert.equal(validateItemInput({ title: "Task", description: "d", completed: true }).ok, true);
});

test("validateItemInput rejects empty title and bad types", () => {
  const r = validateItemInput({ title: "  ", completed: "yes" });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 2);
});

test("validateItemInput partial mode allows title-only patch", () => {
  assert.equal(validateItemInput({ title: "New" }, { partial: true }).ok, true);
  assert.equal(validateItemInput({}, { partial: true }).ok, true);
});

// --- fakes ------------------------------------------------------------------
const USER = { user: { id: "u1", email: "a@b.c" } };
const authed = { api: { getSession: async () => USER } };
const anonymous = { api: { getSession: async () => null } };

const makeDb = ({ selectRows = [], returningRows = [], onInsert, onDelete } = {}) => ({
  select: () => ({ from: () => ({ where: () => ({ orderBy: async () => selectRows }) , then: undefined }) }),
  insert: (table) => ({
    // drizzle's .values() is synchronous, returning the builder
    values: (v) => {
      if (onInsert) onInsert(table, v);
      return { returning: async () => returningRows.length ? returningRows : [v] };
    },
  }),
  update: () => ({ set: () => ({ where: () => ({ returning: async () => returningRows }) }) }),
  delete: () => ({ where: () => ({ returning: async () => onDelete?.() ?? returningRows }) }),
});

const evt = (method, path, body) => ({
  requestContext: { http: { method }, stage: "dev" },
  headers: { host: "api.example.com" },
  rawPath: `/dev${path}`,
  rawQueryString: "",
  ...(body ? { body: JSON.stringify(body) } : {}),
});

// --- auth gate --------------------------------------------------------------
test("GET /items without a session returns 401", async () => {
  const res = await handleItems(evt("GET", "/items"), { auth: anonymous, db: makeDb() });
  assert.equal(res.statusCode, 401);
});

test("GET /items lists only the session user's items (stage prefix stripped)", async () => {
  const res = await handleItems(evt("GET", "/items"), {
    auth: authed,
    db: makeDb({ selectRows: [{ id: "i1", title: "A", createdBy: "u1" }] }),
  });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).items.length, 1);
});

// --- create / validate ------------------------------------------------------
test("POST /items valid payload creates item and writes audit_log", async () => {
  const inserts = [];
  const res = await handleItems(evt("POST", "/items", { title: "New item" }), {
    auth: authed,
    db: makeDb({ onInsert: (_table, v) => inserts.push(v), returningRows: [{ id: "i9" }] }),
  });
  assert.equal(res.statusCode, 201);
  assert.equal(JSON.parse(res.body).item.id, "i9");
  const auditEntry = inserts.find((v) => v.action === "item.create");
  assert.equal(auditEntry?.entityId, "i9");
  assert.equal(auditEntry?.actorId, "u1");
});

test("POST /items invalid payload returns 400 with errors", async () => {
  const res = await handleItems(evt("POST", "/items", { title: "" }), { auth: authed, db: makeDb() });
  assert.equal(res.statusCode, 400);
  assert.ok(JSON.parse(res.body).errors.length >= 1);
});

// --- update / delete --------------------------------------------------------
test("PUT /items/{id} with no matching row returns 404", async () => {
  const res = await handleItems(evt("PUT", "/items/missing", { title: "X" }), {
    auth: authed,
    db: makeDb({ returningRows: [] }),
  });
  assert.equal(res.statusCode, 404);
});

test("DELETE /items/{id} returns 204 on success", async () => {
  const res = await handleItems(evt("DELETE", "/items/i9"), {
    auth: authed,
    db: makeDb({ onDelete: () => [{ id: "i9" }] }),
  });
  assert.equal(res.statusCode, 204);
});
