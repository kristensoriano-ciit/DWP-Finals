<!--
Sync Impact Report
- Version change: unfilled template -> 1.0.0
- Added principles:
  - I. Clear Boundaries and Readable Code
  - II. Testing Is Part of Delivery
  - III. Consistent and Accessible User Experience
  - IV. Measurable Performance
  - V. Small, Verifiable Delivery
- Added sections:
  - Technology and Architecture Constraints
  - Development Workflow and Quality Gates
- Removed sections: none; template placeholders were replaced.
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
- Command review:
  - ✅ .opencode/commands/speckit.*.md remain compatible.
- Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Confirm the original constitution adoption date.
-->

# DWP Finals Constitution

## Core Principles

### I. Clear Boundaries and Readable Code

Code MUST make ownership of behavior easy to trace. ASP.NET Core controllers MUST handle
HTTP concerns while services own business rules. Dependencies MUST use constructor injection,
and I/O operations MUST use async APIs. Request models, domain logic, and persistence concerns
MUST remain separated. React code MUST use focused function components and readable state and
conditional-rendering logic. Direct, explicit code is preferred over abstractions that do not
solve a demonstrated problem. These rules keep the project understandable and maintainable for
student developers.

### II. Testing Is Part of Delivery

Automated tests MUST cover business rules, validation, authorization, and important state
transitions. API and persistence boundaries MUST have integration coverage when their behavior
cannot be proven by a unit test. Critical React interactions MUST have focused component or
integration tests. Every defect fix MUST include a regression test when the behavior can be
automated. A feature is not complete until its applicable tests, builds, and static checks pass.
The type and depth of testing MUST match the risk of the change rather than an arbitrary test
count.

### III. Consistent and Accessible User Experience

Features MUST reuse established navigation, terminology, controls, spacing, and feedback
patterns. Every data-driven screen MUST define loading, empty, success, validation, and error
states where applicable. Interactive controls MUST have meaningful labels, visible focus, and
keyboard-operable behavior. Layouts MUST remain usable at supported desktop and mobile widths.
User-facing errors MUST explain what happened and what the user can do next without exposing
internal implementation details. Consistency reduces user confusion and prevents each feature
from behaving like a separate application.

### IV. Measurable Performance

Feature specifications MUST identify performance-sensitive user journeys and the conditions used
to measure them. Under documented normal test conditions, primary API operations MUST target a
95th-percentile response time below 500 milliseconds, and primary UI content MUST target display
within 2.5 seconds. Collections that can grow MUST use bounded queries, filtering, or pagination.
Network and database access MUST avoid unnecessary repeated calls. A feature that cannot meet a
target MUST document the measurement, reason, and approved trade-off in its implementation plan.

### V. Small, Verifiable Delivery

Work MUST be divided into the smallest independently useful feature slice that can be explained,
implemented, and validated end to end. Each slice MUST have explicit acceptance scenarios and a
clear owner such as a controller and service or a component and hook. The narrowest relevant
validation MUST run immediately after the first implementation change, followed by broader
validation before completion. Additional layers, interfaces, or dependencies MUST be justified
by current requirements rather than anticipated complexity.

## Technology and Architecture Constraints

- The backend MUST use ASP.NET Core on .NET 8 and expose clear HTTP/JSON contracts.
- Backend business logic MUST live in injected services; controllers MUST remain thin.
- Persistence MUST be accessed asynchronously and isolated behind a service or repository when
  that boundary improves testability and readability.
- The frontend MUST use React with TypeScript, function components, and focused hooks.
- API request and response models MUST be explicit and MUST not expose secrets or persistence-only
  fields.
- Authentication, authorization, and ownership checks MUST be enforced by the backend. The UI MAY
  hide unavailable actions, but it MUST NOT be the security boundary.
- New libraries, patterns, and project layers MUST be introduced only when the current feature
  requires them and their purpose can be explained clearly.

## Development Workflow and Quality Gates

1. A feature specification MUST define prioritized user journeys, acceptance scenarios, relevant
   edge cases, user-experience states, and measurable performance expectations.
2. An implementation plan MUST pass the Constitution Check before design work and again after the
   design is complete.
3. Tasks MUST include the automated tests and validation work required by the risk of each user
   story; tests are not an optional polish activity.
4. Implementation MUST begin at the controller, service, component, or hook that most directly
   owns the behavior and proceed as a small traceable slice.
5. The smallest applicable build, test, or lint command MUST run after the first edit. All affected
   builds, tests, and static checks MUST pass before the feature is complete.
6. Documentation in `docs/`, `AGENTS.md`, or feature artifacts MUST be updated when behavior,
   architecture, or workflow changes.

## Governance

This constitution governs all feature specifications, plans, tasks, implementation work, and
reviews in DWP Finals. When another project document conflicts with this constitution, the
constitution takes precedence. `AGENTS.md` and the active stack skills provide operational
guidance but MUST remain consistent with these principles.

Amendments MUST be intentional, documented in the Sync Impact Report, and propagated to affected
templates and guidance. Constitution versions follow semantic versioning: MAJOR for incompatible
principle removal or redefinition, MINOR for a new principle or material expansion, and PATCH for
clarifications that do not change obligations. Every review MUST verify applicable quality,
testing, user-experience, performance, and workflow gates. Any approved exception MUST be recorded
in the feature plan with its reason and a simpler alternative that was considered.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): Original adoption date not yet confirmed | **Last Amended**: 2026-07-20
