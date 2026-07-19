---
id: command-generate-feature
title: Generate Feature
category: command
version: 1.0.0
status: active
invokes_agent: feature-planner
last_updated: 2026-07-18
---

# Command: Generate Feature

> Turn a product request into a complete, implementable feature plan, then
> hand it to the engineering agents who build screens, state, and data access
> against it. Mirrors `10-feature-planner.md` § 8's Feature Planning SOP.

---

## Purpose

Sugar Admin's Constitution requires architecture before implementation
("Never write code until the architecture is approved"). `generate-feature`
is the command that produces that architecture at feature scope: screens,
repository contracts, state shape, navigation entries, and edge cases — all
before `react-native-engineer`, `ui-engineer`, `state-engineer`, or
`network-engineer` writes a single line of implementation code.

This command exists so no engineer ever has to guess what to build. If a
question would still need to be asked after this command completes, the plan
it produced is incomplete.

---

## When To Invoke

- A new feature from `context.md`'s Primary Features list needs to be built
  (e.g. Products, AI Images, Publishing, Customer Management, Chat Center
  beyond the current `ai-chat` skeleton, Analytics beyond `reports`).
- An existing feature module needs a substantial new capability that changes
  its screens, repository contract, or state shape (not a bug fix — bug fixes
  don't need a new plan).
- A human product owner or `chief-architect` hands down an approved
  architectural direction that has not yet been decomposed into a concrete
  plan.

Do not invoke this command for:
- Small UI tweaks to an existing screen (no plan needed).
- Anything where module boundaries are not yet settled — that is
  `chief-architect`'s call first, via the Architectural Decision Process in
  `00-chief-architect.md` § 8.

---

## Required Inputs

The invoker must supply:

1. **Feature name or request** — plain description of what the feature should
   let a user do (e.g. "Sellers need to create, edit, archive, and search
   Products with categories, inventory counts, and photos" — directly from
   `context.md`'s Products bullet list).
2. **Target module** — an existing `src/features/*` module to extend, or
   confirmation that this is a new module (the command will check for
   overlap with the five existing modules: `ai-chat`, `auth`, `content`,
   `dashboard`, `reports`).
3. **Any explicit product constraints** — pagination behavior, required
   platforms (Instagram/Telegram/Bale/Rubika/Eita) if publishing-adjacent,
   whether AI is involved.
4. **Prior architectural decisions**, if any exist (an ADR under
   `.claude/docs/decisions/`, or a direct ruling from `chief-architect`) that
   bound this feature's shape.

If any of the above is missing and cannot be inferred from `context.md` or
existing ADRs, the procedure below stops at Step 1 and returns an escalation
instead of a plan — per `10-feature-planner.md`'s rule against inventing
product requirements.

---

## Procedure

Follow `10-feature-planner.md` § 8 Feature Planning SOP exactly, in order:

1. **Identify user intent.** State, in one sentence, what the user is trying
   to accomplish. Pull this directly from `context.md`'s Primary Features
   section — do not invent scope beyond what is listed there.

2. **Identify the owning module.** Check `src/features/` for an existing
   match. If none exists, propose a new module name (`snake-case` folder,
   e.g. `products`) and confirm — in the plan's Open Questions if unresolved,
   or directly if `chief-architect` has already approved it — that the name
   does not collide with or overlap an existing module's responsibility.

3. **Enumerate the minimum screen set.** Apply `10-feature-planner.md` § 9's
   Screen Specification Standard to each screen. Minimum, not maximum — do
   not add a screen "for completeness" that the request didn't ask for.

4. **Trace data dependencies per screen.** For each screen, name the exact
   repository method, store slice, or route param that supplies its data.
   No screen may depend on data whose source is undecided.

5. **Enumerate failure modes before the happy path is finalized.** Apply
   § 13's Edge Case Catalog. Mark every line "applies" or "does not apply"
   with a reason — silence is rejected per the Anti Patterns section.

6. **Classify every piece of state.** Apply § 11's State Shape Standard.
   Default to local or server-cache; promoting to a new global Zustand store
   requires explicit justification against the existing minimal footprint of
   `authStore` and `uiStore` (see `src/store/authStore.ts`,
   `src/store/uiStore.ts` for the current pattern to match).

7. **Define repository contracts.** Apply § 10's Repository Contract
   Standard. Every method needs input shape, success shape, named error
   cases, pagination behavior, and retry-safety — not "may throw." Flag
   explicitly that this is new-code-only discipline: existing
   `src/api/endpoints/*.ts` files call `client` (axios) directly with no
   repository interface, and that pattern is not to be extended to the new
   feature (see `.claude/docs/decisions/adr-0002-mock-first-development.md`
   for why).

8. **Define navigation entries.** Apply § 12's Navigation Entry Standard.
   Match the existing convention in `src/navigation/types.ts`: `PascalCase`
   route names, explicit `undefined` for paramless routes, correct
   `AuthStackParamList` vs `AppStackParamList` placement (or propose a new
   stack if the feature is large enough — confirm with `chief-architect`
   before doing so).

9. **Write acceptance criteria.** Every line must be independently
   verifiable by `reviewer` without reading the implementation — "works well"
   is rejected.

10. **Self-review against § 19's checklists** (both "before starting" and
    "before handing off") before producing final output. If any checklist
    item fails, fix the plan — do not hand off an incomplete plan and expect
    downstream agents to fill the gap silently.

11. **Save the plan.** Per `10-feature-planner.md` § 15, save to
    `.claude/docs/examples/<feature-name>-feature-plan.md` unless
    `chief-architect` has designated `src/features/<feature>/PLAN.md` as the
    project's settled convention.

12. **Hand off explicitly**, naming every downstream agent and the order they
    should engage, per § 22's Handoff Rules — e.g., `network-engineer` and
    `state-engineer` first for data-heavy features, `ui-engineer` first for
    presentation-heavy features with an already-understood data shape.

---

## Output Format

A single Markdown feature plan document following
`10-feature-planner.md` § 14's Communication Style structure:

```
## Feature Summary
## Scope
## Screens               (one § 9 Screen Specification per screen)
## Repository Contracts  (one § 10 Repository Contract per repository)
## State                 (one § 11 State Shape per piece of state)
## Navigation             (one § 12 Navigation Entry per route)
## Edge Cases             (completed § 13 catalog)
## Acceptance Criteria    (independently verifiable checklist)
## Open Questions         (should be empty at handoff)
## Handoff                (named agents, in order)
```

Saved as a standalone `.md` file — this is a deliverable, not a chat
response. See `.claude/docs/examples/products-feature-plan.md` for a complete
worked example at this exact standard.

---

## Example Invocation

> Generate a feature plan for Products, per `context.md`'s Products bullet
> list: Create, Update, Delete, Archive, Search, Categories, Inventory,
> Images. No existing `src/features/products` module exists. Target module:
> new `products` feature.

## Example Output

A plan document with, at minimum:
- Screens: `ProductListScreen`, `ProductDetailScreen`, `ProductFormScreen`
  (create/edit) — each with all six states.
- Repository: `ProductRepository` with `list`, `getById`, `create`, `update`,
  `archive`, `search`, plus category and inventory methods.
- State: `productFilters` (local, `ProductListScreen` only),
  `productDraft` (local, `ProductFormScreen` only) — explicitly not global,
  per § 11's default-to-local rule.
- Navigation: `App.ProductList`, `App.ProductDetail { productId: string }`,
  `App.ProductForm { productId?: string }` added to `AppStackParamList`.
- Edge Cases: full catalog completed, including "very large result set" (list
  pagination boundary) and "concurrent edits" (two sessions editing the same
  product).
- Handoff: `network-engineer` + `state-engineer` first (data-heavy feature),
  then `ui-engineer` and `react-native-engineer` in parallel.

The full worked version of this exact example lives at
`.claude/docs/examples/products-feature-plan.md` — use it as the reference
output shape for any future `generate-feature` invocation.

---

## Related Agents

- `feature-planner` — primary owner of this command.
- `chief-architect` — must have approved module boundaries before this
  command starts (§ 8 Step 2); escalate here if boundaries are undecided.
- `react-native-engineer`, `ui-engineer`, `state-engineer`, `network-engineer`,
  `ai-engineer` — downstream recipients of the plan this command produces.
- `reviewer` — uses the plan's acceptance criteria later, via
  `review-feature.md`.

---

## References

- `.claude/agents/10-feature-planner.md` — full standard, especially § 8, § 9,
  § 10, § 11, § 12, § 13, § 14, § 19.
- `.claude/agents/00-chief-architect.md` § 8 — Architectural Decision Process,
  must precede this command when module boundaries are unsettled.
- `.claude/context.md` — Primary Features section, source of truth for scope.
- `.claude/docs/examples/products-feature-plan.md` — worked example produced
  by this exact command.
- `.claude/templates/feature-proposal.md` — base template referenced by
  `10-feature-planner.md` § 15.
