import { AxeBuilder } from '@axe-core/playwright'
import { expect, type Locator, type Page } from '@playwright/test'

export const routes = {
  home: '/',
  games: '/games',
  retrospectives: '/retrospectives',
  login: '/login',
  register: '/register',
  account: '/account',
  password: '/account/password',
  authorRetrospectives: '/dashboard/retrospectives',
  authorUnpublished: '/dashboard/retrospectives/unpublished',
  newRetrospective: '/dashboard/retrospectives/new',
  admin: '/admin',
  adminGames: '/admin/games',
  newAdminGame: '/admin/games/new',
  adminUsers: '/admin/users',
  forbidden: '/forbidden',
} as const

const loadingStatus = /^(Loading|Restoring)/i

export async function waitForContent(page: Page, primaryContent?: Locator) {
  await page.waitForLoadState('domcontentloaded')
  await expect(page.locator('main')).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: loadingStatus })).toHaveCount(0)
  await expect(primaryContent ?? page.getByRole('heading', { level: 1 })).toBeVisible()
}

export async function pressAndExpectFocus(page: Page, key: string, target: Locator) {
  await page.keyboard.press(key)
  await expect(target).toBeFocused()
  await expect(target).toHaveCSS('outline-style', /^(?!none$).+/)
}

export async function tabTo(page: Page, target: Locator, maximumTabs = 30) {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press('Tab')
    if (await target.evaluate((element) => element === document.activeElement)) return
  }
  throw new Error(`Target did not receive focus within ${maximumTabs} Tab presses.`)
}

export async function expectNoVisibleOverflow(page: Page) {
  const overflowing = await page.locator('body *').evaluateAll((elements) => {
    const viewportWidth = document.documentElement.clientWidth
    return elements.flatMap((element) => {
      const htmlElement = element as HTMLElement
      const style = getComputedStyle(htmlElement)
      if (style.display === 'none' || style.visibility === 'hidden') return []
      const rect = htmlElement.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return []
      if (rect.left >= -0.5 && rect.right <= viewportWidth + 0.5) return []
      return [htmlElement.id ? `#${htmlElement.id}` : htmlElement.tagName.toLowerCase()]
    })
  })
  expect(overflowing, `Visible elements overflow the ${await page.evaluate(() => innerWidth)}px viewport`).toEqual([])
}

export async function expectReducedMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const violations = await page.locator('body *').evaluateAll((elements) => elements.flatMap((element) => {
    const style = getComputedStyle(element)
    const animation = style.animationName !== 'none' && parseFloat(style.animationDuration) > 0
    const transition = style.transitionProperty !== 'none' && parseFloat(style.transitionDuration) > 0
    return animation || transition ? [element.tagName.toLowerCase()] : []
  }))
  expect(violations, 'Reduced-motion mode must disable non-zero animations and transitions.').toEqual([])
}

export async function axeForReadyContent(page: Page, primaryContent?: Locator) {
  await waitForContent(page, primaryContent)
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
}

export function percentile95(samples: readonly number[]) {
  if (samples.length === 0) throw new Error('At least one sample is required.')
  const sorted = [...samples].sort((left, right) => left - right)
  return sorted[Math.ceil(sorted.length * 0.95) - 1]
}
