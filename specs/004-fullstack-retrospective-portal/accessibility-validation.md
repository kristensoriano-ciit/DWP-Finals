# Accessibility and Journey Validation

## Authoritative Run

The latest authoritative local run completed on 2026-07-21 from commit `aae6c77`, with the
follow-up browser-validation worktree applied. It used Chromium 149.0.7827.55 against the ASP.NET
Core Release API and Vite production preview on Windows LocalDB.

- Clean setup: 1 passed. The suite migrated an empty `DwpFinalsE2E` database, used environment-driven
  Admin seeding, and created Games, an Author, and Retrospectives through the browser.
- Deterministic journey and accessibility run: 11 passed.
- Journey coverage: Visitor discovery/filter/sort/pagination/history/detail behavior; Account
  registration, return paths, restoration, profile/password changes, and role denial; Author create,
  edit, lifecycle, visibility, stale conflict, dirty-navigation, and archive behavior; Admin Game
  create/edit/archive and retained attribution; Admin User cancellation, deactivation, session
  invalidation, and self-deactivation prevention.
- Accessibility route coverage: `/`, `/games`, `/retrospectives/:id`, `/login`, `/register`,
  `/account`, `/dashboard/retrospectives`, `/admin/games`, and `/admin/users`.
- Responsive coverage: 320, 768, and 1280 CSS-pixel widths with visible-overflow checks.
- Accessibility coverage: Axe WCAG A/AA scans, keyboard order, visible focus, skip link, mobile-menu
  focus restoration, associated validation errors, polite live status, modal focus containment and
  restoration, reduced motion, and named image fallback.

## Manual Spot Check

Pending. A human visual and screen-reader spot check has not been completed. The automated results
above do not claim or replace that manual validation.

## Limitations

This is deterministic Chromium automation on one local Windows machine, not a substitute for
manual assistive-technology testing or coverage of Firefox, WebKit, browser zoom, operating-system
high-contrast modes, screen readers, speech input, touch-only interaction, or production network and
hosting behavior. Axe detects only automatable rule violations, and the representative route set is
not every possible data/state combination.

## Defects

No accessibility or journey defects remained after the authoritative run. All 12 tests passed and
no WCAG A/AA Axe violations or responsive overflow failures were reported.
