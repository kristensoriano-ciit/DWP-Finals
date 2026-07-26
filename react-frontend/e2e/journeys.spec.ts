import { type Page } from '@playwright/test'
import { expect, fixtureIdentities, test } from './fixtures'
import { routes, waitForContent } from './helpers'

test.describe.configure({ mode: 'serial' })

const activeGameId = '20000000-0000-0000-0000-000000000011'
const publishedRetrospectiveId = '30000000-0000-0000-0000-000000000011'

function password() {
  const value = process.env.E2E_PASSWORD
  if (!value) throw new Error('E2E_PASSWORD must be configured.')
  return value
}

async function signIn(page: Page, email: string, secret = password()) {
  await page.goto(routes.login)
  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(secret)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
}

async function register(page: Page, identity: typeof fixtureIdentities.cleanAuthor | typeof fixtureIdentities.registeredAuthor) {
  await page.goto(routes.register)
  await page.getByLabel('Display name').fill(identity.displayName)
  await page.getByLabel('Email').fill(identity.email)
  await page.getByLabel('Password').fill(password())
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(routes.authorRetrospectives)
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

async function fillGame(page: Page, title: string, releaseDate: string) {
  const form = page.locator('form.game-form')
  await form.getByLabel('Title').fill(title)
  await form.getByLabel('Description').fill(`${title} deterministic browser fixture.`)
  await form.getByLabel('Release date').fill(releaseDate)
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().endsWith('/api/games') && candidate.request().method() === 'POST'),
    form.getByRole('button', { name: 'Create game' }).click(),
  ])
  expect(response.ok(), `Create game returned HTTP ${response.status()}`).toBe(true)
  await expect(page).toHaveURL(routes.adminGames)
  await expect(page.getByRole('heading', { name: 'Games', exact: true })).toBeVisible()
}

async function createGame(page: Page, title: string, releaseDate: string) {
  await page.goto(routes.newAdminGame)
  await waitForContent(page, page.getByRole('heading', { name: 'New game' }))
  await fillGame(page, title, releaseDate)
}

async function createRetrospective(page: Page, values: {
  game: string
  title: string
  rating: number
  status: 'draft' | 'review' | 'published' | 'unpublished'
}) {
  await page.goto(routes.newRetrospective)
  await waitForContent(page, page.getByRole('heading', { name: 'New retrospective' }))
  const form = page.locator('form.retrospective-form')
  await form.getByLabel('Game').selectOption({ label: values.game })
  await form.getByLabel('Title').fill(values.title)
  await form.getByLabel('Retrospective').fill(`A deterministic retrospective journey for ${values.title}.`)
  await form.getByLabel('Rating').fill(String(values.rating))
  await form.getByLabel('Initial status').selectOption(values.status)
  if (values.status === 'unpublished') {
    await form.getByLabel('Reason for unpublishing').fill('Held back by the deterministic browser journey.')
  }
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().endsWith('/api/retrospectives') && candidate.request().method() === 'POST'),
    form.getByRole('button', { name: 'Create retrospective' }).click(),
  ])
  expect(response.ok(), `Create retrospective returned HTTP ${response.status()}`).toBe(true)
  const created = await response.json() as { id?: string }
  expect(created.id).toBeTruthy()
  await expect(page.getByRole('status')).toContainText('Retrospective saved')
  return created.id!
}

test('@clean-setup builds the required dataset from an empty migrated database', async ({ page }) => {
  test.setTimeout(180_000)
  await signIn(page, fixtureIdentities.admin.email)
  await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible()

  await createGame(page, 'Clean Alpha', '2025-01-15')
  await createGame(page, 'Clean Beta', '2025-02-15')
  await createGame(page, 'Clean Upcoming', '2035-03-15')
  await signOut(page)

  await register(page, fixtureIdentities.cleanAuthor)
  await createRetrospective(page, { game: 'Clean Alpha', title: 'Clean Draft', rating: 3, status: 'draft' })
  await createRetrospective(page, { game: 'Clean Beta', title: 'Clean Review', rating: 5, status: 'review' })
  const publishedId = await createRetrospective(page, { game: 'Clean Alpha', title: 'Clean Published High', rating: 9, status: 'published' })
  await createRetrospective(page, { game: 'Clean Beta', title: 'Clean Published Low', rating: 6, status: 'published' })
  await createRetrospective(page, { game: 'Clean Upcoming', title: 'Clean Unpublished', rating: 4, status: 'unpublished' })

  await page.goto(`/retrospectives/${publishedId}`)
  await expect(page.getByRole('heading', { name: 'Clean Published High' })).toBeVisible()
  await expect(page.getByText(`By ${fixtureIdentities.cleanAuthor.displayName}`)).toBeVisible()
  await signOut(page)

  await signIn(page, fixtureIdentities.admin.email)
  await page.goto(`${routes.adminGames}?search=Clean+Alpha`)
  const archive = page.getByRole('button', { name: 'Archive Clean Alpha' })
  await archive.click()
  await page.getByRole('dialog').getByRole('button', { name: 'Archive game' }).click()
  await expect(page.getByRole('status')).toContainText('retrospectives retain its attribution')
  await page.goto(`/retrospectives/${publishedId}`)
  await expect(page.getByRole('heading', { name: 'Clean Published High' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Clean Alpha' })).toBeVisible()
})

test('@visitor browses, filters, sorts, pages, follows details and history', async ({ page }) => {
  await page.goto(routes.home)
  await waitForContent(page)
  await expect(page.getByRole('heading', { name: 'Performance retrospective 001' })).toBeVisible()

  await page.getByRole('link', { name: 'Games', exact: true }).click()
  await page.getByLabel('Search games').fill('Performance Game 011')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText('1 games')).toBeVisible()
  await page.getByRole('link', { name: 'Performance Game 011', exact: true }).click()
  await expect(page).toHaveURL(`/games/${activeGameId}`)
  await page.goBack()
  await expect(page).toHaveURL(/\/games\?search=Performance\+Game\+011/)

  await page.goto(`${routes.games}?page=2`)
  await expect(page.getByRole('button', { name: '2', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Previous' }).click()
  await expect(page).toHaveURL(routes.games)
  await expect(page.getByRole('button', { name: '1', exact: true })).toHaveAttribute('aria-current', 'page')

  await page.goto(routes.retrospectives)
  await page.getByLabel('Search retrospectives').fill('Performance retrospective 011')
  await page.getByLabel('Sort').selectOption('best')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText('1 retrospectives')).toBeVisible()
  await page.getByRole('link', { name: 'Performance retrospective 011', exact: true }).click()
  await expect(page).toHaveURL(`/retrospectives/${publishedRetrospectiveId}`)
  await expect(page.getByText(`By ${fixtureIdentities.performanceAuthor.displayName}`)).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/sort=best/)

  await page.goto(`/games/${activeGameId}`)
  await expect(page.getByRole('heading', { name: 'Performance Game 011' })).toBeVisible()
  await page.goto(`/retrospectives/${publishedRetrospectiveId}`)
  await expect(page.getByRole('heading', { name: 'Performance retrospective 011' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Performance retrospective 011 image unavailable' })).toBeVisible()
  await page.goto('/retrospectives/30000000-0000-0000-0000-000000000081')
  await expect(page.getByRole('heading', { name: 'Retrospective not found' })).toBeVisible()
})

test('@account registers, returns to a protected route, restores, updates, changes password and is forbidden by role', async ({ page }) => {
  const identity = fixtureIdentities.registeredAuthor
  const changedPassword = `${password()}-changed`
  await register(page, identity)
  await signOut(page)
  await page.goto(routes.account)
  await expect(page).toHaveURL(routes.login)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.getByLabel('Email').fill(identity.email)
  await page.getByLabel('Password').fill(password())
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect.soft(page).toHaveURL(routes.account)
  await page.goto(routes.account)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()
  await page.getByLabel('Display name').fill('E2E Registered Author Updated')
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByRole('status')).toHaveText('Profile updated.')
  await page.goto(routes.admin)
  await expect(page).toHaveURL(routes.forbidden)
  await expect(page.getByRole('heading', { name: 'You cannot open this page' })).toBeVisible()

  await page.goto(routes.password)
  await page.getByLabel('Current password').fill(password())
  await page.getByLabel('New password').fill(changedPassword)
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page).toHaveURL(routes.login)
  await expect.soft(page.getByRole('status')).toContainText('Password changed')
  await signIn(page, identity.email, changedPassword)
  await expect(page).toHaveURL(routes.password)
  await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible()
})

test('@author exercises editing, every status, visibility, validation, stale conflict, dirty navigation and archive', async ({ createAnonymousContext, createRoleContext }) => {
  test.setTimeout(180_000)
  const context = await createRoleContext('lifecycleAuthor')
  const page = await context.newPage()
  const title = 'Lifecycle Browser Retrospective'
  const id = await createRetrospective(page, { game: 'Performance Game 011', title, rating: 8, status: 'draft' })
  await page.goto(`/dashboard/retrospectives/${id}/edit`)
  await waitForContent(page, page.getByRole('heading', { name: 'Edit retrospective' }))
  const form = page.locator('form.retrospective-form')
  await form.getByLabel('Title').fill(`${title} Edited`)
  await form.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('status')).toContainText('Retrospective saved')

  const lifecycle = page.locator('section.lifecycle')
  await lifecycle.getByLabel('Change status').selectOption('review')
  await lifecycle.getByRole('button', { name: 'Update status' }).click()
  await expect(page.getByRole('status')).toContainText('review')
  await lifecycle.getByLabel('Change status').selectOption('published')
  await lifecycle.getByRole('button', { name: 'Update status' }).click()
  await expect(page.getByRole('status')).toContainText('published')

  const anonymousContext = await createAnonymousContext()
  const publicPage = await anonymousContext.newPage()
  await publicPage.goto(`/retrospectives/${id}`)
  await expect(publicPage.getByRole('heading', { name: `${title} Edited` })).toBeVisible()

  await lifecycle.getByLabel('Change status').selectOption('unpublished')
  await lifecycle.getByRole('button', { name: 'Update status' }).click()
  await expect(lifecycle.getByRole('alert')).toHaveText('Enter a reason for unpublishing.')
  await lifecycle.getByLabel('Reason for unpublishing').fill('Revising after browser validation.')
  await lifecycle.getByRole('button', { name: 'Update status' }).click()
  await expect(page.getByRole('status')).toContainText('unpublished')
  await publicPage.reload()
  await expect(publicPage.getByRole('heading', { name: 'Retrospective not found' })).toBeVisible()

  await page.goto(routes.authorUnpublished)
  await waitForContent(page, page.getByRole('heading', { name: 'Unpublished Retrospectives' }))
  await expect(page.getByRole('columnheader', { name: 'Reason' })).toBeVisible()
  const unpublishedRow = page.getByRole('row', { name: new RegExp(`${title} Edited`) })
  await expect(unpublishedRow.getByRole('rowheader', { name: `${title} Edited` })).toBeVisible()
  await expect(unpublishedRow.getByRole('cell', { name: 'Revising after browser validation.' })).toBeVisible()

  await page.goto(`/dashboard/retrospectives/${id}/edit`)
  await waitForContent(page, page.getByRole('heading', { name: 'Edit retrospective' }))
  await lifecycle.getByLabel('Change status').selectOption('published')
  await lifecycle.getByRole('button', { name: 'Update status' }).click()
  await expect(page.getByRole('status')).toContainText('published')

  const conflictId = await createRetrospective(page, { game: 'Performance Game 012', title: 'Stale Conflict Journey', rating: 7, status: 'draft' })
  await page.goto(`/dashboard/retrospectives/${conflictId}/edit`)
  await waitForContent(page, page.getByRole('heading', { name: 'Edit retrospective' }))
  const secondContext = await createRoleContext('lifecycleAuthor')
  const secondPage = await secondContext.newPage()
  await secondPage.goto(`/dashboard/retrospectives/${conflictId}/edit`)
  await waitForContent(secondPage, secondPage.getByRole('heading', { name: 'Edit retrospective' }))
  await page.locator('form.retrospective-form').getByLabel('Title').fill('Fresh server version')
  await page.locator('form.retrospective-form').getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('status')).toContainText('saved')
  await secondPage.locator('form.retrospective-form').getByLabel('Title').fill('Preserved stale draft')
  await secondPage.locator('form.retrospective-form').getByRole('button', { name: 'Save changes' }).click()
  await expect(secondPage.getByRole('status')).toContainText('Another version was saved')
  await expect(secondPage.getByRole('button', { name: 'Load current server version' })).toBeVisible()

  await secondPage.getByRole('link', { name: 'Back to My Retrospectives' }).click()
  const warning = secondPage.getByRole('alertdialog', { name: 'Leave with unsaved changes?' })
  await expect(warning).toBeVisible()
  await warning.getByRole('button', { name: 'Keep editing' }).click()
  await expect(secondPage).toHaveURL(new RegExp(`${conflictId}/edit$`))
  await secondPage.getByRole('link', { name: 'Back to My Retrospectives' }).click()
  await warning.getByRole('button', { name: 'Discard and leave' }).click()
  await expect(secondPage).toHaveURL(routes.authorRetrospectives)

  await page.goto(`/dashboard/retrospectives/${id}/edit`)
  await waitForContent(page, page.getByRole('heading', { name: 'Edit retrospective' }))
  await page.locator('section.lifecycle').getByRole('button', { name: 'Archive', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Archive retrospective' }).click()
  await expect(page).toHaveURL(routes.authorRetrospectives)
  await expect(page.getByText(`${title} Edited`)).toHaveCount(0)
})

test('@admin-games creates, searches, edits, verifies visibility, cancels and confirms archive with attribution retained', async ({ createAnonymousContext, createRoleContext }) => {
  test.setTimeout(120_000)
  const adminContext = await createRoleContext('admin')
  const page = await adminContext.newPage()
  await page.goto(routes.admin)
  await waitForContent(page, page.getByRole('heading', { name: 'Admin' }))
  await expect(page.getByRole('heading', { name: 'New Releases', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Upcoming Releases', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Best Retrospectives', exact: true })).toBeVisible()
  await createGame(page, 'Admin Journey Game', '2026-06-01')
  await page.goto(`${routes.adminGames}?search=Admin+Journey+Game`)
  await expect(page.getByRole('heading', { name: 'Admin Journey Game' })).toBeVisible()
  await page.getByRole('link', { name: 'Edit Admin Journey Game' }).click()
  await page.locator('form.game-form').getByLabel('Title').fill('Admin Journey Game Edited')
  await page.locator('form.game-form').getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('status')).toHaveText('Game updated.')

  const anonymousContext = await createAnonymousContext()
  const publicPage = await anonymousContext.newPage()
  await publicPage.goto(`${routes.games}?search=Admin+Journey+Game+Edited`)
  await expect(publicPage.getByRole('heading', { name: 'Admin Journey Game Edited' })).toBeVisible()
  const authorContext = await createRoleContext('accountAuthor')
  const authorPage = await authorContext.newPage()
  await authorPage.goto(routes.newRetrospective)
  await expect(authorPage.getByLabel('Game').getByRole('option', { name: 'Admin Journey Game Edited' })).toHaveCount(1)

  await page.goto(`${routes.adminGames}?search=Admin+Journey+Game+Edited`)
  const archiveTrigger = page.getByRole('button', { name: 'Archive Admin Journey Game Edited' })
  await archiveTrigger.focus()
  await archiveTrigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(archiveTrigger).toBeFocused()
  await archiveTrigger.click()
  await dialog.getByRole('button', { name: 'Archive game' }).click()
  await expect(page.getByRole('status')).toContainText('was archived')
  await publicPage.reload()
  await expect(publicPage.getByRole('heading', { name: 'Admin Journey Game Edited' })).toHaveCount(0)
  await authorPage.reload()
  await expect(authorPage.getByLabel('Game').getByRole('option', { name: 'Admin Journey Game Edited' })).toHaveCount(0)

  await page.goto(`${routes.adminGames}?search=Performance+Game+011`)
  await page.getByRole('button', { name: 'Archive Performance Game 011' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Archive game' }).click()
  await publicPage.goto(`/retrospectives/${publishedRetrospectiveId}`)
  await expect(publicPage.getByRole('link', { name: 'Performance Game 011' })).toBeVisible()
})

test('@admin-users cancels and confirms deactivation, invalidates the target session and prevents self-deactivation', async ({ createRoleContext }) => {
  const targetContext = await createRoleContext('deactivationTarget')
  const targetPage = await targetContext.newPage()
  await targetPage.goto(routes.account)
  await expect(targetPage.getByRole('heading', { name: 'Profile' })).toBeVisible()

  const adminContext = await createRoleContext('admin')
  const page = await adminContext.newPage()
  await page.goto(`${routes.adminUsers}?page=5`)
  await waitForContent(page, page.getByRole('heading', { name: 'Users' }))
  const selfButton = page.getByRole('button', { name: `Deactivate ${fixtureIdentities.admin.displayName}` })
  await expect(selfButton).toBeDisabled()
  await expect(page.getByText('This is your account. You cannot deactivate yourself.')).toBeVisible()

  const trigger = page.getByRole('button', { name: `Deactivate ${fixtureIdentities.deactivationTarget.displayName}` })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await dialog.getByRole('button', { name: 'Deactivate user' }).click()
  await expect(page.getByRole('status')).toContainText('access was deactivated')
  await expect(trigger).toBeDisabled()

  await targetPage.goto(routes.authorRetrospectives)
  await expect(targetPage).toHaveURL(routes.login)
  await expect(targetPage.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})
