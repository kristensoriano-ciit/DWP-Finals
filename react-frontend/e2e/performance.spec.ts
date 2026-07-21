import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { cpus, platform, arch } from 'node:os'
import { dirname, resolve } from 'node:path'
import { expect, test } from './fixtures'
import { percentile95, routes } from './helpers'

test.describe.configure({ mode: 'serial' })

const warmups = 3
const recordedSamples = 20
const thresholdMilliseconds = 2_500
const outputPath = resolve('test-results/performance-results.json')

type RouteResult = {
  route: string
  viewport: number
  warmups: number
  samples: number[]
  p95: number
  passed: boolean
}

test('six API-backed routes meet per-route p95 at 320px and 1280px and emit raw JSON evidence', async ({ browser, createRoleContext }) => {
  test.setTimeout(900_000)
  const authorContext = await createRoleContext('performanceAuthor')
  const adminContext = await createRoleContext('admin')
  const publicContext = await browser.newContext({ baseURL: 'http://localhost:4173', ignoreHTTPSErrors: true, reducedMotion: 'reduce' })
  const pages = {
    public: await publicContext.newPage(),
    author: await authorContext.newPage(),
    admin: await adminContext.newPage(),
  }
  const routeDefinitions = [
    { name: 'Home', route: routes.home, page: pages.public, ready: '.featured' },
    { name: 'Games', route: routes.games, page: pages.public, ready: '.game-grid' },
    { name: 'Retrospectives', route: routes.retrospectives, page: pages.public, ready: '.story-grid' },
    { name: 'Author dashboard', route: routes.authorRetrospectives, page: pages.author, ready: '.owner-list' },
    { name: 'Admin Games', route: routes.adminGames, page: pages.admin, ready: '.admin-game-list' },
    { name: 'Admin Users', route: routes.adminUsers, page: pages.admin, ready: '.admin-user-list' },
  ]
  const results: RouteResult[] = []
  const chromiumVersion = await browser.version()

  try {
    for (const viewport of [320, 1280]) {
      for (const definition of routeDefinitions) {
        await definition.page.setViewportSize({ width: viewport, height: 900 })
        const visit = async () => {
          const failures: string[] = []
          const onConsole = (message: { type(): string; text(): string }) => {
            if (message.type() === 'error') failures.push(`console: ${message.text()}`)
          }
          const onPageError = (error: Error) => failures.push(`browser: ${error.message}`)
          const onRequestFailed = (request: { url(): string; failure(): { errorText: string } | null }) =>
            failures.push(`request: ${request.url()} ${request.failure()?.errorText ?? 'failed'}`)
          const onResponse = (response: { status(): number; url(): string }) => {
            if (response.status() >= 400) failures.push(`HTTP ${response.status()}: ${response.url()}`)
          }
          definition.page.on('console', onConsole)
          definition.page.on('pageerror', onPageError)
          definition.page.on('requestfailed', onRequestFailed)
          definition.page.on('response', onResponse)
          const started = performance.now()
          await definition.page.goto(definition.route, { waitUntil: 'domcontentloaded' })
          await expect(definition.page.locator(definition.ready).first()).toBeVisible()
          const elapsed = performance.now() - started
          definition.page.off('console', onConsole)
          definition.page.off('pageerror', onPageError)
          definition.page.off('requestfailed', onRequestFailed)
          definition.page.off('response', onResponse)
          expect(failures, `${definition.name} at ${viewport}px emitted runtime errors`).toEqual([])
          return Number(elapsed.toFixed(2))
        }

        for (let index = 0; index < warmups; index += 1) await visit()
        const samples: number[] = []
        for (let index = 0; index < recordedSamples; index += 1) samples.push(await visit())
        const p95 = percentile95(samples)
        results.push({
          route: definition.name,
          viewport,
          warmups,
          samples,
          p95,
          passed: p95 < thresholdMilliseconds,
        })
      }
    }
  } finally {
    const aggregateP95 = results.length ? percentile95(results.flatMap((result) => result.samples)) : null
    let commit = 'unavailable'
    try {
      commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: resolve('..'), encoding: 'utf8' }).trim()
    } catch {
      // Evidence remains useful in exported worktrees without Git metadata.
    }
    const evidence = {
      generatedAtUtc: new Date().toISOString(),
      commit,
      chromiumVersion,
      nodeVersion: process.version,
      buildMode: 'Vite production preview; ASP.NET Core Release',
      machine: { platform: platform(), architecture: arch(), logicalCpuCount: cpus().length },
      database: { server: '(localdb)\\DwpFinals', name: 'DwpFinalsE2E' },
      datasetSeed: 'NormalPerformanceDatasetSeeder: 100 games, 100 users, 200 retrospectives',
      thresholdMilliseconds,
      requiredWarmups: warmups,
      requiredSamples: recordedSamples,
      aggregateP95,
      passed: results.length === 12 && results.every((result) => result.passed),
      results,
    }
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
    await publicContext.close()
  }

  expect(results).toHaveLength(12)
  for (const result of results) {
    expect(result.samples, `${result.route} at ${result.viewport}px sample count`).toHaveLength(recordedSamples)
    expect(result.p95, `${result.route} at ${result.viewport}px p95`).toBeLessThan(thresholdMilliseconds)
  }
})
