import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `npm run eval` (docs/spec.md §17.1): scores the cases in evals/cases/ and fails on a regression.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["evals/**/*.eval.ts"],
    environment: "node",
    silent: false,
    reporters: ["verbose"],
  },
});
