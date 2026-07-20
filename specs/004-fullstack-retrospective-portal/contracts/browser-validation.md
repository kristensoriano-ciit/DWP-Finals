# Browser Validation Contract

## Runtime Boundary

| Item | Contract |
|------|----------|
| Database | Server `(localdb)\DwpFinals`, exact database `DwpFinalsE2E`, and `E2E_ALLOW_DATABASE_RESET=YES`; reset rejects every mismatch |
| API | Release build at `https://localhost:7047` |
| Frontend | Production preview at `http://localhost:4173` |
| Browser | Playwright Chromium, one worker, fresh context per journey |
| Secrets | `E2E_CONNECTION_STRING`, `E2E_JWT_KEY`, and `E2E_PASSWORD` environment values |
| Artifacts | Authenticated traces/video disabled; anonymous traces and synthetic-data screenshots retained on failure; every generated artifact ignored by Git |

## Journey Contract

- Visitor covers Home, Games, Retrospectives, filtering, sorting, paging, details, browser history,
  direct routes, public visibility, and image fallbacks.
- Account covers registration, visible-form login, protected return, refresh restoration, profile,
  password change, forced sign-out, and role-forbidden routes.
- Author covers create, edit, all statuses, public visibility, unpublish validation, stale conflict,
  dirty navigation, and archive.
- Admin Games covers create, search, edit, public/Author visibility, cancel/confirm archive, focus
  restoration, and retained attribution.
- Admin Users covers cancel/confirm deactivation, target-session invalidation, and self-protection.
- Clean setup starts from an empty migrated E2E database, verifies environment-driven Admin creation,
  creates at least two active Games and one upcoming Game through Admin UI, registers an Author,
  creates Draft/Review/Published/Unpublished Retrospectives, publishes two differently rated items,
  archives a Game after publication, and verifies retained attribution.

## Accessibility and Responsive Contract

- Validate representative public, account, Author, and Admin routes at 320, 768, and 1280 CSS pixels.
- Run Axe WCAG 2 A/AA after primary content settles.
- Operate primary actions with keyboard input and verify visible focus, logical order, modal focus,
  Escape cancellation, and trigger focus restoration.
- Verify field errors are associated, async status is announced semantically, reduced-motion rules
  apply, image fallbacks are named, and visible descendants do not clip outside the viewport.
- Automated semantics do not replace one final human visual review or screen-reader spot check.
- Record date, commit, Chromium version, routes, viewports, checks, pass/fail results, limitations, and
  defects in `specs/004-fullstack-retrospective-portal/accessibility-validation.md`.

## Performance Contract

- Measure Home, Games, Retrospectives, Author dashboard, Admin Games, and Admin Users.
- Measure 320px and 1280px contexts separately.
- Use three warm-up visits and 20 recorded sequential visits per route and viewport.
- Stop timing when deterministic API-backed primary content is visible.
- Fail samples with browser, console, HTTP, or API errors.
- Calculate p95 as sorted sample index `ceil(n * 0.95) - 1`.
- Every route/viewport p95 must be below 2,500 ms; aggregate values may not hide a route failure.
- Write raw samples to `react-frontend/test-results/performance-results.json` and record date, commit,
  Chromium/Node versions, build mode, machine/database details, dataset seed, route/viewpoint sample
  counts, per-route and aggregate p95, pass/fail results, and approved exceptions in `performance.md`.
