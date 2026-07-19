---
id: adr-0005-react-navigation-over-expo-router
title: React Navigation Is Implemented Instead of Expo Router
category: decision
status: Needs Reconciliation
date: 2026-07-18
deciders: Engineering
---

# ADR-0005: React Navigation Is Implemented Instead of Expo Router

## Status

**Needs Reconciliation.** This ADR documents a real, verified discrepancy between `context.md`'s stated Technology Stack and the actual implemented codebase. It does **not** resolve the discrepancy — per `.claude/agents/00-chief-architect.md`'s Principle 5 ("prefer explicit boundaries; hidden coupling eventually becomes technical debt," applied here to documentation-vs-reality coupling) and `60-documentation-engineer.md`'s § 9 mandate, this exact drift must be surfaced explicitly and routed to a real decision, not silently normalized in either direction — neither by quietly rewriting `context.md` to match the code, nor by migrating the code to match `context.md`, without that being a deliberate, reviewed choice.

## Context

`context.md`'s Technology Stack section, under Navigation, states: "Expo Router." That is the entire content of that subsection — a specific, falsifiable claim about which library the project uses for navigation.

The actual codebase, verified directly, does not use Expo Router:

- There is no `app/` directory anywhere in the repository (Expo Router's routing mechanism is file-based, rooted at `app/` by convention — its absence is a direct, checkable signal).
- `package.json` has no `expo-router` dependency. It does list `@react-navigation/native` (7.3.1) and `@react-navigation/native-stack` (7.17.3).
- `App.tsx` (read in full) imports and renders `NavigationContainer` from `@react-navigation/native` and a hand-written `AppNavigator` from `src/navigation/AppNavigator.tsx`:

  ```tsx
  // App.tsx — current, real, relevant excerpt
  import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
  import AppNavigator from "./src/navigation/AppNavigator";
  // ...
  <NavigationContainer theme={navTheme}>
    <AppNavigator />
  </NavigationContainer>
  ```

- `src/navigation/AppNavigator.tsx` and `src/navigation/AuthNavigator.tsx` (both read in full) each call `createNativeStackNavigator<...>()` imperatively and register screens one at a time with explicit `<Stack.Screen name="..." component={...} />` entries:

  ```tsx
  // src/navigation/AppNavigator.tsx — current, real, entire screen registration
  const Stack = createNativeStackNavigator<AppStackParamList>();
  export default function AppNavigator() {
    return (
      <Stack.Navigator /* ... */>
        <Stack.Screen name="Home"      component={HomeScreen}      options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "داشبورد" }} />
        <Stack.Screen name="Content"   component={ContentScreen}   options={{ title: "مدیریت محتوا" }} />
        <Stack.Screen name="Reports"   component={ReportsScreen}   options={{ title: "گزارش‌ها" }} />
        <Stack.Screen name="AIChat"    component={AIChatScreen}    options={{ title: "دستیار هوشمند" }} />
      </Stack.Navigator>
    );
  }
  ```

- `src/navigation/types.ts` (read in full) hand-maintains three param lists — `AuthStackParamList` (`Login`, `Register`), `AppStackParamList` (`Home`, `Dashboard`, `Content`, `Reports`, `AIChat`), `RootStackParamList` (`Auth`, `App`) — with `PascalCase` route names and explicit `undefined` for paramless routes, exactly the shape `10-feature-planner.md` § 12 documents as the existing convention to match.

This is a real, load-bearing discrepancy, not a typo: Expo Router and React Navigation are architecturally different approaches (file-based, convention-driven routing vs. imperative, explicitly-registered routing) with different implications for every future screen and navigation entry added to the app. `10-feature-planner.md` § 12 already builds its Navigation Entry Standard around the React Navigation shape (`types.ts`, param lists, `PascalCase` route names) actually in the codebase, not around Expo Router — meaning the planning workspace has already, implicitly, chosen a side of this discrepancy without it ever being formally decided or reflected back into `context.md`.

## Decision

**No decision is made here.** This ADR intentionally stops short of resolving the discrepancy, consistent with its `Needs Reconciliation` status and with this project's ADR template Instructions, which require an ADR documenting an after-the-fact discrepancy to "say so honestly in Status" rather than backdate a resolution that never happened through real review.

What this ADR does establish, as an interim operating rule, is: **until a real `chief-architect`-led (and, given the scope, likely human-involved) decision is made, all new navigation work continues to follow the existing, working React Navigation convention** in `src/navigation/types.ts` — `PascalCase` route names, explicit `undefined` for paramless routes, one param list per stack, screens registered via `<Stack.Screen>` — rather than introducing a second, competing routing approach (e.g. starting an `app/` directory alongside the existing `src/navigation/` setup) speculatively. This interim rule exists to prevent the discrepancy from compounding into two half-implemented routing systems while the real decision is still pending.

## Consequences

**Positive (of the interim "keep using React Navigation" rule, not of the discrepancy itself):**
- Zero migration risk today — the existing, working navigation setup (`AuthNavigator.tsx`, `AppNavigator.tsx`, `types.ts`) is untouched and continues to function exactly as it does now.
- Route and param typing stays fully explicit and centralized in one file (`types.ts`), which `constitution.md`'s Explicit Beats Implicit principle favors — file-based routing trades some of that explicitness for directory-structure convention, which is a real trade-off, not a strict improvement, so there is no urgency to "fix" this in either direction without weighing that trade-off deliberately.
- `10-feature-planner.md` § 12's Navigation Entry Standard remains usable as-is for all current and near-term feature planning (e.g. `.claude/docs/examples/products-feature-plan.md`'s three new routes), since it is already built around the React Navigation shape actually in the codebase.

**Negative / accepted debt:**
- `context.md` actively misleads a new engineer or a new AI agent reading only the Technology Stack section — they will expect Expo Router and be confused by `src/navigation/`'s imperative structure. This is a live documentation defect, not a hypothetical risk, and it is the single clearest instance in this project of the exact failure mode `60-documentation-engineer.md` exists to catch ("a document making a specific, falsifiable claim about the codebase that the codebase itself contradicts"). Follow-up: `60-documentation-engineer` should raise this to `chief-architect` for an actual decision (adopt React Navigation formally and correct `context.md`, or plan a real migration to Expo Router) rather than leaving it open indefinitely; this ADR's existence is that escalation being made explicit and permanent, not a substitute for the decision itself.
- Every new screen requires manually adding a `<Stack.Screen>` entry and a `types.ts` param list entry — ongoing, real, per-screen cost that Expo Router's file-based auto-registration would remove. This cost is being paid today regardless of which way the eventual decision goes, since it is required to keep the app functioning either way until a migration (if any) actually happens.
- Because no decision has been made, this discrepancy is at risk of silently resolving itself by default — every additional screen built against `src/navigation/types.ts`'s pattern increases the practical cost of ever migrating to Expo Router later, without that cost ever having been weighed against the benefit in an actual review. Flagging this explicitly, now, in this ADR is intended to prevent that default-by-inertia outcome from being mistaken for a considered decision.

## Alternatives Considered

- **Migrate to Expo Router now, to make the code match `context.md`** — not adopted here (this ADR does not decide either way, but records why immediate migration was not simply assumed as the obvious answer): it would require restructuring `src/navigation/` and every feature's `screens/` folder around file-based routing, with no product requirement currently driving the change, and no `architecture-proposal.md` cycle has evaluated its cost against its benefit. `constitution.md`'s Simplicity Wins and avoiding unnecessary churn argue against an unreviewed migration of currently-working navigation code.
- **Silently update `context.md` to say "React Navigation" and close the discrepancy without further review** — rejected as the resolution path for this ADR specifically, because it would treat an undecided, unreviewed drift as though it had been deliberately ratified, which `.claude/rules/documentation.md`'s drift-resolution principle (referenced by `60-documentation-engineer.md`) does not permit: the code winning as the description of current reality does not mean the target-state question ("should we actually migrate to Expo Router eventually?") gets silently closed too.
- **Leave both `context.md` and the code unchanged, and do not write this ADR** — rejected. This is the status quo prior to this document, and it leaves a known, verified documentation/reality mismatch completely unrecorded, which `constitution.md`'s Documentation section directly prohibits: "if future developers must guess why something exists, documentation is missing."

## Sign-off

**Not yet reviewed for a final resolution.** This ADR itself (documenting the discrepancy honestly and setting the interim operating rule) reflects Engineering's assessment of current codebase reality, verified directly against `App.tsx`, `src/navigation/AppNavigator.tsx`, `src/navigation/AuthNavigator.tsx`, `src/navigation/types.ts`, and `package.json`. The actual resolution — formally adopt React Navigation and correct `context.md`, or plan and schedule a migration to Expo Router — requires `00-chief-architect` review and, given the scope of either outcome, should go through a full `.claude/templates/architecture-proposal.md` cycle with human sign-off before a superseding ADR is written and this one's status is updated away from `Needs Reconciliation`.

## Related Decisions

- **ADR-0001 (Feature-First Architecture)** — if a future decision does move Sugar Admin to Expo Router, it would interact directly with ADR-0001's `src/features/<feature>/screens/` convention, since Expo Router's file-based routing typically expects screens rooted under a top-level `app/` directory rather than nested inside each feature folder — that interaction has not been analyzed and is exactly the kind of scope a real `architecture-proposal.md` cycle would need to work through, not a detail to decide incidentally as part of this ADR.
- `.claude/docs/examples/products-feature-plan.md`'s Navigation section explicitly follows this ADR's interim rule (React Navigation's existing `AppStackParamList` convention) for its three new routes, and states so directly — it does not wait for this ADR's reconciliation to be resolved, since blocking all feature work on an unresolved navigation-library decision would itself violate `constitution.md`'s Simplicity Wins by turning an open question into a project-wide stall.
- This is the only ADR in this index carrying `Needs Reconciliation` status. Any other document-vs-code discrepancy discovered in the future (per `.claude/agents/60-documentation-engineer.md`'s drift-detection duty) should be written up the same way — an honest ADR stating the discrepancy and an interim rule, rather than either document silently overriding the other.

## References

- `.claude/context.md` — Technology Stack (Navigation: Expo Router)
- `App.tsx`, `src/navigation/AppNavigator.tsx`, `src/navigation/AuthNavigator.tsx`, `src/navigation/types.ts` — the real, current React Navigation implementation this ADR documents
- `.claude/constitution.md` — Documentation, Explicit Beats Implicit
- `.claude/agents/00-chief-architect.md` — Principle 5 (Prefer explicit boundaries)
- `.claude/agents/10-feature-planner.md` — § 12 (Navigation Entry Standard, already built around the React Navigation shape)
- `.claude/agents/60-documentation-engineer.md` — § 9 (Canonical Case Study — The Expo Router / React Navigation Drift), the role that owns following up on this ADR
- `.claude/templates/adr.md` — Filled Example section, which independently worked through this same discrepancy as the template's own worked example
- `.claude/knowledge/architecture-decisions.md` — § 8 (ADR-0005 summary), § 10 (Decision Status Summary Table)
