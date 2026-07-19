---
id: handbook-error-handling
title: Error Handling Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Error Handling Handbook

> "Errors are expected. Every feature must define: Loading. Empty. Error. Success. Retry. Offline. Timeout. Unauthorized. States before implementation begins." — constitution.md, Error Philosophy

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The Eight States, Applied to a Real Screen
5. `authStore.ts`'s try/catch/finally, Read Closely
6. The 401-Triggers-Logout Pattern That Doesn't Trigger
7. Distinguishing Expected From Unexpected Failure
8. Good Examples
9. Bad Examples
10. Decision Trees
11. Real Project Examples
12. Common Mistakes
13. Best Practices
14. Checklist
15. References

---

# 1. Purpose

The constitution's Error Philosophy is eight words long per state and total under thirty words — deliberately terse, leaving the "how" to be worked out against real code. This handbook does that work, using the two files in this codebase where error handling is most fully (if imperfectly) realized today: `src/store/authStore.ts`'s `login()` action, and `src/api/client.ts`'s interceptor pair. Both are real, both are partially correct, and both have a specific, nameable gap worth understanding precisely rather than copying uncritically.

---

# 2. Scope

In scope: what each of the eight Error Philosophy states means concretely for a Sugar Admin screen, `authStore.ts`'s current try/catch/finally shape, and `client.ts`'s 401-interceptor pattern including its currently-broken half.

Out of scope: the discriminated-union modeling of async state (`.claude/rules/typescript.md` Rule 5 — referenced, not repeated), and general network-layer conventions (`.claude/rules/networking.md`).

---

# 3. Principles

Grounded in:

- **Error Philosophy** (constitution.md) — the eight states, required before implementation begins, not retrofitted after.
- **Mobile First** (constitution.md) — "network interruptions" is a named pre-implementation consideration; on mobile, "offline" and "timeout" are not edge cases, they are Tuesday.
- **Separation of Concerns** (constitution.md) — a Data-layer function produces an error; a Business-layer decision interprets what it means; a Presentation-layer component renders the right state. `architecture.md` § 14.6 names `client.ts`'s 401 interceptor as the clearest existing example of a Data-layer file making a Business-layer decision — this handbook explains why that specific placement is defensible, and where the line actually is (§ 6).
- **Security Philosophy** (constitution.md) — "networking should assume every response may fail" (also in `context.md`'s Security Goals) — error handling and security posture are the same discipline applied to the same code.

---

# 4. The Eight States, Applied to a Real Screen

The constitution lists Loading, Empty, Error, Success, Retry, Offline, Timeout, Unauthorized. It's easy to read this as eight independent booleans to check off — it is more useful to think of them as answers to eight distinct questions a screen must be able to answer about the exact same piece of data, worked through here against a hypothetical `ProductListScreen` (not yet built, but the concrete shape any list-backed screen in this app should follow):

- **Loading** — "the request is in flight; what does the user see while waiting?" Never nothing — a spinner or skeleton, not a blank screen indistinguishable from a bug.
- **Empty** — "the request succeeded and there is genuinely no data." Distinct from Error — an empty product catalog is not a failure, and should never render the same UI as one. `.claude/agents/10-feature-planner.md` § 9 requires this distinction explicitly per screen.
- **Error** — "the request failed in a way the user can't fix by waiting." What message, and is a Retry action offered (next bullet)?
- **Success** — the happy path; often the only state a first draft actually implements, which is exactly the anti-pattern `.claude/agents/10-feature-planner.md` § 17 names: "Planning the happy path only... is not a plan, it is a mockup description."
- **Retry** — not a separate visual state so much as an available action attached to Error/Timeout — does tapping "retry" re-run the exact same request, and does it reset back through Loading correctly?
- **Offline** — "the device has no connectivity." Distinct from a generic Error: an offline state should say so specifically ("you're offline — showing cached data" or "you're offline — try again when connected"), not a generic "something went wrong" that leaves the user guessing whether it's their connection or the app.
- **Timeout** — a specific Error subtype worth its own message: `client.ts`'s `timeout: 15000` (`.claude/rules/networking.md` Rule 2) means a slow connection fails distinctly from a fast, definite failure (a 404, a 500) — the UI should be able to tell the user "this is taking too long" rather than a generic error after 15 real seconds of waiting.
- **Unauthorized** — the session is no longer valid; per § 6 below, this state currently cannot reliably occur in this codebase, which is itself the most important fact in this document.

No screen in the current codebase implements all eight today — `DashboardScreen.tsx` renders only Success (hardcoded `MOCK_STATS`, no request at all), and `LoginScreen.tsx`'s submit handler is a no-op. This isn't a defect in those files specifically; it's the honest current state (`.claude/knowledge/current-limitations.md` § 6) that every new feature plan is expected to improve on, per `.claude/agents/10-feature-planner.md` § 7 Principle 1.

---

# 5. `authStore.ts`'s try/catch/finally, Read Closely

The full, real `login()` action:

```ts
login: async (credentials) => {
  set({ isLoading: true, error: null });
  try {
    const { data } = await authApi.login(credentials);
    const { user, tokens } = data.data;
    (globalThis as any).__authToken = tokens.accessToken;
    set({ user, token: tokens.accessToken, isAuthenticated: true });
  } catch (e: any) {
    set({ error: e?.response?.data?.message ?? "Login failed" });
  } finally {
    set({ isLoading: false });
  }
},
```

This is a real, working example of the Loading/Error/Success shape (three of the eight states) in one function, and worth reading for what it gets right before critiquing what it doesn't:

**What it gets right:** `isLoading: true` is set before the request starts and unconditionally reset to `false` in `finally` — regardless of success or failure, the loading state always resolves. This is the single most important property of a correct loading implementation: a `finally` block (not a duplicated `set({ isLoading: false })` in both the success path and the catch path) guarantees there's no code path that leaves `isLoading` stuck `true` forever.

**What it doesn't cover:** Empty (not applicable to a login action — there's no "empty" login result), Retry (the UI must call `login()` again itself; nothing in the store distinguishes "first attempt" from "retry"), Offline (a network failure and a 401-invalid-credentials failure both collapse into the same generic `error` string), Timeout (also collapses into the same generic message), Unauthorized (not applicable to login itself, but see § 6 for the broader session-expiry gap this pattern is adjacent to).

**The specific weakness worth naming, per `.claude/rules/typescript.md` Rule 3's Bad Example:** `catch (e: any)` means `e?.response?.data?.message` silently evaluates to `undefined` — falling back to the generic `"Login failed"` — for *any* thrown value, not just an axios error. A `TypeError` from an unrelated bug elsewhere in the call chain produces the exact same user-facing message as a genuine wrong-password rejection, which means a real bug in this code path would look, to any user or tester, identical to normal invalid-credentials behavior. This is why `.claude/rules/typescript.md` Rule 3 requires `catch (e: unknown)` with explicit narrowing going forward — it's not a style preference, it's the difference between an error message that's diagnostic and one that's a permanent decoy.

---

# 6. The 401-Triggers-Logout Pattern That Doesn't Trigger

This is the most important, most concrete gap in this entire document, and it deserves to be understood precisely rather than glossed over. `client.ts`'s response interceptor:

```ts
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      // Trigger logout via event; avoids circular import with store
      (globalThis as any).__onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);
```

The design intent, and why it's placed here rather than in `authStore.ts`, is defensible per `architecture.md` § 14.6: a 401 is detected in the Data layer (this is where the HTTP status code is available), but "the session is over, log the user out" is a Business-layer decision — and this interceptor makes that decision itself, by calling `globalThis.__onUnauthorized`, rather than merely surfacing the 401 and letting a caller decide. That's a real blurring of Separation of Concerns, but a narrow, comprehensible one: exactly one decision (401 → trigger logout) is made here, not a general pattern of business logic creeping into the Data layer.

**The actual, current bug: nothing assigns `globalThis.__onUnauthorized` anywhere in this codebase.** A search across `src/` confirms it — not in `authStore.ts`, not in `App.tsx`, not in any provider. The optional-chaining call (`(globalThis as any).__onUnauthorized?.()`) means this line executes on every 401, finds `undefined`, and silently does nothing. **No 401 response currently triggers logout, session-clearing, or a redirect to login, anywhere in this app, under any condition.**

This means the Unauthorized state from § 4's eight-state list is not merely unimplemented on any given screen — the underlying mechanism a screen would need to *detect* "the session just expired" doesn't fire at all. A feature built today assuming "if the token expires mid-session, the user gets redirected to login" is building on a false premise.

**The fix, when this is next touched** (per `state-management.md` § 7 and `.claude/rules/networking.md` Rule 4): assign the callback somewhere reachable at app startup —

```ts
// App.tsx's Root component, on mount (target, not yet implemented)
useEffect(() => {
  (globalThis as any).__onUnauthorized = () => useAuthStore.getState().logout();
}, []);
```

— or, better, replace the untyped global entirely with the typed token-holder module `architecture.md` § 14.7's ADR and `state-management.md` § 7 both recommend as the long-term direction. Either way: **do not build a feature whose correctness depends on session-expiry redirect working until this is fixed and verified**, and if a diff touches this area, treat wiring the callback as in-scope, not a drive-by unrelated to whatever the diff was originally about.

---

# 7. Distinguishing Expected From Unexpected Failure

`.claude/rules/networking.md` Rule 5 states the target pattern; the reasoning worth internalizing is *why* `authStore.login()`'s current single-generic-message approach, while a reasonable first pass, isn't the destination.

An "expected" failure is one the UI has a specific, better response for than a generic error message — wrong password (offer to retry the password field, don't clear the whole form), a validation rejection (highlight the specific invalid field), a rate limit (say "too many attempts, wait a moment," not "something went wrong"). An "unexpected" failure — a timeout, a 500, a malformed response — genuinely doesn't have a more specific UI response available; a generic "something went wrong, try again" plus a Retry action is the correct, honest response *for that category*, but only for that category.

Collapsing both into one `catch` block that always does `set({ error: genericMessage })`, as `authStore.ts` does today, isn't wrong for a first implementation — it's the honest current state — but it means every failure looks the same to the user regardless of whether retrying would help. The target shape, from `.claude/rules/networking.md` § 4's Good Example:

```ts
try {
  const { data } = await authApi.login(credentials);
  return { status: "success" as const, ...data.data };
} catch (e) {
  if (axios.isAxiosError(e) && e.response?.status === 401) {
    return { status: "invalid-credentials" as const };
  }
  return { status: "unexpected-error" as const, message: e instanceof Error ? e.message : "Unknown error" };
}
```

A discriminated result (per `.claude/rules/typescript.md` Rule 5) the caller can render distinctly — not a single string that flattens every failure mode into one message.

---

# 8. Good Examples

**Good: `authStore.login()`'s `finally`-guaranteed loading reset**, § 5 — the one part of the current pattern that should be copied exactly, unmodified, into any new async store action.

**Good: a distinguished result type**, § 7's target shape — makes "what should the UI show" a type-level question the compiler helps answer, rather than a runtime guess based on a generic error string's contents.

---

# 9. Bad Examples

**Bad: assuming session-expiry redirect works**, per § 6 — building a feature's Unauthorized state around `globalThis.__onUnauthorized` actually firing, when nothing in the codebase assigns it. `.claude/rules/networking.md` § 5's own Bad Example names this precisely: "A feature built assuming expired sessions auto-redirect to Login... nothing in the codebase currently assigns `globalThis.__onUnauthorized` — this silently does nothing."

**Bad: `catch (e: any)` swallowing the real error type**, § 5 — a genuine bug and a genuine wrong-password rejection become indistinguishable to anyone reading the resulting UI.

---

# 10. Decision Trees

## Which of the eight states does this specific failure belong to?

```
Is there no network connectivity at all (device offline)?
  → Offline state — say so specifically, don't render generic Error.
Did the request exceed client.ts's 15s timeout (client.md Rule 2)?
  → Timeout state — a specific Error subtype with its own message.
Did the response come back with status 401?
  → Unauthorized state — but see § 6: verify globalThis.__onUnauthorized
    is actually wired before assuming this redirects anywhere.
Did the request succeed but return a genuinely empty result?
  → Empty state — never rendered identically to Error.
Did the request fail for any other reason (5xx, malformed response,
an unexpected exception)?
  → Error state, with Retry offered if the same request is safe to
    re-run (10-feature-planner.md § 10's "is this method safe to retry").
```

## Should this catch block distinguish expected vs. unexpected failure, or is a single generic message acceptable?

```
Is this the first implementation of this action, with no prior UX
requirement for differentiated messaging?
  → A single generic message (matching authStore.ts's current pattern)
    is an acceptable honest starting point — but note it as a known
    simplification, not a permanent design choice.
Does the feature plan or an existing screen already differentiate
messaging for this action's failure modes?
  → Yes: match that pattern — don't regress to a single generic message
    for a new action in the same feature.
```

---

# 11. Real Project Examples

- **`src/store/authStore.ts`'s `login()`** — the fullest current example of Loading/Error/Success, with the `catch (e: any)` weakness named in § 5.
- **`src/api/client.ts`'s response interceptor** — the 401-detection-that-doesn't-fire, § 6, the single most important gap in this document.
- **`src/store/authStore.ts`'s `hydrate()`** — checks `globalThis.__authToken`, which is always `undefined` on a genuine cold start (`state-management.md` § 15 FAQ), meaning it cannot currently recover a session under any real-world restart condition — a second, related manifestation of the same in-memory-only token limitation discussed from the security angle in `security.md` § 3.
- **`DashboardScreen.tsx`'s `MOCK_STATS`** — renders only the Success state; no Loading/Empty/Error path exists because there's no request at all yet (`state-management.md` § 6).

---

# 12. Common Mistakes

- Building a feature that assumes an expired session automatically redirects to login — verify `globalThis.__onUnauthorized` is actually wired (§ 6) before relying on it.
- Using `catch (e: any)` and trusting `e?.response?.data?.message` without confirming `e` is actually an axios error.
- Rendering the same UI for Empty and Error — they mean different things to a user and should look different.
- Treating "no offline handling" as acceptable because the dev environment always has connectivity — Mobile First (constitution.md) requires designing for network interruption from the start, not patching it in later.
- Forgetting the `finally` block, leaving `isLoading` stuck `true` on some failure path that a plain `if/else` didn't anticipate.

---

# 13. Best Practices

- Copy `authStore.login()`'s `set(...); try { ... } catch { ... } finally { set({ isLoading: false }) }` shape exactly for any new async store action's loading guarantee.
- Before building any feature with session-dependent behavior, verify `globalThis.__onUnauthorized` is wired for that specific code path — don't assume it from reading `client.ts` in isolation.
- Model failure results as discriminated unions (`.claude/rules/typescript.md` Rule 5) rather than a single nullable `error: string`, once a feature's failure modes need distinguishing.
- Write all eight states into the feature plan (`.claude/agents/10-feature-planner.md` § 9) before implementation, not after a reviewer asks where the Offline state is.

---

# 14. Checklist

- [ ] All eight Error Philosophy states are addressed for every new screen — Loading, Empty, Error, Success, Retry, Offline, Timeout, Unauthorized — with "not applicable, because X" stated explicitly for any that don't apply.
- [ ] Every async action guarantees its loading flag resets via `finally`, not a duplicated reset in every branch.
- [ ] `catch` blocks are typed `unknown` and narrowed explicitly, never `any`.
- [ ] No feature assumes `globalThis.__onUnauthorized` fires without verifying it's wired for that code path.
- [ ] Expected failures (wrong password, validation rejection, rate limit) are distinguished from unexpected ones (timeout, 5xx, malformed response) where the UI has a genuinely different response for each.
- [ ] Retry, where offered, re-runs a request confirmed safe to retry.

---

# 15. References

- [constitution.md](../constitution.md) — Error Philosophy, Mobile First, Separation of Concerns, Security Philosophy.
- [context.md](../context.md) — Quality Standards, Security Goals.
- [.claude/rules/networking.md](../rules/networking.md) — Rule 2 (timeout), Rule 4 (`__onUnauthorized` gap), Rule 5 (expected vs. unexpected failure).
- [.claude/rules/typescript.md](../rules/typescript.md) — Rule 3 (`catch` typing), Rule 5 (discriminated unions).
- [architecture.md](./architecture.md) — § 14.6, the Data/Business layer boundary `client.ts`'s interceptor sits on.
- [state-management.md](./state-management.md) — § 7, the `globalThis` bridge this handbook's § 6 examines from the error-handling angle.
- [.claude/agents/10-feature-planner.md](../agents/10-feature-planner.md) — § 9 Screen Specification Standard, the eight-state requirement's enforcement point.
- [../../src/store/authStore.ts](../../src/store/authStore.ts), [../../src/api/client.ts](../../src/api/client.ts) — the real files this handbook is built on.
