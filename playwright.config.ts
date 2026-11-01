import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  // Keep run output inside node_modules so it is git-ignored.
  outputDir: "node_modules/.cache/playwright-results",
  reporter: "list",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    // e2e never calls a paid API.
    env: { PORT: String(port), RESEARCH_MODE: "mock" },
  },
});
