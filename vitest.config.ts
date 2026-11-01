import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";

// Next.js bundles `server-only` itself, so plain Node can't resolve it (plan P-14).
// In unit tests it becomes an empty module, so server modules stay testable.
const serverOnlyStub: Plugin = {
  name: "server-only-stub",
  enforce: "pre",
  resolveId(id) {
    return id === "server-only" ? "\0server-only-stub" : null;
  },
  load(id) {
    return id === "\0server-only-stub" ? "export {};" : null;
  },
};

export default defineConfig({
  plugins: [serverOnlyStub],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
