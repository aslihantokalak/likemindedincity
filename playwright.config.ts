import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:4322" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // --ignore-lock keeps the server in the foreground (Astro auto-backgrounds it when run by an AI agent).
    command: "npm run build && npm run preview -- --port 4322 --ignore-lock",
    port: 4322,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
