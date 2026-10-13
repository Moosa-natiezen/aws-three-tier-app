/**
 * Single shared Postgres pool per warm Lambda container (Tech Stack §4:
 * Neon pooler integration; NFR §5.1 burst safety). All schema — Better Auth
 * core tables + app tables — is registered on one Drizzle instance so both
 * the auth adapter and CRUD handlers resolve tables from the same client.
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as authSchema from "./schema/auth.js";
import * as appSchema from "./schema/app.js";

const dbCache = new Map();

export function createDb(env = process.env) {
  const key = env.NEON_DATABASE_URL ?? "";
  if (!dbCache.has(key)) {
    const pool = new Pool({
      connectionString: env.NEON_DATABASE_URL,
      max: 5, // per-container cap; Neon pooler multiplexes across Lambdas
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // Neon terminates TLS; CA is not bundled in the pg client image.
      ssl: { rejectUnauthorized: false },
    });
    dbCache.set(
      key,
      drizzle(pool, { schema: { ...authSchema, ...appSchema } }),
    );
  }
  return dbCache.get(key);
}
