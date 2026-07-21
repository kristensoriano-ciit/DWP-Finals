import {
  test as base,
  expect,
  request,
  type APIRequestContext,
  type BrowserContext,
} from '@playwright/test'

export const storageKeys = {
  accessToken: 'checkpoint.accessToken',
  expiresAtUtc: 'checkpoint.expiresAtUtc',
  retrospectiveDraftPrefix: 'checkpoint:retrospective-draft:',
} as const

export const fixtureIdentities = {
  admin: { email: 'e2e-admin@example.com', displayName: 'E2E Admin', role: 'Admin' },
  performanceAuthor: { email: 'e2e-performance-author@example.com', displayName: 'E2E Performance Author', role: 'Author' },
  accountAuthor: { email: 'e2e-account-author@example.com', displayName: 'E2E Account Author', role: 'Author' },
  lifecycleAuthor: { email: 'e2e-lifecycle-author@example.com', displayName: 'E2E Lifecycle Author', role: 'Author' },
  conflictAuthor: { email: 'e2e-conflict-author@example.com', displayName: 'E2E Conflict Author', role: 'Author' },
  deactivationTarget: { email: 'e2e-deactivation-target@example.com', displayName: 'E2E Deactivation Target', role: 'Author' },
  cleanAuthor: { email: 'e2e-clean-author@example.com', displayName: 'E2E Clean Author', role: 'Author' },
  registeredAuthor: { email: 'e2e-registered-author@example.com', displayName: 'E2E Registered Author', role: 'Author' },
} as const

export type FixtureIdentity = keyof typeof fixtureIdentities

type AuthResponse = {
  accessToken: string
  expiresAtUtc: string
}

type E2EFixtures = {
  createAnonymousContext: () => Promise<BrowserContext>
  createRoleContext: (identity: FixtureIdentity) => Promise<BrowserContext>
}

async function authenticate(api: APIRequestContext, identity: FixtureIdentity): Promise<AuthResponse> {
  const password = process.env.E2E_PASSWORD
  if (!password) throw new Error('E2E_PASSWORD must be configured.')

  const response = await api.post('/api/auth/login', {
    data: { email: fixtureIdentities[identity].email, password },
  })
  if (!response.ok()) {
    throw new Error(`Fixture authentication failed with status ${response.status()}.`)
  }

  const auth = await response.json() as Partial<AuthResponse>
  if (!auth.accessToken || !auth.expiresAtUtc) {
    throw new Error('Fixture authentication returned an invalid session.')
  }
  return auth as AuthResponse
}

export const test = base.extend<E2EFixtures>({
  createAnonymousContext: async ({ browser }, provide) => {
    const contexts = new Set<BrowserContext>()

    await provide(async () => {
      const context = await browser.newContext({
        baseURL: 'http://localhost:4173',
        ignoreHTTPSErrors: true,
        reducedMotion: 'reduce',
      })
      contexts.add(context)
      return context
    })

    for (const context of contexts) await context.close()
  },
  createRoleContext: async ({ browser }, provide) => {
    const contexts = new Set<BrowserContext>()
    const api = await request.newContext({
      baseURL: 'https://localhost:7047',
      ignoreHTTPSErrors: true,
    })

    await provide(async (identity) => {
      const auth = await authenticate(api, identity)
      const context = await browser.newContext({
        baseURL: 'http://localhost:4173',
        ignoreHTTPSErrors: true,
        reducedMotion: 'reduce',
      })
      contexts.add(context)
      await context.addInitScript(({ tokenKey, expiryKey, token, expiry }) => {
        sessionStorage.clear()
        sessionStorage.setItem(tokenKey, token)
        sessionStorage.setItem(expiryKey, expiry)
      }, {
        tokenKey: storageKeys.accessToken,
        expiryKey: storageKeys.expiresAtUtc,
        token: auth.accessToken,
        expiry: auth.expiresAtUtc,
      })
      return context
    })

    for (const context of contexts) await context.close()
    await api.dispose()
  },
})

export { expect }
