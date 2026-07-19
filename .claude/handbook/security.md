---
id: handbook-security
title: Security Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Security Handbook

> "The token that never leaves memory is safe from disk forensics and unsafe from every restart. Both facts matter." — `.claude/agents/32-security-reviewer.md`

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The `globalThis.__authToken` Trade-off, In Full
5. The Path Forward: SecureStore vs. MMKV, Weighed
6. Input Validation Independent of the UI
7. Dependency Hygiene as a Security Discipline
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

`.claude/rules/security.md` already states the seven enforceable rules governing token handling, storage, validation, environment configuration, and dependency review. `.claude/agents/32-security-reviewer.md` already owns enforcing them at review time, with binding authority. This handbook exists for the reasoning underneath both — most importantly, a full, honest weighing of the in-memory-only token's actual trade-off (it is not simply "insecure," and understanding *why* it isn't simply insecure is what lets an engineer make a correct decision about what replaces it), and the concrete path from where the codebase is today to where `constitution.md`'s Replaceability principle says storage should end up.

---

# 2. Scope

In scope: the security reasoning behind the `globalThis.__authToken` pattern, a full comparison of `expo-secure-store` vs. `MMKV` as the path forward, the reasoning behind validating independently of UI, and why dependency hygiene is treated as a security concern in this codebase specifically.

Out of scope: the enforceable rule list (`.claude/rules/security.md`), the review role's authority and SOP (`.claude/agents/32-security-reviewer.md`), and networking-specific conventions (`.claude/rules/networking.md`).

---

# 3. Principles

Grounded in:

- **Security Philosophy** (constitution.md) — "Never trust: client input, local storage, route parameters, mock validation. All validation rules should exist independently from presentation."
- **Replaceability** (constitution.md) — names the storage migration path explicitly: "MMKV → SecureStore → SQLite should be isolated." § 5 below applies this exact framing to Sugar Admin's actual, current choice.
- **Security Goals** (context.md) — "sensitive information should never be stored insecurely... networking should assume every response may fail."
- **Technical Debt** (constitution.md) — accepted only with a documented reason, a follow-up plan, and understood impact. The in-memory token is this handbook's central worked example of debt that meets that bar today (§ 4), and a concrete illustration of what "understood impact" actually requires in practice.

---

# 4. The `globalThis.__authToken` Trade-off, In Full

`.claude/agents/32-security-reviewer.md`'s epigraph states the trade-off in one sentence; this section unpacks it fully, because a partial understanding of this pattern ("it's insecure, replace it") leads to a worse fix than a full understanding does.

**What actually happens today.** `src/store/authStore.ts`'s `login()` writes `(globalThis as any).__authToken = tokens.accessToken` after a successful login. `src/api/client.ts`'s request interceptor reads the same global on every outgoing request. Nothing writes this value anywhere else — not to `AsyncStorage`, not to `MMKV`, not to `expo-secure-store`, not to the filesystem in any form. It exists only as long as the JS engine instance is alive.

**The real security positive this produces, worth stating plainly because it's easy to skip past on the way to listing the negatives:** there is no on-disk artifact for an attacker with device or filesystem access — a lost/stolen unlocked device, a rooted/jailbroken device with backup extraction tools, a forensic image of the filesystem — to recover. A token that was never written to disk cannot be read from disk. This is a genuine property, not a consolation prize; it's the reason `.claude/agents/32-security-reviewer.md` § 9 explicitly frames it as "a real UX and security trade-off happening right now," not a one-sided defect.

**The real cost, equally worth stating precisely.** Every app restart — a force-quit and reopen, a device reboot, in some cases even an OS-level background eviction depending on platform memory pressure — loses the session unconditionally. `authStore.ts`'s `hydrate()` checks `globalThis.__authToken` and finds `undefined` on any genuine cold start, because nothing persisted a value to check. `.claude/rules/security.md` Rule 1 states this precisely: `hydrate()` "cannot currently recover a session under any real-world condition." This is a real, continuous UX cost — every single session requires a fresh login — not a rare edge case.

**Why this is documented, accepted debt rather than an emergency to fix in the next PR.** Per constitution's Technical Debt section, debt is acceptable when the reason is documented (this handbook, `state-management.md` § 7, `.claude/rules/security.md` Rule 1), a follow-up plan exists (§ 5 below), and the impact is understood (both directions of the trade-off, stated above, not just the negative one). Sugar Admin is in Foundation/Early Development phase (`context.md`) with no real backend yet — building a persistence layer against a token shape that might still change once real auth is wired to a real backend risks solving the wrong problem prematurely, which is its own Simplicity Wins violation.

**The one thing this section explicitly does not license:** working around the UX cost with an ad-hoc, insecure fix — writing the token to `AsyncStorage` in plaintext "just to unblock this one feature" under deadline pressure. `.claude/rules/security.md` Rule 1 names this exact temptation and forbids it explicitly: that move trades away the one real positive (§ above) without gaining the reliability a *properly* chosen persistence mechanism would provide, landing in the worst of both worlds — persisted, and unencrypted.

---

# 5. The Path Forward: SecureStore vs. MMKV, Weighed

`constitution.md`'s Replaceability section names the exact migration path for storage generally: "MMKV → SecureStore → SQLite should be isolated." `context.md`'s Technology Stack lists MMKV under "Storage" as the general target. It would be easy to read those two facts together and conclude MMKV is the correct next step for the auth token specifically. `.claude/rules/security.md` Rule 2 says otherwise, and the reasoning is worth working through rather than taking on faith.

**The distinction that matters: general app state vs. a bearer credential.** MMKV (even in its encrypted mode) is a fast, general-purpose key-value store — an excellent choice for things like cached UI preferences, draft form state, or non-sensitive cached data, exactly the kind of "general storage" `context.md`'s Technology Stack is describing. A bearer access token is categorically different: it is a live credential that, if extracted, grants an attacker the same API access the legitimate user has, for as long as the token remains valid. This isn't a matter of degree — it's a different threat model entirely.

**Why `expo-secure-store` specifically, for the token, from the start.** `expo-secure-store` is backed by the OS's own secure enclave/keystore (iOS Keychain, Android Keystore) — hardware- or OS-level-isolated storage designed specifically for credentials, with encryption at rest that's independent of the app's own code. Even encrypted MMKV, by contrast, manages its own encryption key within the app's control — a meaningfully different security boundary than OS-level Keychain/Keystore isolation, even though "encrypted" is technically true of both. For a value where compromise means "attacker can act as this user against a real API," the stronger, purpose-built guarantee is worth the (small) additional integration cost over reusing the general-purpose storage layer that's already the broader project default.

**What this means concretely, when persistence is eventually built:** `authStore.ts`'s token field gets written to `expo-secure-store` alongside (or instead of) the `globalThis` mirror, and `hydrate()` reads from `expo-secure-store` on app start instead of checking a global that's always empty on a genuine cold start. MMKV remains the right choice for everything else Sugar Admin eventually persists (UI preferences, cached non-sensitive query data) — this is not an argument against adopting MMKV generally, only against using it for this one specific, higher-stakes value.

**Sequencing:** `.claude/agents/32-security-reviewer.md` § 9 states plainly this is not a mandate to rewrite `authStore.ts`/`client.ts` as a blocking requirement on unrelated work — it's a decision to make deliberately, with `chief-architect` sign-off (any new dependency is a `00-chief-architect.md` § 4 decision), when persistence is actually being built, not a background task to slot in opportunistically.

---

# 6. Input Validation Independent of the UI

`constitution.md`'s Security Philosophy states it in five words: "never trust... mock validation." `.claude/rules/security.md` Rule 3 makes the target pattern concrete for this codebase specifically. The reasoning worth walking through: why does a *mock* repository need to validate at all, when it's not protecting against a real external attacker — it's local development code the same engineer building the feature also controls?

Two reasons, both real. **First, a mock that never validates trains the wrong habit** — it teaches the rest of the app (and any future engineer copying the pattern) that unchecked input is acceptable, because nothing in the development loop ever demonstrates otherwise. The first time a real backend enforces a rule the mock never did, whatever screen was built assuming unchecked input succeeds gets a rude, late surprise. **Second, and more directly: mock validation logic is a rehearsal for real validation logic** — writing `validateLoginInput()` as a standalone, UI-independent function during mock development means that function already exists, already has the right shape, and already lives in the right layer (the feature's business logic, not a component's `onChangeText` handler) by the time a real backend exists to enforce the same rules server-side.

`LoginScreen.tsx` today has no validation at all — its Sign In button is a no-op, so this hasn't yet surfaced as a problem in practice. The target pattern, worked from `.claude/rules/security.md` § 4's example:

```ts
// src/features/auth/validateLoginInput.ts (target, does not exist yet)
export function validateLoginInput(input: LoginCredentials): string[] {
  const errors: string[] = [];
  if (!input.email.includes("@")) errors.push("Enter a valid email address");
  if (input.password.length < 8) errors.push("Password must be at least 8 characters");
  return errors;
}
```

Called from the mock repository, not just the UI form — so that even a caller that bypasses the form entirely (a deep link, a future automated flow, a malformed programmatic call) is still subject to the same rule. `zod` is not installed today (`.claude/rules/security.md` Rule 4) — this hand-written shape is deliberately migration-friendly: call sites already call a named function, not inline `if` statements, so adopting `zod` later is an internal refactor of this one function, not a re-architecture of every call site that currently does its own validation.

---

# 7. Dependency Hygiene as a Security Discipline

`.claude/rules/security.md` Rule 7 treats every new dependency as a trust decision, not a convenience. Worth explaining why this belongs in a security document specifically, rather than purely a code-quality one: `package.json` is deliberately small today — no test libraries, no MMKV, no form libraries yet (`context.md`'s Technology Stack names several targets not yet installed). Every dependency added is code the project now runs with whatever access it needs — network, storage, in some cases native module access — and code the project is now responsible for keeping patched against future vulnerabilities discovered in it.

This matters more, not less, in a codebase this early: a dependency added casually now, before the project has established review habits around dependency additions, sets the precedent for every dependency added after it. The concrete practice, per `.claude/rules/security.md` Rule 7: before adding anything, check it has recent maintenance activity, check its transitive dependency count is proportionate to the problem it solves, and prefer an already-installed `expo-*` package (`.claude/rules/expo.md` Rule 3) over a third-party equivalent when both exist — because Expo-maintained packages are tracked against the exact SDK version in use and avoid the native-linking risk a bare third-party RN package can introduce in a managed-workflow app (`.claude/rules/expo.md` Rule 1).

---

# 8. Good Examples

**Good: business-layer validation, independent of the UI**, reproduced from `.claude/rules/security.md` § 4 because it's the exact target shape:

```ts
export const mockAuthRepository: AuthRepository = {
  async login(credentials) {
    const errors = validateLoginInput(credentials); // re-validated here, not trusted from the UI
    if (errors.length) throw new ValidationError(errors);
    // ...
  },
};
```

**Good: naming the trade-off, not just the fix.** A PR description that says "adds token persistence via `expo-secure-store`; this closes the every-restart-relogin gap (`security.md` § 4) but means a compromised, unlocked device with Keychain/Keystore access could extract a live token — accepted, given OS-level protection is the strongest available guarantee for this class of data" is a good example of stating a trade-off explicitly, per the Technical Debt section's requirement, rather than presenting a security-relevant change as if it were risk-free.

---

# 9. Bad Examples

**Bad: working around the persistence gap with `AsyncStorage`.**

```ts
// Rejected — do not do this to "solve" session persistence under deadline pressure
await AsyncStorage.setItem("authToken", token); // plaintext, unencrypted, filesystem-readable
```

Named explicitly in `.claude/rules/security.md` § 5 as the specific move this handbook's § 4 warns against — it trades away the one genuine positive of the current in-memory approach (nothing to extract from disk) without gaining a properly-chosen mechanism's actual guarantee.

**Bad: trusting a valid-looking form as sufficient.**

```tsx
<Button label="Sign In" onPress={() => authRepository.login(credentials)} />
// with no validation anywhere, client or business-layer
```

Matches the constitution's explicit warning against "mock validation" — a mock with no validation logic teaches the rest of the app that unchecked input is fine, and any real validation bug won't surface until a real backend enforces a rule the mock never modeled.

---

# 10. Decision Trees

## Does a new persisted value need `expo-secure-store` or is MMKV sufficient?

```
Is this value a live credential (access token, refresh token, API key)
whose extraction would grant an attacker meaningful access?
  → expo-secure-store, always — see § 5's reasoning. Never plain
    AsyncStorage, never unencrypted MMKV.
Is this value general app state (UI preference, cached non-sensitive
query data, a draft form value)?
  → MMKV is the appropriate general-purpose choice, per context.md's
    Technology Stack.
```

## Does this new repository method need independent validation?

```
Does it accept any user-provided or externally-sourced input (a form
value, a route param, a deep link payload)?
  → Yes: validate inside the repository/business layer, per § 6 —
    regardless of what the UI already checked.
Is the input entirely internal/derived (e.g. a value only ever
constructed by other trusted code, never user-facing)?
  → Lower priority, but still worth considering per constitution's
    "never trust... route parameters" — verify no user-facing path
    can reach this method with unvalidated data before skipping.
```

---

# 11. Real Project Examples

- **`src/store/authStore.ts`'s `login()`/`logout()`/`hydrate()`** — the concrete write/read/recovery-attempt sites for the `globalThis.__authToken` pattern, § 4.
- **`src/api/client.ts`'s request interceptor** — the concrete read site, and the silent-no-header failure mode named in `.claude/agents/32-security-reviewer.md` § 9.
- **`src/features/auth/screens/LoginScreen.tsx`** — currently has no validation at all (no-op submit handler), the concrete grounding for § 6.
- **`package.json`** — verified absence of `zod`, `expo-secure-store`, and `MMKV`, grounding both § 5 and § 6's "target, not installed" framing.

---

# 12. Common Mistakes

- Reaching for `AsyncStorage` to "quickly" solve the every-restart-relogin UX problem under deadline pressure.
- Assuming MMKV is the correct choice for the auth token specifically because it's the general Technology Stack target for "Storage."
- Building a mock repository with no validation logic, teaching the rest of the app that unchecked input is acceptable.
- Adding a new dependency without checking its maintenance status or preferring an already-installed `expo-*` equivalent.
- Treating the in-memory token as an unqualified defect rather than understanding both sides of its real trade-off before proposing a fix.

---

# 13. Best Practices

- When persistence is eventually added for the auth token, use `expo-secure-store` from the start — don't reach for whatever general storage library happens to be adopted first for unrelated reasons.
- Write validation functions in the business layer from the first mock repository that accepts user input, even before `zod` is adopted — the shape migrates cleanly later.
- State security trade-offs explicitly in PR descriptions, per the Technical Debt section's documentation requirement — don't present a security-relevant change as risk-free.
- Check every new dependency's maintenance status and necessity before adding it, and prefer an installed `expo-*` package when one exists.

---

# 14. Checklist

- [ ] No new code writes the auth token (or any credential) to `AsyncStorage` or unencrypted storage.
- [ ] Any new token persistence uses `expo-secure-store`, decided deliberately with `chief-architect` sign-off, not added ad hoc.
- [ ] New input validation exists in the repository/business layer, independent of the UI form.
- [ ] The security trade-off of any storage/persistence change is named explicitly, not left implicit.
- [ ] New dependencies are checked for maintenance status and necessity before being added.
- [ ] No secret or credential is committed to source control or placed in an `EXPO_PUBLIC_*` variable.

---

# 15. References

- [constitution.md](../constitution.md) — Security Philosophy, Replaceability, Technical Debt.
- [context.md](../context.md) — Security Goals, Technology Stack.
- [.claude/rules/security.md](../rules/security.md) — the enforceable rule list this handbook explains.
- [.claude/agents/32-security-reviewer.md](../agents/32-security-reviewer.md) — review authority, the token pattern's current-state findings.
- [state-management.md](./state-management.md) — § 7, the `globalThis` bridge from the state-management angle.
- [error-handling.md](./error-handling.md) — § 6, the related `__onUnauthorized` gap.
- [.claude/rules/networking.md](../rules/networking.md) — Rule 3, 7, the token bridge and fallback-URL risk from the networking angle.
- [../../src/store/authStore.ts](../../src/store/authStore.ts), [../../src/api/client.ts](../../src/api/client.ts) — the real files this handbook is grounded in.
