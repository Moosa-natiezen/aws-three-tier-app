/**
 * Application data tables (PRD §4.3 Data Tier):
 *   - items       ("App Data" entity group — the /items CRUD resource)
 *   - audit_log   ("Audit Logs" entity group)
 * The Users entity group lives in schema/auth.js (Better Auth core tables).
 */
import {
  pgTable,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

const uuid = () => crypto.randomUUID();

export const items = pgTable(
  "items",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    title: text("title").notNull(),
    description: text("description"),
    completed: boolean("completed").notNull().default(false),
    // Owned data: deleting a user removes their rows.
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("items_created_by_idx").on(t.createdBy)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    // No FK on purpose: audit history must outlive deleted users.
    actorId: text("actor_id"),
    actorEmail: text("actor_email"),
    action: text("action").notNull(), // "item.create" | "item.update" | "item.delete" | ...
    entity: text("entity").notNull(), // "item" | "user" | ...
    entityId: text("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_entity_idx").on(t.entity, t.entityId),
    index("audit_log_created_at_idx").on(t.createdAt),
  ],
);
