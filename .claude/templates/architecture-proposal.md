---
id: template-architecture-proposal
title: Architecture Proposal Template
category: template
version: 1.0.0
status: active
last_updated: 2026-07-18
---

# Architecture Proposal Template

## Purpose

Use this template for system-level or cross-feature architectural decisions: new
patterns, folder restructuring, dependency changes, or anything that affects more
than one feature module. This is filled out by `00-chief-architect` — it is the
document form of the Chief Architect's Communication Protocol
(`.claude/agents/00-chief-architect.md` § 6).

Use `feature-proposal.md` instead if the decision fits entirely inside one existing
feature module and does not change a folder standard, repository pattern, state
rule, or navigation convention. If in doubt, escalate as architecture, not a feature
plan — `10-feature-planner` § 5 (Out of Scope) explicitly hands architectural
ambiguity back to `chief-architect`.

## Instructions

Follow `.claude/agents/00-chief-architect.md` § 6 exactly — this template's section
order **is** that protocol, field for field. Do not reorder or rename sections.

1. **Requirements** — restate the request. Never assume what wasn't asked.
2. **Goals** — split functional goals from non-functional goals (performance,
   maintainability, replaceability — see the Constitution's Core Values ordering).
3. **Constraints** — name every real limitation: no backend yet, Mock First
   Development, existing navigation library, existing store shape, third-party SDKs
   already in `package.json`.
4. **Assumptions** — state every assumption explicitly. Silent assumptions become
   silent bugs (§ 6, § "Engineering Mindset").
5. **Proposed Architecture** — exactly one recommended solution. Not a menu.
6. **Alternatives** — real alternatives that were considered and rejected, with why.
7. **Trade-offs** — every architecture has them; name them, don't hide them.
8. **Risks** — architectural risks only, not implementation bugs (e.g. "this couples
   two features" is a risk; "off-by-one in pagination" is not).
9. **Recommendation** — choose one path, explain why, tie back to the Core Values
   ordering in `constitution.md` (Correctness > Simplicity > Maintainability > ...).
10. **Handoff** — name the specific next agent(s), typically `feature-planner` for
    a plan-shaped follow-up, or a specific engineer agent for a narrowly scoped
    technical change.

Run the Architectural Decision Process (§ 8, Steps 1–8) before writing Proposed
Architecture — if any step's answer is "no" or "unclear," the proposal is not ready.

Every architecture decision this template produces should also generate (or update)
an ADR — see `.claude/templates/adr.md` — recording the decision for future readers
per the Constitution's Documentation section.

---

## The Template

```markdown
# Architecture Proposal: <short title>

## Requirements
<Restate exactly what was asked, in the requester's terms. No embellishment.>

## Goals

**Functional:**
- <goal>

**Non-functional:**
- <goal, e.g. "backend swap requires no UI change">

## Constraints
- <constraint, e.g. "no backend selected yet — Mock First Development applies">
- <constraint>

## Assumptions
- <assumption, stated explicitly>

## Proposed Architecture
<The one recommended solution. Include a folder/module sketch, a sequence of
dependency directions, or an interface sketch as needed — whatever makes the
proposal unambiguous to an engineer with no other context.>

## Alternatives

### Alternative: <name>
<What it is, and specifically why it was rejected — tie the rejection to a Core
Value or a named constraint, not vibes.>

## Trade-offs
- <trade-off the chosen architecture accepts, and why it's acceptable>

## Risks
- <architectural risk> — <mitigation, or explicit acceptance with owner>

## Recommendation
<One path. One paragraph explaining why, referencing constitution.md's Core Values
ordering where relevant.>

## Handoff
<Name the next agent(s) and what they should do first.>
```

---

## Filled Example: Migrating `src/api/endpoints/*` to the Repository Pattern

```markdown
# Architecture Proposal: Introduce a Repository Layer in Front of `src/api/endpoints`

## Requirements
Sugar Admin's `context.md` names the Repository Pattern as one of its Architecture
Principles, and the Constitution's Backend Independence section requires that
"migration should require changing repositories, not UI." Today, `src/api/endpoints/
auth.ts` calls `client` (an axios instance from `src/api/client.ts`) directly, and
`src/store/authStore.ts` calls `authApi.login(...)` directly. There is no repository
interface anywhere in the codebase yet. New features (starting with Products, per
`.claude/templates/feature-proposal.md`'s filled example) are being planned against
repository contracts that do not have a real implementation pattern to plug into.
This proposal defines that pattern for `products` first, as a template other
features (`content`, `dashboard`, `reports`, `ai-chat`) migrate to over time.

## Goals

**Functional:**
- A `ProductRepository` interface (already specified in the Products feature plan)
  has both a mock implementation and a real (axios-backed) implementation that are
  interchangeable at a single composition point.
- Existing `authApi`, `contentApi`, etc. keep working unmodified during the
  migration — this is additive, not a rewrite.

**Non-functional:**
- Swapping mock → real for a feature requires changing one file, not every screen
  that feature owns.
- The pattern must not require a DI framework or new dependency — `package.json`
  currently has no DI library and the Constitution's Simplicity Wins principle
  argues against adding one for this.

## Constraints
- No backend is selected yet (`context.md`, Backend Strategy) — the real
  implementation must still target the same `client` (axios) shape already in
  `src/api/client.ts`, since that is the only networking primitive that exists.
- Mock First Development (constitution.md) — every new repository must ship with a
  working mock before or alongside its real implementation.
- No existing repository interface to migrate incrementally from — this is new
  pattern introduction, not a refactor of working code, for the first feature that
  adopts it.
- `TanStack Query` (already in `package.json`) owns caching/refetch; the repository
  layer must sit *below* Query, not duplicate its concerns.

## Assumptions
- Feature modules adopt this pattern going forward for new repository contracts;
  retrofitting `authApi`/`contentApi` is out of scope for this proposal and would be
  a separate, explicitly-approved follow-up (Constitution's Technical Debt section
  requires this follow-up to be documented, which this sentence does).
- One repository interface per feature-owned domain concept (e.g. `ProductRepository`,
  not one giant `ApiRepository`), consistent with the Constitution's Single
  Responsibility principle ("every repository should represent one domain").

## Proposed Architecture

```
src/features/products/
  repository/
    ProductRepository.ts        // the interface (contract) — no implementation
    ProductRepository.mock.ts   // mock implementation, latency + failure simulation
    ProductRepository.live.ts   // real implementation, wraps src/api/client.ts
    index.ts                    // composition point: exports the active instance
```

`index.ts` is the single place that decides mock vs. live:

```ts
import { ENV } from "../../../config/env";
import { mockProductRepository } from "./ProductRepository.mock";
import { liveProductRepository } from "./ProductRepository.live";
import type { ProductRepository } from "./ProductRepository";

export const productRepository: ProductRepository =
  ENV.USE_MOCK_API ? mockProductRepository : liveProductRepository;
```

Screens and hooks depend on `productRepository` (the interface type), never on
`ProductRepository.mock.ts` or `ProductRepository.live.ts` directly — this satisfies
Backend Independence: swapping backends means editing `ProductRepository.live.ts`
and/or the `ENV.USE_MOCK_API` flag, never a screen or hook.

`ProductRepository.live.ts` is the only file allowed to import `src/api/client.ts`
for this feature; this keeps networking detail (axios, `client`) out of the
presentation and business layers, per the Constitution's Separation of Concerns.

## Alternatives

### Alternative: Keep calling `src/api/endpoints/*.ts` directly, as `authStore` does today
Rejected because it is exactly the pattern the Constitution's Backend Independence
section and `context.md`'s Architecture Principles already name as the thing to
avoid — a UI-adjacent layer (`authStore`) is directly coupled to axios today, and
`.claude/agents/10-feature-planner.md` § 10 explicitly flags this as a gap not to
perpetuate for new features.

### Alternative: A single generic `ApiRepository<T>` shared across all features
Rejected because it violates Single Responsibility ("every repository should
represent one domain") and would force every feature's error cases and pagination
quirks through one shared generic type, which the Constitution's "avoid unnecessary
abstraction" principle argues against. Per-domain repositories are simpler and match
Feature Ownership.

### Alternative: Introduce a DI container (e.g. a service locator library)
Rejected — adds a new dependency for a problem solvable with one exported constant
per feature (`index.ts` above). Violates Simplicity Wins and the constraint that no
DI library currently exists in `package.json`.

## Trade-offs
- Every feature now has three repository files instead of one endpoints file — more
  files, but each has one reason to change (Single Responsibility), and it is the
  cost of Backend Independence being real rather than aspirational.
- The mock/live switch is a build-time/env constant, not runtime-swappable per
  request — acceptable because Mock First Development means a given app build is
  either developing against mocks or a real backend, never both at once.
- `authApi`/`contentApi` remain on the old direct-axios pattern until explicitly
  migrated — a temporary inconsistency, documented here per the Constitution's
  Technical Debt rules (reason: scope control; follow-up: a dedicated migration
  proposal once Products validates the pattern).

## Risks
- **Two competing patterns coexist during migration** (direct-axios for
  auth/content/dashboard/reports/ai-chat, repository-based for products) —
  mitigated by documenting this proposal as the target pattern so new code doesn't
  copy the old one, and flagging it in code review (`.claude/templates/review.md`).
- **Someone imports `ProductRepository.live.ts` directly from a screen**, bypassing
  the composition point — mitigated by code review checklist item and, later,
  lint rule restricting cross-file imports within `repository/`.
- **Mock and live implementations drift** (mock returns a shape the live one
  doesn't) — mitigated because both implement the same `ProductRepository`
  TypeScript interface; a drift is a compile error, not a runtime surprise.

## Recommendation
Adopt the repository pattern above for the `products` feature now, as the first
real instance of `context.md`'s stated Repository Pattern principle. This is
recommended over retrofitting `auth`/`content` immediately because Correctness and
Simplicity (constitution.md Core Values, ranked above Delivery Speed) favor
proving the pattern once, cleanly, before touching working code. A retrofit
proposal for existing endpoints should follow only after Products ships and the
pattern is validated in review.

## Handoff
1. `feature-planner` — confirm the `ProductRepository` interface in the Products
   feature plan matches the shape sketched here (it already does — see
   `.claude/templates/feature-proposal.md`'s filled example).
2. `network-engineer` — implement `ProductRepository.mock.ts` first, then
   `ProductRepository.live.ts` and `index.ts`.
3. `reviewer` — verify no screen or hook imports `client`/axios directly, per the
   Risks section above.
```

---

## Checklist

- [ ] Requirements restated in the requester's own terms, no embellishment
- [ ] Both functional and non-functional goals present
- [ ] Constraints reference real project facts (files, deps, stated principles), not generic boilerplate
- [ ] Assumptions are explicit, not implied
- [ ] Exactly one Proposed Architecture (not several options presented as equal)
- [ ] At least two real Alternatives with named rejection reasons
- [ ] Trade-offs and Risks are both non-empty
- [ ] Recommendation ties back to `constitution.md` Core Values ordering
- [ ] Handoff names a specific next agent

## References

- `.claude/agents/00-chief-architect.md` — § 5 (Operating Principles), § 6 (Communication Protocol), § 8 (Architectural Decision Process)
- `.claude/constitution.md` — Backend Independence, Mock First Development, Separation of Concerns, Technical Debt, Core Values
- `.claude/context.md` — Architecture Principles, Mock API Strategy
- `.claude/templates/adr.md` — for recording the resulting decision permanently
- `.claude/templates/repository.md` — for the per-repository contract detail once this pattern is approved
