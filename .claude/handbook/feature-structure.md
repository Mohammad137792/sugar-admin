---
id: handbook-feature-structure
title: Feature Structure Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Feature Structure Handbook

> "Each feature owns: components, hooks, repository, services, state, types, constants, tests." — constitution.md, Feature Ownership

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The Target Shape
5. The Current Shape
6. Worked Example: Restructuring the Content Feature
7. Good Examples
8. Bad Examples
9. Decision Trees
10. Real Project Examples
11. Common Mistakes
12. Best Practices
13. Checklist
14. FAQ
15. References

---

# 1. Purpose

This handbook defines what belongs inside one `src/features/<name>/` folder, at the target maturity level, and shows exactly how far the current seven feature folders are from that target.

It complements `architecture.md` (whole-system view) and `folder-structure.md` (whole-repo view) by zooming into a single feature's internal organization.

---

# 2. Scope

In scope: the internal folder shape of one feature module, the responsibility of each subfolder, and a full worked restructuring of the `content` feature from its current one-file state to the target shape.

Out of scope: which top-level folder a feature lives under (`folder-structure.md`), the repository interface's method signatures (`repository-pattern.md`), and cross-feature navigation wiring (`navigation.md`).

---

# 3. Principles

Grounded in:

- **Feature Ownership** (constitution.md) — each feature owns components, hooks, repository, services, state, types, constants, tests. Cross-feature imports happen through public APIs only.
- **Single Responsibility** (constitution.md) — every file should have one reason to change; every component should have one responsibility; every hook should solve one problem; every repository should represent one domain.
- **Predictability** (constitution.md) — developers should be able to predict where new code belongs.
- **Folder Philosophy** (context.md) — shared code exists only when it is genuinely reusable.

---

# 4. The Target Shape

```
src/features/<feature>/
  screens/          # top-level routed screens for this feature
  components/       # feature-owned presentational components, not shared app-wide
  hooks/             # feature-owned hooks (wrap repository + TanStack Query)
  repository/        # interface + mock impl + real impl + factory (see repository-pattern.md)
  services/          # business logic that isn't rendering and isn't a repository call
  state/              # feature-scoped Zustand store or Context, only if justified
  types/               # feature-local TypeScript types not shared elsewhere
  constants/            # feature-local constants (labels, limits, enums)
  tests/                 # unit + component tests for everything above
  index.ts                # the feature's public API — what other features may import
```

Each subfolder is created only when it has content. An empty `services/` folder is not scaffolded speculatively — see constitution's Simplicity Wins ("avoid unnecessary configuration").

The `index.ts` public API is what makes "cross-feature imports happen through public APIs only" (constitution.md) enforceable: another feature imports `from "../products"`, never `from "../products/repository/MockProductRepository"`.

---

# 5. The Current Shape

Every existing feature folder looks like this:

```
src/features/auth/
  screens/
    LoginScreen.tsx
```

```
src/features/content/
  screens/
    ContentScreen.tsx
```

That's it — `screens/` only, one file, no `index.ts`, no `hooks/`, no `repository/`, no `state/`, no `tests/`. This is true of all seven current folders: `auth`, `dashboard`, `content`, `reports`, `ai-chat`.

This is not a failure — it is exactly what an early Foundation-phase codebase should look like (`context.md` § "Current Development Phase": Foundation, Early Development). The gap is worth naming precisely so it is closed deliberately, feature by feature, as each one gets real data behind it — not copied forward into five more features first.

---

# 6. Worked Example: Restructuring the Content Feature

**Before** (current, real, complete):

```
src/features/content/
  screens/
    ContentScreen.tsx     # "Coming soon..." placeholder, no data
```

```tsx
// src/features/content/screens/ContentScreen.tsx — current, real, complete file
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../../constants/colors";
import { useLanguage } from "../../../context/LanguageContext";

export default function ContentScreen() {
  const { isRTL } = useLanguage();
  return (
    <View style={styles.root}>
      <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "مدیریت محتوا" : "Content Management"}
      </Text>
      <Text style={[styles.sub, { textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "به زودی..." : "Coming soon..."}
      </Text>
    </View>
  );
}
```

**After** (target shape, once Content is built out against `src/api/endpoints/content.ts`'s data):

```
src/features/content/
  screens/
    ContentListScreen.tsx       # list + search + status filter
    ContentDetailScreen.tsx     # single item view/edit
  components/
    ContentListItem.tsx         # one row in the list
    ContentStatusBadge.tsx      # draft/published/archived badge
  hooks/
    useContentList.ts           # wraps contentRepository.list() in useQuery
    useContentItem.ts           # wraps contentRepository.get(id) in useQuery
    useUpdateContent.ts         # wraps contentRepository.update() in useMutation
  repository/
    ContentRepository.ts        # interface
    MockContentRepository.ts    # simulates latency/failure/pagination
    HttpContentRepository.ts    # wraps src/api/client.ts
    index.ts                    # factory
  types/
    content.ts                  # ContentItem, ContentStatus (or re-exported from src/types)
  constants/
    contentStatus.ts            # status label map, status color map
  tests/
    MockContentRepository.test.ts
    useContentList.test.ts
    ContentListItem.test.tsx
  index.ts                       # export { ContentListScreen, ContentDetailScreen }
```

Note what moved and what stayed: `ContentItem` and `PaginatedResponse<T>` in `src/types/index.ts` are already shared, cross-feature-safe types (also used by `reportsApi`-adjacent code) — they stay in `src/types/`, they do not get duplicated into `content/types/`. Only genuinely content-specific shapes (e.g. a `ContentFilterState` used only inside this feature's list screen) belong in `content/types/`.

`useContentList.ts` is new — it is the missing middle layer between the screen and the repository that § 7 of `repository-pattern.md` implies but doesn't show: a screen never calls `contentRepository.list()` directly, it calls `useContentList()`, which wraps the repository call in `useQuery` (see `state-management.md` § 4 for why server data belongs in TanStack Query, not component state).

---

# 7. Good Examples

**Good: a feature-owned component that stays inside its feature.**

`ContentStatusBadge.tsx` (target, § 6) reuses `src/components/ui/Badge.tsx` internally but adds content-specific status-to-variant mapping. It lives in `content/components/`, not `src/components/ui/`, because the mapping (`draft` → `warning`, `published` → `success`, `archived` → default) is content-specific domain knowledge, not a generic UI primitive. This is the shared-vs-feature-owned boundary from `folder-structure.md` § 6 applied correctly.

**Good: an `index.ts` that limits the public surface.**

```ts
// src/features/content/index.ts (target)
export { ContentListScreen } from "./screens/ContentListScreen";
export { ContentDetailScreen } from "./screens/ContentDetailScreen";
export type { ContentFilterState } from "./types/content";
```

Nothing about `MockContentRepository` or `useContentList` is exported — another feature that needs content data does so through a repository of its own, or through a documented cross-feature contract, never by reaching into `content/hooks/useContentList.ts` directly.

---

# 8. Bad Examples

**Bad: a "shared" folder that isn't.**

```
src/features/content/
  screens/
  shared/              # <- vague name, unclear scope, violates Naming Philosophy
    stuff.ts
```

`context.md` § "Naming Philosophy" explicitly lists `utils`, `helpers`, `manager` as names to avoid because they don't communicate intent — `shared/stuff.ts` fails the same test at the feature level.

**Bad: reaching into another feature's internals.**

```ts
// inside src/features/publishing/services/schedulePost.ts, hypothetical, bad
import { MockContentRepository } from "../../content/repository/MockContentRepository";
```

Publishing needing content data should go through `content`'s public `index.ts`, or — if the relationship is deep enough — the two features should agree on a shared type in `src/types/`, with `chief-architect` sign-off per `10-feature-planner.md` § 16's cross-feature decision tree.

---

# 9. Decision Trees

## Which subfolder does this file belong in?

```
Does it render UI?
  → Screen-level (routed)?  → screens/
  → Reusable within this feature only? → components/
Does it fetch or mutate data via a repository, wrapped for a screen?
  → hooks/
Does it define the data contract itself (interface + mock + real)?
  → repository/
Does it make a decision or run a workflow that isn't a render
and isn't a repository call?
  → services/
Does it hold state that must survive navigation within this feature?
  → state/ (feature-scoped store/Context — see state-management.md)
Is it a type used only inside this feature?
  → types/
Is it a constant (label map, limit, enum) used only inside this feature?
  → constants/
```

## Promote a feature-local component to `src/components/ui/`?

```
Is the component free of any feature-specific domain knowledge
(no "content status", no "product category" logic inside it)?
  → Yes: is it already needed by a second feature?
      → Yes: promote to src/components/ui/, add to ui/index.ts.
      → No: leave it feature-local until a second feature needs it —
        do not promote speculatively (Simplicity Wins).
  → No: it stays feature-local, permanently. Domain logic does not belong
    in the shared design system.
```

---

# 10. Real Project Examples

- **`src/features/auth/screens/LoginScreen.tsx`** — current shape. Already imports shared `Button`/`Input` from `src/components/ui` correctly, per the shared-vs-feature-owned boundary — it does not reinvent a form input.
- **`src/features/dashboard/screens/DashboardScreen.tsx`** — `MOCK_STATS` is currently hardcoded inside the screen file. In the target shape, this array is the seed data inside a future `MockReportsRepository`, not inline screen data — see `repository-pattern.md` § 4.
- **`src/components/ui/index.ts`** — the working example of a clean public-API barrel file (`export { default as Button } from "./Button"`, etc.) that every feature's future `index.ts` should mirror in spirit, scoped to that feature's exports.

---

# 11. Common Mistakes

- Creating all nine subfolders for a brand-new feature before any code needs them. Create `screens/` first; add `hooks/`, `repository/`, etc. only when the first real piece of logic needs a home.
- Putting a generic, reusable component inside a feature's `components/` folder just because it was written while building that feature. Check § 9's promotion tree before deciding.
- Skipping `index.ts` and letting other code import deep paths like `../../features/content/screens/ContentListScreen`. This defeats the entire purpose of feature ownership boundaries.
- Duplicating a type that's already in `src/types/index.ts` into a feature's `types/` folder "to be safe." Check `src/types/` first.

---

# 12. Best Practices

- Start every new feature with `screens/` and an `index.ts` that exports nothing but the screen(s). Add structure as real logic arrives.
- Name feature-local files the same way `10-feature-planner.md`'s repository standard names methods — after the domain concept, not the technical mechanism.
- When two features seem to need the same component, wait for the second real usage before promoting it to `src/components/ui/` — see § 9.
- Review a feature's `index.ts` in every PR that touches that feature; it is the fastest way to catch an accidental public-surface leak.

---

# 13. Checklist

- [ ] New feature folder starts minimal — only the subfolders it currently needs.
- [ ] Every subfolder used matches § 4's responsibility definition.
- [ ] `index.ts` exists and exports only what other code is meant to consume.
- [ ] No feature reaches into another feature's non-exported files.
- [ ] Feature-local types/constants checked against `src/types/index.ts` for duplication first.

---

# 14. FAQ

**Does `HomeScreen.tsx` count as a feature?**

No.

It lives in `src/screens/`, outside `src/features/`, and is a known legacy exception — see `folder-structure.md` § 5.

**Should `dashboard` and `reports` be merged, since context.md lists "Analytics" as one feature?**

That is a `chief-architect` decision, not a default assumption — flagged in `architecture.md` § 7, not resolved here.

**Can a feature have zero `components/`?**

Yes, if every screen only uses `src/components/ui/` primitives directly. Don't create an empty folder to look complete.

**What goes in `tests/` versus co-located `*.test.ts` files next to the source?**

Either convention is acceptable once a test framework is chosen (see `testing-strategy.md`) — this handbook shows `tests/` for clarity, but co-location is equally valid; pick one convention project-wide and apply it consistently across all nine features.

---

# 14.5 Feature Maturity Levels

Not every feature needs the full § 4 shape immediately. Use these levels to communicate, in review, how far along a feature is expected to be:

**Level 0 — Placeholder.** One screen. No data. "Coming soon" text. This is every feature except `auth` and `dashboard` today: `content`, `reports`, `ai-chat`.

Acceptable only as a temporary navigation destination while the feature is planned.

**Level 1 — Static mock data.** Screen renders hardcoded data inline, like `dashboard`'s `MOCK_STATS` today.

Acceptable for a demo. Not acceptable to ship past a sprint or two — the hardcoded data should move behind a repository before the feature is called "done."

**Level 2 — Mock repository, no real backend.** Full § 4 shape, `repository/` folder present, `MockFeatureRepository` feature-complete per `mock-api.md`, no `Http*Repository` yet.

This is the target steady-state for every feature until a real backend exists. Per constitution's Definition of Done: "Mock implementation exists. Future backend integration is possible." A Level 2 feature already satisfies both.

**Level 3 — Real backend wired.** `Http*Repository` implemented and selected by the factory once a backend is available. UI code is unchanged from Level 2 — that is the test that Backend Independence actually worked.

Every feature plan produced by `10-feature-planner.md` should state which level it targets for its first shipped version. Defaulting to Level 2 is correct for Sugar Admin's current phase; shipping at Level 0 or 1 and calling it "done" violates the constitution's Definition of Done.

---

# 14.6 What "Tests" Means Per Subfolder

Since `testing-strategy.md` documents that no test framework is installed yet, this section describes what each subfolder's tests *will* cover once one is chosen — so feature authors design testable seams now, without waiting for tooling.

`repository/` — the highest-value tests in the whole feature. `MockFeatureRepository` should be tested for its simulated failure rate, pagination boundaries, and empty-state shape, independent of any React rendering.

`hooks/` — tested against the mock repository, verifying loading/error/success states are surfaced correctly, not verifying UI markup.

`services/` — pure business-logic tests, no rendering, no network, since these functions should not depend on either.

`components/` — rendering/interaction tests once a component testing library is chosen.

`screens/` — the lowest priority for unit testing; these are thin composition layers if `hooks/` and `components/` are properly separated, and are better covered by manual QA or integration-style tests than heavy unit coverage.

---

# 15. References

- [constitution.md](../constitution.md) — Feature Ownership, Single Responsibility, Predictability.
- [context.md](../context.md) — Folder Philosophy, Naming Philosophy.
- [10-feature-planner.md](../agents/10-feature-planner.md) — § 4 Feature Decomposition.
- [architecture.md](./architecture.md) — whole-system layering this handbook zooms into.
- [folder-structure.md](./folder-structure.md) — whole-repo top-level layout.
- [repository-pattern.md](./repository-pattern.md) — full detail on the `repository/` subfolder.
- [state-management.md](./state-management.md) — full detail on the `state/` subfolder.
