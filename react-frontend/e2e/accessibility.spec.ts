import { expect, test } from './fixtures'
import {
  axeForReadyContent,
  expectNoVisibleOverflow,
  expectReducedMotion,
  pressAndExpectFocus,
  routes,
  tabTo,
  waitForContent,
} from './helpers'

const retrospectiveId = '30000000-0000-0000-0000-000000000011'
const viewports = [320, 768, 1280] as const

async function expectAxeClean(page: Parameters<typeof axeForReadyContent>[0]) {
  const results = await (await axeForReadyContent(page)).analyze()
  expect.soft(results.violations, results.violations.map((violation) =>
    `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.target.join(' ')).join(', ')})`,
  ).join('\n')).toEqual([])
}

test('@public public routes pass WCAG A/AA and overflow checks at 320, 768 and 1280', async ({ page }) => {
  test.setTimeout(120_000)
  const publicRoutes = [routes.home, routes.games, `/retrospectives/${retrospectiveId}`]
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of publicRoutes) {
      await page.goto(route)
      await expectAxeClean(page)
      await expectNoVisibleOverflow(page)
    }
  }
})

test('@public keyboard order, visible focus, mobile menu focus and Escape restoration are correct', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto(routes.home)
  await waitForContent(page)
  const skipLink = page.getByRole('link', { name: 'Skip to content' })
  await pressAndExpectFocus(page, 'Tab', skipLink)
  await page.keyboard.press('Enter')
  await expect.soft(page.locator('main')).toBeFocused()

  const menu = page.getByRole('button', { name: 'Menu' })
  await menu.focus()
  await page.keyboard.press('Enter')
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')

  await page.goto(routes.login)
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  await tabTo(page, page.getByLabel('Email'))
  await expect(page.getByLabel('Email')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Password')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeFocused()
})

test('@public field errors are associated and asynchronous status is a polite live region', async ({ page }) => {
  await page.goto(routes.register)
  await page.getByRole('button', { name: 'Create account' }).click()
  const name = page.getByLabel('Display name')
  const email = page.getByLabel('Email')
  const secret = page.getByLabel('Password')
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toHaveAttribute('aria-describedby', 'displayName-error')
  await expect(email).toHaveAttribute('aria-describedby', 'email-error')
  await expect(secret).toHaveAttribute('aria-describedby', 'password-error')
  await expect(page.locator('#displayName-error')).toContainText('Display name')

  await page.route('**/api/auth/register', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    await route.fulfill({ status: 409, contentType: 'application/problem+json', body: JSON.stringify({ title: 'Conflict' }) })
  })
  await name.fill('Accessible Author')
  await email.fill('e2e-accessibility-author@example.com')
  await secret.fill('BrowserPassword1')
  await page.getByRole('button', { name: 'Create account' }).click()
  const liveStatus = page.getByText('Creating your account...', { exact: true })
  await expect(liveStatus).toHaveAttribute('role', 'status')
  await expect(liveStatus).toHaveAttribute('aria-live', 'polite')
  await expect(page.getByRole('status')).toContainText('already exists')
})

test('@public reduced motion, named image fallback and all responsive routes remain safe', async ({ page }) => {
  await page.goto(`/retrospectives/${retrospectiveId}`)
  await waitForContent(page)
  await expect(page.getByRole('img', { name: 'Performance retrospective 011 image unavailable' })).toBeVisible()
  await expectReducedMotion(page)
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 })
    await expectNoVisibleOverflow(page)
  }
})

test('@authenticated representative account, Author and Admin routes pass WCAG A/AA and responsive overflow checks', async ({ createRoleContext }) => {
  test.setTimeout(180_000)
  const authorContext = await createRoleContext('accountAuthor')
  const adminContext = await createRoleContext('admin')
  const authorPage = await authorContext.newPage()
  const adminPage = await adminContext.newPage()
  for (const width of viewports) {
    await authorPage.setViewportSize({ width, height: 900 })
    for (const route of [routes.account, routes.authorRetrospectives]) {
      await authorPage.goto(route)
      await expectAxeClean(authorPage)
      await expectNoVisibleOverflow(authorPage)
    }
    await adminPage.setViewportSize({ width, height: 900 })
    for (const route of [routes.adminGames, routes.adminUsers]) {
      await adminPage.goto(route)
      await expectAxeClean(adminPage)
      await expectNoVisibleOverflow(adminPage)
    }
  }
})

test('@authenticated modal traps focus, cancels with Escape and restores its trigger', async ({ createRoleContext }) => {
  const context = await createRoleContext('admin')
  const page = await context.newPage()
  await page.goto(`${routes.adminGames}?search=Performance+Game+012`)
  await waitForContent(page, page.getByRole('heading', { name: 'Performance Game 012' }))
  const trigger = page.getByRole('button', { name: 'Archive Performance Game 012' })
  await trigger.focus()
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Archive Performance Game 012?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  const confirm = dialog.getByRole('button', { name: 'Archive game' })
  await expect.soft(confirm).toBeFocused()
  await confirm.focus()
  await page.keyboard.press('Tab')
  await expect.soft(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
})
