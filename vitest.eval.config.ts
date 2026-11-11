import { defineConfig } from "vitest/config";
import base from "./vitest.config";

// EVAL-4: the brief writing eval runs with the app's aliases and server-only stub, but never in
// `npm test` (it can spend money). Run it with `npm run eval:brief`.
export default defineConfig({
  ...base,
  test: { ...base.test, include: ["evals/**/*.eval.ts"] },
});
