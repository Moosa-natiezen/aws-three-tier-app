/**
 * Better Auth server instance (Phase 2, Step 7).
 * Secrets come exclusively from runtime env vars (Tech Stack §4):
 * NEON_DATABASE_URL (Neon POOLED endpoint — PRD §4.3), BETTER_AUTH_SECRET,
 * BETTER_AUTH_URL. Never hardcode; see repo-root .env.example.
 *
 * Connection management: one module-scope pg Pool per warm Lambda container,
 * sized conservatively and fronted by Neon's pooler so 0 -> 1000+ RPS bursts
 * (NFR §5.1) cannot saturate Postgres connections.
 */
import { betterAuth } from "better-auth/minimal";
import { bearer } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/auth.js";

// Cache per connection string so tests can exercise multiple envs.
const cache = new Map();

function buildAuth(env) {
  const pool = new Pool({
    connectionString: env.NEON_DATABASE_URL,
    max: 5, // per-container cap; Neon pooler multiplexes across Lambdas
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Neon terminates TLS; CA is not bundled in the pg client image.
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool, { schema });

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL || "http://localhost",
    secret: env.BETTER_AUTH_SECRET,
    basePath: "/auth", // routes: /auth/sign-in/email, /auth/get-session, ...
    database: drizzleAdapter(db, { provider: "pg", schema }),
    // UI/UX §3: SPA sends Authorization: Bearer <session token> to API GW.
    plugins: [bearer()],
  });
}

export function createAuth(env = process.env) {
  const key = env.NEON_DATABASE_URL ?? "";
  if (!cache.has(key)) cache.set(key, buildAuth(env));
  return cache.get(key);
}
