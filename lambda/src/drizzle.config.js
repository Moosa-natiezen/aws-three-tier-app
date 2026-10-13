import { defineConfig } from "drizzle-kit";

// Migration toolchain config. The URL is only read by `drizzle-kit migrate`
// (push/generate never connect without it being valid) — export
// NEON_DATABASE_URL from .env to run against Neon. No secret is committed.
export default defineConfig({
  dialect: "postgresql",
  schema: "./schema/index.js",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL ?? "postgres://placeholder",
  },
  strict: true,
  verbose: true,
});
