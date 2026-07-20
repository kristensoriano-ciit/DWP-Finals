import { createBrowserRouter } from 'react-router-dom'
import { SiteLayout } from './components/layout/SiteLayout'
import { RequireRole } from './auth/RequireRole'
import { RequireSession } from './auth/RequireSession'
import { ForbiddenPage } from './pages/ForbiddenPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { GameDetailPage } from './pages/public/GameDetailPage'
import { GamesPage } from './pages/public/GamesPage'
import { HomePage } from './pages/public/HomePage'
import { RetrospectiveDetailPage } from './pages/public/RetrospectiveDetailPage'
import { RetrospectivesPage } from './pages/public/RetrospectivesPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { AccountPage } from './pages/account/AccountPage'
import { PasswordPage } from './pages/account/PasswordPage'
import { AuthorRetrospectivesPage } from './pages/author/AuthorRetrospectivesPage'
import { RetrospectiveEditorPage } from './pages/author/RetrospectiveEditorPage'
import { AdminPage } from './pages/admin/AdminPage'
import { AdminGamesPage } from './pages/admin/AdminGamesPage'
import { AdminGameEditorPage } from './pages/admin/AdminGameEditorPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'

export const router = createBrowserRouter([{
  element: <SiteLayout />,
  children: [
    { index: true, element: <HomePage /> },
    { path: 'games', element: <GamesPage /> },
    { path: 'games/:gameId', element: <GameDetailPage /> },
    { path: 'retrospectives', element: <RetrospectivesPage /> },
    { path: 'retrospectives/:retrospectiveId', element: <RetrospectiveDetailPage /> },
    { path: 'login', element: <LoginPage /> },
    { path: 'register', element: <RegisterPage /> },
    {
      element: <RequireSession />,
      children: [
        { path: 'account', element: <AccountPage /> },
        { path: 'account/password', element: <PasswordPage /> },
        {
          element: <RequireRole role="Author" />,
          children: [
            { path: 'dashboard/retrospectives', element: <AuthorRetrospectivesPage /> },
            { path: 'dashboard/retrospectives/new', element: <RetrospectiveEditorPage /> },
            { path: 'dashboard/retrospectives/:retrospectiveId/edit', element: <RetrospectiveEditorPage /> },
          ],
        },
        {
          element: <RequireRole role="Admin" />,
          children: [
            { path: 'admin', element: <AdminPage /> },
            { path: 'admin/games', element: <AdminGamesPage /> },
            { path: 'admin/games/new', element: <AdminGameEditorPage /> },
            { path: 'admin/games/:gameId/edit', element: <AdminGameEditorPage /> },
            { path: 'admin/users', element: <AdminUsersPage /> },
          ],
        },
      ],
    },
    { path: 'forbidden', element: <ForbiddenPage /> },
    { path: '*', element: <NotFoundPage /> },
  ],
}])
