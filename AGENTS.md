# AGENTS.md

## Purpose

This repository uses `.opencode` as the local agent workflow surface.

- `.opencode/agents/` defines role behavior.
- `.opencode/skills/` defines domain rules and implementation preferences.
- `.opencode/commands/` defines repeatable prompts for common work.

## Repo Map

- `dotnet-backend/dotnet-backend/`
  ASP.NET Core API, Entity Framework Core data access, and migrations.
- `dotnet-backend/dotnet-backend.Tests/`
  Backend service and migration-backed integration tests.
- `react-frontend/`
  React and Vite portal. Frontend tests are colocated under `src/`.
- `docs/`
  Workspace for project documentation, architecture notes, and delivery checklists.
- `specs/`
  Feature specifications, plans, contracts, quickstarts, and task records.
- `.opencode/agents/`
  Agent definitions used to shape how the assistant works in this repo.
- `.opencode/skills/`
  Reusable implementation rules for stack-specific work.
- `.opencode/commands/`
  Repeatable command prompts for planning and delivery.

## Active Agent

- `dotnet-mentor`
  Default learning-oriented agent for this repo.
  Use it when the goal is to explain, implement, or refactor .NET and React work in a student-friendly way.

## Active Skills

- `dotnet-logic`
  Use for ASP.NET Core structure, service boundaries, controller design, validation, async flows, and testable backend code.
- `react-logic`
  Use for component design, state handling, conditional rendering, decomposition, and readable frontend logic.

## Working Rules

- Start with the smallest feature slice that can be explained, implemented, and validated end to end.
- Use the matching skill before writing code so patterns stay consistent.
- Prefer simple code over clever abstractions.
- When docs are missing, add or update material in `docs/` alongside code changes.
- When a new application project is added, document its real path here and add any app-specific skills or commands if the workflow changes.
