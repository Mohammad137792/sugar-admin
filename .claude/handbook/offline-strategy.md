---
id: handbook-offline-strategy
title: Offline Strategy Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Offline Strategy Handbook

> "Mobile First... every feature must consider... offline scenarios... before implementation." — constitution.md, Mobile First

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. Current Reality: No Offline Persistence
5. What "Offline" Currently Means in the UI
6. Target Strategy
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

Sugar Admin is a mobile app for people running businesses on unreliable connections — a home baker updating a product list from their kitchen, a shop owner replying to customers on a train. The constitution names offline scenarios as a mandatory Mobile First consideration. This handbook states plainly where the app stands today (nowhere, offline-wise) and what "offline-first" will require once the storage layer exists.

---

# 2. Scope

In scope: the current absence of any persistence layer, what `staleTime` does and does not provide, and the target MMKV + persisted-query-cache strategy.

Out of scope: general performance tuning of TanStack Query (`performance.md`), token storage security trade-offs (`security.md`), and the mock repository's simulated latency (`mock-api.md`).

---

# 3. Principles

Grounded in:

- **Mobile First** (constitution.md) — every feature must consider network interruptions and offline scenarios before implementation.
- **Error Philosophy** (constitution.md) — every feature must define an Offline state before implementation begins, alongside Loading/Empty/Error/Success/Retry/Timeout/Unauthorized.
- **Offline-aware design** (context.md § "Architecture Principles") — listed explicitly as one of the project's architecture principles.
- **Replaceability** (constitution.md) — storage (MMKV → SecureStore → SQLite) should be isolated and swappable.

---

# 4. Current Reality: No Offline Persistence

Say this plainly, because it is easy to assume otherwise from `context.md`'s target stack list: **Sugar Admin has zero offline persistence today.** Confirmed by what is and isn't in `package.json` and `src/`:

- No `react-native-mmkv` dependency. `context.md` lists MMKV as target storage; it is not installed.
- No `AsyncStorage` either — no persistence library of any kind is a dependency.
- `QueryClient` in `App.tsx` is configured with `retry: 2` and `staleTime: 1000 * 60 * 5`, but **no persister**. TanStack Query's in-memory cache is lost the instant the app process is killed. There is no `persistQueryClient` call, no `PersistQueryClientProvider`, nothing.
- `authStore`'s token lives in `(globalThis as any).__authToken` (see `state-management.md` § 7) — pure runtime memory, gone on restart.
- No SQLite, no file-based caching of any API response, no image cache configuration beyond whatever `Image`'s platform default provides.

If a user opens the app, browses `Dashboard`, force-quits it, and reopens it, every piece of client state resets to its initial value — including being logged out (though, per `navigation.md` § 6, that particular consequence is currently masked by the fact that the login gate isn't wired up at all).

---

# 5. What "Offline" Currently Means in the UI

Because there is no persistence, "offline" today means exactly one thing across the whole app: **any network request fails, and no feature currently renders a distinct Offline state for that failure.**

Grep confirms no screen checks `NetInfo` or any connectivity signal — there is no `@react-native-community/netinfo` dependency either. A request made with no connectivity fails the same way a request made against a broken backend fails: axios rejects, and today, nothing in `DashboardScreen.tsx`, `ContentScreen.tsx`, or `ReportsScreen.tsx` even attempts to catch that rejection, because none of them make a network call yet (`MOCK_STATS` is hardcoded, see `state-management.md` § 6). The one screen that does make a network call, `LoginScreen.tsx`, doesn't call `authStore.login()` at all — its `Button`'s `onPress={() => {}}` is a no-op (confirmed by reading the file). So today, there is no code path in the running app that would currently exercise an offline failure at all.

This is worth stating precisely because it means the Offline state is not "handled poorly" — it is **unimplemented**, for every feature, without exception. The constitution's Error Philosophy requires every feature to define Loading/Empty/Error/Success/Retry/Offline/Timeout/Unauthorized states before implementation begins. No feature in this repo has done so yet. This is acceptable for Level 0/1 placeholder features (`feature-structure.md` § 14.5) and must be closed before any feature reaches Level 2.

---

# 6. Target Strategy

Once MMKV (or an equivalent) is added, three layers of offline behavior become possible, and should be built in this order:

**Layer 1 — Persisted auth.** The token currently held in `globalThis` moves to MMKV (encrypted, see `security.md` § 4), so a restart doesn't force re-login. This is the smallest, highest-value first step and should land alongside the `RootNavigator` fix in `navigation.md` § 6, since re-login-on-every-restart is currently a masked consequence of the *other* bug (no auth gate at all).

**Layer 2 — Persisted query cache.** TanStack Query supports a `persister` (e.g. `@tanstack/query-sync-storage-persister` backed by MMKV) via `persistQueryClient`. Once wired, the existing `staleTime: 5min` config means: within five minutes of last fetch, cached data renders instantly with no network call, persisted or not. Beyond five minutes but still offline, a persister lets the last-known-good data still render (marked stale) instead of an empty/error screen, while a background refetch is attempted and silently fails if there's still no connection.

```ts
// App.tsx (target, once @tanstack/query-sync-storage-persister + MMKV are added)
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { storage } from "./src/config/storage"; // MMKV wrapper, target

const persister = createSyncStoragePersister({
  storage: { getItem: storage.getString, setItem: storage.set, removeItem: storage.delete },
});

persistQueryClient({ queryClient, persister, maxAge: 1000 * 60 * 60 * 24 }); // 24h
```

**Layer 3 — Explicit Offline UI states.** Once Layers 1–2 exist, every feature's screen spec (per `10-feature-planner.md` § 9) must define what "Offline" renders: typically, cached data with a persistent banner ("You're offline — showing saved data") rather than a blocking error screen, plus disabling mutation actions (create/update/delete) that can't be queued, unless a write-queue (Layer 4, below) exists.

**Layer 4 — Write queueing (later, feature-driven).** For actions like "reply to a customer" or "publish a post" taken while offline, a durable queue (persisted, retried on reconnect) is needed before those specific features can be considered offline-capable. This is out of scope for the app-wide offline strategy and should be designed per-feature when Publishing and Chat Center are planned, referencing `10-feature-planner.md` § 13's Device edge case catalog ("app backgrounded mid-operation," "low connectivity").

---

# 7. Good Examples

**Good: `staleTime` already set with offline-adjacent intent**, even though no persister exists yet — `App.tsx`'s `staleTime: 1000 * 60 * 5` reduces refetch frequency, which is a performance choice today but becomes part of the offline story once persistence is added (see `performance.md` § 5 for the performance-only framing).

---

# 8. Bad Examples

**Bad: building a feature's "Offline" state as an afterthought copy-paste of "Error."**

```tsx
// bad — offline and generic-error rendered identically, no distinct messaging
{status === "error" && <Text>Something went wrong.</Text>}
```

Constitution's Error Philosophy lists Offline as a distinct state from Error for a reason — a generic backend 500 and "you have no signal" call for different messaging and different retry affordances (auto-retry-on-reconnect vs. manual retry button).

**Bad: assuming MMKV exists because `context.md` lists it.**

```ts
// bad — will fail to resolve, MMKV is not installed
import { MMKV } from "react-native-mmkv";
```

Verify against `package.json`, not against the target-stack list in `context.md`, before importing any storage library.

---

# 9. Decision Trees

## Does this feature need offline handling before it ships?

```
Does the feature only display data the user can also see refreshed
moments later with no harm (e.g. read-only stats)?
  → Minimum bar: a distinct Offline empty/error state, no queueing needed.
Does the feature involve a write (create/update/delete/send) that the
user would be upset to silently lose?
  → Needs either: disable the action while offline with clear messaging,
    or a write-queue (Layer 4) — do not let it fail silently.
```

## Where should a new persisted value live once MMKV is added?

```
Is it server-owned data (fetched via a repository)?
  → TanStack Query persisted cache (Layer 2).
Is it a credential or token?
  → MMKV, encrypted mode — see security.md § 4.
Is it a user preference (theme, language) that should survive restart?
  → MMKV, plain mode, read into ThemeContext/LanguageContext at startup
    instead of always defaulting to system/fa on every launch (today's
    actual behavior — see § 4).
```

---

# 10. Real Project Examples

- **`App.tsx`** — `QueryClient` config, the one piece of infrastructure already offline-adjacent (`staleTime`), with no persister yet.
- **`src/context/ThemeContext.tsx`** / **`LanguageContext.tsx`** — both default from system state (`useColorScheme()`) or a hardcoded default (`useState<Lang>("fa")`) on every app launch, because there is no persistence to read a prior user choice from. A user who toggles to English via `HomeScreen.tsx`'s `langToggle` pill loses that choice on next launch.
- **`src/store/authStore.ts`** — the token loss on restart discussed in § 4 and `state-management.md` § 7.

---

# 11. Common Mistakes

- Writing a feature's "Offline" state to look identical to its "Error" state, losing the distinct messaging constitution's Error Philosophy calls for.
- Adding an MMKV import speculatively "because it's in context.md." It isn't installed; adding the dependency is an infrastructure decision for `chief-architect`, not a per-feature call.
- Building a write-queue inside one feature's `services/` folder without checking whether a shared queueing mechanism should exist first — this is exactly the kind of cross-feature concern that needs `chief-architect` sign-off before being built once, ad hoc, inside Publishing or Chat Center.
- Assuming `staleTime: 5min` provides offline resilience today. It reduces refetch frequency for a *running, connected* app; it provides zero benefit after a process restart, since nothing persists.

---

# 12. Best Practices

- Design every new feature's screen spec with an explicit Offline state description, even while MMKV doesn't exist yet — the design work is valid now, the wiring lands later.
- When MMKV is eventually added, land Layer 1 (auth persistence) and Layer 2 (query cache persistence) as two separate, reviewable PRs, not one large "add offline support" change.
- Treat "the mock repository has 150–800ms latency" (`mock-api.md`) as a reason to build good Loading states now — that discipline transfers directly to building good Offline states later.
- Never let a mutation (create/update/delete/send) fail silently offline. Disable it with a clear reason, or queue it — never pretend it succeeded.

---

# 13. Checklist

- [ ] Feature's screen spec defines a distinct Offline state, not a copy of Error.
- [ ] No MMKV/AsyncStorage/NetInfo import added without confirming it's actually installed in `package.json`.
- [ ] Any write action has an explicit offline behavior: disabled, queued, or clearly rejected — never silent.
- [ ] Persistence additions (auth, query cache, preferences) reviewed as infrastructure changes, not folded into unrelated feature PRs.

---

# 14. FAQ

**Is there any offline detection today?**

No `NetInfo` or equivalent connectivity check exists anywhere in the codebase.

**Does `retry: 2` help with offline requests?**

It retries failed requests twice, which can help with transient blips, but provides no benefit against a sustained offline period — the third attempt fails the same way the first did, and the query simply reports an error with no cached fallback to show, since nothing is persisted.

**Will offline support block Publishing and Chat Center from shipping?**

Those two features specifically depend on Layer 4 (write queueing) more than any other planned feature, since replying to a customer or publishing a post are exactly the writes users are most likely to attempt while their connection is unreliable. Plan offline behavior explicitly when those features are scoped, not as a follow-up.

---

# 15. References

- [constitution.md](../constitution.md) — Mobile First, Error Philosophy.
- [context.md](../context.md) — Technology Stack (Storage: MMKV, target), Architecture Principles (offline-aware design).
- [10-feature-planner.md](../agents/10-feature-planner.md) — § 13 Device edge cases.
- [state-management.md](./state-management.md) — § 7, the token-restart-loss this handbook's Layer 1 fixes.
- [performance.md](./performance.md) — § 5, `staleTime`/`retry` tuning from the performance angle.
- [security.md](./security.md) — § 4, encrypted vs. plain MMKV storage.
