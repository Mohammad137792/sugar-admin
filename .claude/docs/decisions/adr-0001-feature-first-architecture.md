---
id: adr-0001-feature-first-architecture
title: Feature-First Architecture Over Layer-First
category: decision
status: Accepted
date: 2026-07-18
deciders: Engineering
---

# ADR-0001: Feature-First Architecture Over Layer-First

## Status

Accepted. This ADR formalizes a decision that was already implicit in `context.md` and `constitution.md` before this document existed; it is being recorded now, per the Constitution's Documentation section, so the reasoning is discoverable rather than assumed.

## Context

Sugar Admin's product surface (`context.md`'s Primary Features) spans Authentication, Dashboard, Products, AI Content, AI Images, Publishing, Customer Management, Chat Center, and Analytics — nine distinct domains that will each grow its own screens, data access, and business rules over time. `context.md`'s Long-Term Vision adds CRM, Accounting, Inventory Synchronization, Shipping, Payments, Loyalty, and an AI Sales Assistant on top of that.

Two organizing strategies were available for `src/`:

1. **Layer-first** — one global `components/`, `hooks/`, `services/`, `store/` folder for the entire application, with every feature's code interleaved inside each.
2. **Feature-first** — one folder per product domain under `src/features/<feature>/`, with each feature owning its own components, hooks, repository, services, state, types, constants, and tests.

`constitution.md`'s Feature Ownership section states this directly: "Each feature owns: components, hooks, repository, services, state, types, constants, tests. Cross-feature imports should happen through public APIs only." `context.md`'s Architecture Principles names "Feature First Architecture" explicitly, and its Folder Philosophy section repeats the same ownership list. `00-chief-architect.md`'s Scalability responsibility frames the test directly: "Will this still work after 100 features?" — a question layer-first organization fails as the feature count grows, because every layer folder (`components/`, `hooks/`, `services/`) becomes a flat, unrelated list of every feature's code, and there is no folder boundary preventing one feature's code from silently depending on another's internals.

**Current, verified codebase state:** `src/features/` contains five folders — `ai-chat/`, `auth/`, `content/`, `dashboard/`, `reports/` — confirmed by direct listing. Every one of them currently contains only a `screens/` subfolder with a single screen file (e.g. `src/features/auth/screens/LoginScreen.tsx`, `src/features/content/screens/ContentScreen.tsx`). None has `components/`, `hooks/`, `repository/`, `services/`, `state/`, `types/`, `constants/`, `tests/`, or an `index.ts` public API — the full structure `constitution.md` describes is not yet built out inside any feature folder. `.claude/handbook/feature-structure.md` § 5 documents this same gap and states plainly that it "is not a failure — it is exactly what an early Foundation-phase codebase should look like" (`context.md`'s Current Development Phase: Foundation, Early Development).

## Decision

Sugar Admin organizes `src/` by product feature (`src/features/<feature>/...`), not by technical layer. Every new feature — starting with Products, per `context.md`'s Primary Features — is created as its own folder under `src/features/`, and every feature is expected to eventually own the full structure `constitution.md`'s Feature Ownership section describes: `screens/`, `components/`, `hooks/`, `repository/`, `services/`, `state/`, `types/`, `constants/`, `tests/`, and a barrel `index.ts` that is the only path another feature may import through.

This decision is architecturally **Accepted** at the top level (the choice of feature-first over layer-first is settled) but only **partially realized structurally** — the five existing feature folders have not yet grown into the full target shape, because they have not yet needed to (no repository, no feature-local hooks, no feature-local state exist yet for any of them). Growing a feature folder into the full shape happens when real content requires it, not speculatively — see `.claude/handbook/feature-structure.md` § 4 and `.claude/agents/40-refactor-engineer.md` § 10 ("Migration Target B"), which owns this exact gradual migration and explicitly forbids scaffolding empty subfolders ahead of need.

## Consequences

**Positive:**
- Growth is localized. Adding the Products feature (`context.md`'s next Primary Feature) means adding one new folder, `src/features/products/`, without touching any of the other four features' code or folders.
- Ownership is unambiguous — `00-chief-architect.md`'s Principle 2 ("every feature has exactly one owner") is directly supported by a folder structure where "who owns this file" is answered by which `src/features/<name>/` directory it lives in.
- The eventual `index.ts` public-API boundary (not yet present in any feature, since none has internals to hide yet) gives Sugar Admin a concrete mechanism for the Constitution's "cross-feature imports should happen through public APIs only" rule, rather than leaving it as an unenforced convention.
- Matches the vertical-slice delivery order `context.md`'s Development Philosophy already commits to (Authentication → Product Management → AI Caption Generation → Publishing → Analytics) — a feature-first folder structure and a vertical-slice delivery plan reinforce each other; a layer-first structure would fight against it.

**Negative / accepted debt:**
- The five existing feature folders are `screens/`-only today, not the full target shape — a new engineer reading `constitution.md`'s Feature Ownership section in isolation would expect to find `repository/`, `hooks/`, etc. inside `src/features/content/` and not find them. This is documented, intentional, non-blocking debt (`.claude/handbook/feature-structure.md` § 5), with a named follow-up owner (`40-refactor-engineer.md` § 10, "Migration Target B") and an explicit trigger for when each feature folder should grow (when real repository/hook/component work lands for that feature, not before).
- Feature-first organization has a real cost the Constitution does not paper over: a change that genuinely spans two features (e.g. a Products change that also needs Dashboard's stats to reflect new inventory) has no single folder to live in and must be built as two coordinated, feature-owned changes connected only through public APIs — this is slower per-change than a shared layer folder would be, but is the explicit trade this ADR accepts in exchange for long-term scalability (`00-chief-architect.md`'s "will this still work after 100 features?" test).
- No `index.ts` public-API barrel exists yet in any feature folder, so the "cross-feature imports through public APIs only" rule is currently aspirational, not mechanically enforced (nothing today prevents `src/features/dashboard/screens/DashboardScreen.tsx` from reaching into `src/features/content/screens/ContentScreen.tsx` directly). Follow-up: `index.ts` barrels should be added as part of `40-refactor-engineer.md`'s Migration Target B, feature by feature, alongside each feature's first real internal structure.

## Alternatives Considered

- **Layer-first (`src/components/`, `src/hooks/`, `src/services/`, `src/store/` shared across the whole app)** — rejected. This is closer to the codebase's current shape *outside* `src/features/` (e.g. `src/components/ui/Button.tsx`, `src/store/authStore.ts`, `src/context/ThemeContext.tsx` are genuinely shared, app-wide concerns and correctly live at the top level, not inside a feature). But applying layer-first to feature-specific code (a Products list screen's data hook, a Chat Center's message repository) would mean every layer folder grows without bound as features are added, with no folder boundary stopping cross-feature coupling. Rejected directly by `00-chief-architect.md`'s Scalability principle.
- **Fully realize the target feature-folder shape immediately for all five existing features, before any new feature work** — rejected. `constitution.md`'s Simplicity Wins ("avoid unnecessary abstraction... avoid unnecessary configuration") and `40-refactor-engineer.md`'s Principle 6 both argue against scaffolding `hooks/`, `repository/`, `state/`, `services/`, `tests/` folders with no content behind them "to look more complete." The Foundation phase (`context.md`) does not yet have real data or logic behind most of these features (e.g. `ContentScreen.tsx` is a placeholder reading "Coming soon..."), so building out the full structure now would be speculative architecture, which `00-chief-architect.md`'s Principle 4 explicitly forbids.
- **Domain-driven "module" folders decoupled from screens (e.g. `src/domains/products/` separate from `src/screens/products/`)** — rejected as unnecessary additional indirection for an application of Sugar Admin's current size; `constitution.md`'s Simplicity Wins favors the flatter feature-folder-owns-its-screens shape already in use, and no product requirement motivates the extra separation today.

## Sign-off

Engineering (retroactive documentation of an architectural choice already in force via `constitution.md` and `context.md`). No separate `architecture-proposal.md` review cycle preceded this ADR, consistent with this ADR template's Instructions: "An ADR describing a decision that was made *without* going through review... should say so honestly in Status." The structural completion of this decision (Migration Target B) remains open and is tracked, not this ADR's top-level choice of feature-first organization.

## Related Decisions

- **ADR-0002 (Mock-First Development)** — depends on this ADR structurally: the target `repository/` subfolder each feature eventually grows (mock + real + factory) only has somewhere principled to live because ADR-0001 already establishes that each feature owns its own data-access layer, rather than a single shared `src/api/` folder owning it for every feature.
- **ADR-0003 (Zustand for Global State)** — the two existing global stores (`authStore`, `uiStore`) live at the top level, outside `src/features/`, precisely because they are cross-cutting concerns that no single feature owns — this is the correct exception ADR-0001's structure predicts: feature-owned state belongs inside a feature folder's future `state/` subfolder, while genuinely global state stays outside all of them.
- This ADR is the architectural precondition for `.claude/docs/examples/products-feature-plan.md`, which proposes the sixth feature folder (`src/features/products/`) and, in its Repository Contracts section, sketches the same `repository/` subfolder shape this ADR anticipates.

## References

- `.claude/constitution.md` — Feature Ownership, Single Responsibility, Predictability
- `.claude/context.md` — Architecture Principles, Folder Philosophy, Primary Features, Development Philosophy
- `.claude/agents/00-chief-architect.md` — § 3 (Feature Architecture, Folder Organization), § 8 (Scalability question)
- `.claude/agents/40-refactor-engineer.md` — § 10 (Migration Target B — Feature Folder Structure)
- `.claude/handbook/feature-structure.md` — § 4 (Target Shape), § 5 (Current Shape)
- `.claude/knowledge/architecture-decisions.md` — § 4 (ADR-0001 summary)
