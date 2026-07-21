import { defineConfig, devices } from '@playwright/test'

const frontendUrl = 'http://localhost:4173'

const authenticatedUse = {
  trace: 'off' as const,
  video: 'off' as const,
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results/artifacts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: frontendUrl,
    browserName: 'chromium',
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'clean-setup',
      testMatch: /journeys\.spec\.ts/,
      grep: /@clean-setup/,
      use: authenticatedUse,
    },
    {
      name: 'visitor',
      testMatch: /journeys\.spec\.ts/,
      grep: /@visitor/,
      use: { trace: 'retain-on-failure', video: 'retain-on-failure' },
    },
    {
      name: 'account',
      testMatch: /journeys\.spec\.ts/,
      grep: /@account/,
      use: authenticatedUse,
    },
    {
      name: 'author',
      testMatch: /journeys\.spec\.ts/,
      grep: /@author/,
      use: authenticatedUse,
    },
    {
      name: 'admin-games',
      testMatch: /journeys\.spec\.ts/,
      grep: /@admin-games/,
      use: authenticatedUse,
    },
    {
      name: 'admin-users',
      testMatch: /journeys\.spec\.ts/,
      grep: /@admin-users/,
      use: authenticatedUse,
    },
    {
      name: 'accessibility-public',
      testMatch: /accessibility\.spec\.ts/,
      grep: /@public/,
      use: { trace: 'retain-on-failure', video: 'retain-on-failure' },
    },
    {
      name: 'accessibility-authenticated',
      testMatch: /accessibility\.spec\.ts/,
      grep: /@authenticated/,
      use: authenticatedUse,
    },
    {
      name: 'performance',
      testMatch: /performance\.spec\.ts/,
      use: authenticatedUse,
    },
  ],
})
