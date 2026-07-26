import { isValidElement, type ReactElement } from 'react'
import { RequireRole } from './auth/RequireRole'
import { RequireSession } from './auth/RequireSession'
import { AuthorRetrospectivesPage } from './pages/author/AuthorRetrospectivesPage'
import { router } from './router'

type GuardElement = ReactElement<{ role?: string }>
type PageElement = ReactElement<{ fixedStatus?: string }>

it('keeps the unpublished retrospective route Author-only', () => {
  const root = router.routes[0]
  const sessionRoutes = root.children?.find((route) => isValidElement(route.element) && route.element.type === RequireSession)
  const authorRoutes = sessionRoutes?.children?.find((route) => isValidElement(route.element) && route.element.type === RequireRole && (route.element as GuardElement).props.role === 'Author')
  const adminRoutes = sessionRoutes?.children?.find((route) => isValidElement(route.element) && route.element.type === RequireRole && (route.element as GuardElement).props.role === 'Admin')
  const unpublishedRoute = authorRoutes?.children?.find((route) => route.path === 'dashboard/retrospectives/unpublished')

  expect(unpublishedRoute?.element).toSatisfy((element: unknown) => isValidElement(element) && element.type === AuthorRetrospectivesPage)
  expect((unpublishedRoute?.element as PageElement).props.fixedStatus).toBe('unpublished')
  expect(adminRoutes?.children?.some((route) => route.path?.startsWith('dashboard/retrospectives'))).toBe(false)
})
