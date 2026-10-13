import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// SPA hosted on S3/CloudFront (PRD §2 presentation tier).
// Build emits content-hashed JS/CSS filenames for the immutable cache rule,
// with index.html as the no-cache entry document (UI/UX §4).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false, // no source maps with public assets (UI/UX §4 hygiene)
  },
  server: {
    host: true, // bind 0.0.0.0 for LAN/container access
    port: 3000,
  },
});
