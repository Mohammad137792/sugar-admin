---
id: docs-examples-readme
title: Worked Examples — Index
category: example
status: Accepted
date: 2026-07-18
deciders: Engineering
---

# Worked Examples

This folder contains fully worked examples of Sugar Admin's engineering standards applied end to end — not summaries of the standards, not abbreviated illustrations, but complete, usable documents an engineer could actually implement against or use as a template for their own work.

Their purpose is onboarding: a new engineer, or a new AI agent session with no prior conversation history, should be able to open one of these files and see exactly what "done" looks like for the corresponding workspace standard, with every section filled in the way a real review would require, not left as `<placeholder>`.

---

## What's Here

### [`products-feature-plan.md`](./products-feature-plan.md)

A complete feature plan for **Products** (Create, Update, Delete, Archive, Search, Categories, Inventory, Images — per `context.md`'s Primary Features), written to the full standard defined in `.claude/agents/10-feature-planner.md`:

- Three full Screen Specifications (§ 9): `ProductListScreen`, `ProductDetailScreen`, `ProductFormScreen`, every screen carrying all six required states.
- A complete Repository Contract (§ 10) for `ProductRepository`, with explicit input/output shapes, named error cases, pagination behavior, and retry-safety per method.
- State Shape classifications (§ 11) for every distinct piece of Products state.
- Navigation Entries (§ 12) for every new route, matching `src/navigation/types.ts`'s real conventions.
- A fully completed Edge Case Catalog (§ 13) — every category addressed, nothing marked "N/A" without a reason.
- An independently verifiable Acceptance Criteria checklist and an Open Questions section that is (correctly, per the standard) empty.

**Important:** `src/features/products/` does not exist in the codebase yet. This document is a proposal/example — the next artifact in the pipeline, ready for `network-engineer`, `state-engineer`, `ui-engineer`, and `react-native-engineer` to implement against — not a description of something already built.

### [`auth-repository-migration-example.md`](./auth-repository-migration-example.md)

A complete before/after worked example migrating the real, current `src/api/endpoints/auth.ts` (a direct-axios-call module — see ADR-0002 and ADR-0003 in `../decisions/`) into the target Repository Pattern defined in `.claude/agents/24-network-engineer.md` § 10 and `.claude/agents/40-refactor-engineer.md` § 9:

- The real "before" code, unmodified, as it exists in the codebase today.
- A complete "after": an `AuthRepository` interface, a mock implementation satisfying every item in `.claude/handbook/mock-api.md` § 4 (latency, failure, validation, empty/authorization behavior), and an HTTP implementation wrapping the existing `src/api/client.ts` unchanged.
- A note on exactly how `src/store/authStore.ts` would change to depend on the repository instead of importing `authApi` directly, preserving `authStore`'s existing observable behavior.

---

## How These Relate to the Rest of the Workspace

Both documents are downstream applications of standards defined elsewhere, not new standards themselves:

- `products-feature-plan.md` applies `.claude/agents/10-feature-planner.md` in full.
- `auth-repository-migration-example.md` applies `.claude/agents/24-network-engineer.md` § 10, `.claude/handbook/mock-api.md`, and `.claude/handbook/repository-pattern.md`, and demonstrates the kind of change `.claude/agents/40-refactor-engineer.md` § 9 ("Migration Target A") would eventually execute for real.

If either the standard or the underlying codebase changes in a way that makes one of these examples inaccurate, the example should be updated to match — a stale worked example is worse than no worked example, because it teaches the wrong thing with the appearance of authority. `60-documentation-engineer` owns catching that kind of drift, same as it does for `../decisions/`.

---

## References

- `.claude/agents/10-feature-planner.md` — the standard `products-feature-plan.md` applies
- `.claude/agents/24-network-engineer.md`, `.claude/agents/40-refactor-engineer.md` — the standards `auth-repository-migration-example.md` applies
- `.claude/templates/feature-proposal.md` — the base template `products-feature-plan.md` is filled from
- `.claude/handbook/mock-api.md`, `.claude/handbook/repository-pattern.md` — mock and repository conventions demonstrated in the migration example
- `../decisions/adr-0002-mock-first-development.md`, `../decisions/adr-0001-feature-first-architecture.md` — the architectural decisions both examples put into practice
