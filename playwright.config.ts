import { defineConfig, devices } from "@playwright/test";

const workers = Number(process.env.PW_WORKERS ?? "1");
const fullyParallel = process.env.FULLY_PARALLEL === "1";
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const testDir = process.env.PW_TEST_DIR ?? "./tests";

export default defineConfig({
  testDir,
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel,
  workers,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    trace: "off",
    video: "off",
    screenshot: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ...devices["Desktop Chrome"],
  },
});
