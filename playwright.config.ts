import { defineConfig, devices } from '@playwright/test';
import { config } from './config/environment';

/**
 * Playwright Configuration for Salesforce Lightning Testing
 * Optimized for Salesforce-specific challenges:
 * - Extended timeouts for Lightning Experience page loads
 * - Single browser context to maintain session
 * - Video/screenshot capture for debugging
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Salesforce tests often depend on sequence
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? config.retries.failed : 0,
  workers: 1, // Single worker for sequential test execution
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  timeout: 120000, // 2 minutes per test for Lightning loads
  expect: {
    timeout: config.timeouts.assertion,
  },

  use: {
    baseURL: config.salesforce.instanceUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: config.timeouts.action,
    navigationTimeout: config.timeouts.navigation,

    // Salesforce Lightning requires a larger viewport
    viewport: { width: 1920, height: 1080 },

    // Ignore HTTPS errors for scratch orgs
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Output folder for test artifacts
  outputDir: 'test-results/',
});
