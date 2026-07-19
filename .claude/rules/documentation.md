---
id: rule-documentation
title: Documentation Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_agents
  - all_features
  - all_documentation
last_updated: 2026-07-18
---

# Documentation Rules

> If future developers must guess why something exists, documentation is missing. — `../constitution.md`, Documentation

---

# Table of Contents

1. Purpose
2. Scope
3. Rules
4. Good Examples
5. Bad Examples
6. Checklist
7. References

---

# 1. Purpose

This file defines when a decision needs a written record (an ADR), when an inline comment is warranted, and how doc drift — documentation that no longer matches the code — is prevented. It uses a real, current example already present in this repository: `../context.md` lists Expo Router as the navigation target; the installed dependency and every navigator file use React Navigation instead. That gap is this file's canonical cautionary example, not a hypothetical.

---

# 2. Scope

Applies to inline code comments, ADRs, and the handbook documents themselves (`../constitution.md`, `../context.md`, `.claude/rules/*.md`, `.claude/agents/*.md`).

---

# 3. Rules

## Rule 1 — A decision needs an ADR when it is expensive to reverse, or when a future engineer would otherwise have to reconstruct the reasoning from the diff alone

Examples that meet this bar: choosing React Navigation over Expo Router (already an implicit decision, undocumented — retroactively worth an ADR); choosing Zustand + TanStack Query over a single state library; the `globalThis.__authToken` circular-import workaround in `src/api/client.ts` / `src/store/authStore.ts`; a future choice of real backend technology (REST vs. GraphQL vs. Supabase, per `../context.md`'s Backend Strategy).

**Why:** per the constitution — "every important engineering decision must be documented... if future developers must guess why something exists, documentation is missing." An ADR is the artifact that answers "why" permanently, independent of whoever made the decision still being on the team or remembering the conversation.

## Rule 2 — ADRs live in `docs/decisions/`, one file per decision, numbered sequentially

```
docs/decisions/0001-react-navigation-over-expo-router.md
docs/decisions/0002-globalthis-auth-token-bridge.md
```

Each ADR states: the decision, the date, the alternatives considered, why they were rejected, and the consequences (including known trade-offs still open). This mirrors the Chief Architect's Communication Protocol (`../agents/00-chief-architect.md` § 6: Requirements, Goals, Constraints, Assumptions, Proposed Architecture, Alternatives, Trade-offs, Risks, Recommendation) — an ADR is that protocol's output, persisted.

**Why a fixed location and numbering:** predictability (constitution's Predictability principle) — a contributor looking for "why does this project use React Navigation instead of what `../context.md` says" should have exactly one place to check, not have to search commit messages or ask around.

**Current gap:** `docs/decisions/` does not exist yet in this repository. The first ADR to write, when this rule is adopted, is the retroactive one explaining the React Navigation vs. Expo Router mismatch — it is the highest-value first entry precisely because the mismatch already exists and already causes confusion (see Rule 5).

## Rule 3 — Inline comments explain WHY, never WHAT; if the WHAT needs explaining, the code needs rewriting, not commenting

```ts
// Good — explains why, matches src/api/client.ts's existing style
// Token injected at runtime from authStore
const token = (globalThis as any).__authToken as string | undefined;

// Bad — explains what, which the code already says
// Get the token from globalThis
const token = (globalThis as any).__authToken as string | undefined;
```

**Why:** per the constitution — "if code requires explanation, improve the code before improving the comments." `src/api/client.ts`'s existing comments (`// Attach token on every request`, `// Trigger logout via event; avoids circular import with store`) both explain *why* a mechanism exists, not *what* the next line does — that's the bar for every new comment.

## Rule 4 — Non-obvious trade-offs get a comment at the point of use, not just in an ADR

The `globalThis.__authToken` bridge (see `imports.md` Rule 6) has both: an ADR-level record (once Rule 2's `docs/decisions/` exists) for the full reasoning, and an inline comment at each of the two or three sites that actually touch `globalThis` — because an engineer reading `client.ts` in isolation, six months from now, needs the local "why" without necessarily going and finding the ADR first.

**Why both:** an ADR alone is discoverable only if you know to look for it. An inline comment alone loses the full context (alternatives considered, why rejected) that justifies the trade-off. Together, the inline comment is the pointer; the ADR is the destination.

## Rule 5 — When a handbook document and the actual code disagree, the code wins, and the mismatch is corrected or explicitly flagged at the earliest opportunity, not silently worked around

`../context.md`'s Technology Stack section lists: Navigation → Expo Router, Storage → MMKV, Notifications → Expo Notifications, Images → Expo Image, Lists → FlashList. None of `expo-router`, `react-native-mmkv`, `expo-notifications`, `expo-image`, or `@shopify/flash-list` is in `package.json` today. These are target-state entries in a living document, not descriptions of the current build.

**Why this is the canonical example for this rule, not just a footnote:** an engineer who trusts `../context.md` literally and starts writing `app/products/[id].tsx` expecting Expo Router's file-based routing will produce code that silently does nothing, because no router is installed to interpret that file (see `react-native.md` Rule 1). This is exactly the failure mode doc drift causes — not a build error, a **silent** one, discovered late. Every rule file in `.claude/rules/` that references a target-vs-current gap (this one, `react-native.md`, `nativewind.md`, `state.md`, `expo.md`) exists partly to make these gaps impossible to miss by cross-referencing them from multiple angles.

**The fix, applied consistently across this handbook:** `../context.md` is not edited to silently match today's code (that would erase the target and make future planning harder), and code is not silently written to match `../context.md`'s aspirational stack (that produces broken code, per the example above). Instead, every rule file that touches an area with a target-vs-current gap states both explicitly, so no single document has to be fully trusted in isolation.

## Rule 6 — A `README.md` (root-level, currently absent) is not required for this repository's current phase; it becomes required once a second engineer joins or the app has a real backend to configure against

**Why not required yet, and why it will be:** per `../context.md`'s Success Criteria — "a new engineer can understand the project within one day" — today that's achieved via `.claude/constitution.md`, `.claude/context.md`, and this rules directory, which is a reasonable substitute for a README at single-engineer, Foundation-phase scale. Once onboarding a second engineer or setting up CI/EAS Build against real credentials becomes a real task, a root README covering environment setup (`.env` variables per `expo.md` Rule 5), `npm install`/`expo start` steps, and links into `.claude/` becomes necessary — track this as a known, deferred requirement, not an oversight to silently ignore.

## Rule 7 — Feature plans (per `../agents/10-feature-planner.md`) are the durable record of what a feature was supposed to do; keep them, don't delete them once implemented

Per `../agents/10-feature-planner.md` § 15, plans are saved to `.claude/docs/examples/<feature-name>-plan.md` (or `src/features/<feature>/PLAN.md`, location still owned by `chief-architect`). Once a feature ships, its plan is not deleted — it becomes the answer to "what was this feature originally scoped to do" for the review-process checklist (see `review-process.md`) and for any future engineer wondering whether a missing edge case was scoped out deliberately or simply missed.

**Why:** without the plan retained, a shipped feature's acceptance criteria (the constitution's Reviews section: "what changed, why, alternatives considered") exist only in a PR description, which is far more likely to be terse or to get lost across a squash-merge.

---

# 4. Good Examples

## Good: an inline comment explaining a non-obvious trade-off (existing, correct)

```ts
// src/api/client.ts
if (status === 401) {
  // Trigger logout via event; avoids circular import with store
  (globalThis as any).__onUnauthorized?.();
}
```

This is good because it explains *why* an indirect mechanism (`globalThis` + optional call) was chosen over the obvious direct alternative (`import { useAuthStore } from "../store"`), in one line, at the exact point of use.

---

# 5. Bad Examples

## Bad: trusting `../context.md`'s stack list without checking `package.json`

```tsx
// A new screen written assuming expo-image is available, because ../context.md lists it under "Images"
import { Image } from "expo-image";
```

**Consequence:** this import fails to resolve — `expo-image` is not installed. Time is lost discovering the target-vs-current gap the hard way instead of finding it stated plainly in `expo.md` Rule 4 or `performance.md`.

## Bad: a comment that restates the code

```ts
// increment count by 1
count += 1;
```

**Consequence:** zero information added; if `count += 1` later becomes `count += 2` for a real reason, this comment is now actively wrong and nobody is prompted to check it, because it looked too trivial to have ever mattered.

---

# 6. Checklist

- [ ] A decision that is expensive to reverse or non-obvious in hindsight has (or gets) an ADR in `docs/decisions/`.
- [ ] New inline comments explain WHY, not WHAT; if a comment explains WHAT, the code is rewritten to be self-explanatory instead.
- [ ] Any new `globalThis` bridge, non-obvious workaround, or accepted trade-off has an inline comment at its point of use.
- [ ] Before relying on a stack item from `../context.md`, `package.json` was checked to confirm it's actually installed.
- [ ] No handbook document was silently edited to hide a target-vs-current gap instead of stating it.
- [ ] A shipped feature's plan document (if one exists) was retained, not deleted.

---

# 7. References

- `../constitution.md` — Documentation, Technical Debt
- `../context.md` — Technology Stack, Success Criteria (the canonical doc-drift example this file uses)
- `react-native.md` § Rule 1 — the concrete consequence of the Expo Router / React Navigation mismatch
- `nativewind.md` — a second doc-drift example (fully configured, unused dependency)
- `imports.md` § Rule 6 — the `globalThis` bridge this file's ADR example is built around
- `review-process.md` — how documentation completeness is checked in review
- `../agents/00-chief-architect.md` § 6 — Communication Protocol an ADR should mirror
- `../agents/10-feature-planner.md` § 15 — feature plan document location and retention
