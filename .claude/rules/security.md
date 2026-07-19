---
id: rule-security
title: Security Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_repositories
  - all_stores
  - all_api_endpoints
last_updated: 2026-07-18
---

# Security Rules

> Never trust client input, local storage, route parameters, mock validation. — `../constitution.md`, Security Philosophy

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

Sugar Admin has no persisted storage layer today (`MMKV`, `expo-secure-store` — neither is installed) and no runtime input validation library (`zod` is not installed). This file states the concrete, current security posture — including its real gaps — and the rules new code follows to avoid making those gaps worse.

---

# 2. Scope

Applies to token handling, input validation, environment configuration, and any new dependency review.

---

# 3. Rules

## Rule 1 — The auth token is currently in-memory only; no feature may assume a session survives an app restart

`src/store/authStore.ts` stores the token in Zustand state and mirrors it to `(globalThis as any).__authToken`. Neither location persists across a cold start — killing and reopening the app loses the session unconditionally. `authStore.hydrate()` checks `globalThis.__authToken`, which is reset to `undefined` on every fresh process start, meaning `hydrate()` cannot currently recover a session under any real-world condition — it only would help if called after a JS-only reload that preserves the global, which is not how the app is actually used.

**Why this is a security rule, not just a UX one:** the *absence* of persistence is not itself a vulnerability — arguably it's the safer default until a persistence mechanism is deliberately chosen. The risk is a feature being built that silently assumes persistence exists (e.g. "remember me" UI, background sync that assumes a valid token across launches) when it doesn't — producing broken behavior that might be worked around with an insecure quick fix (e.g. writing the token to `AsyncStorage` in plaintext) under deadline pressure. This rule exists to head that off: **do not add ad-hoc persistence to work around this gap.** If persistence is needed, it is a deliberate, reviewed decision (Rule 2), not a one-line addition to unblock a feature.

## Rule 2 — When token persistence is added, it is `expo-secure-store` (iOS Keychain / Android Keystore-backed), never `AsyncStorage` and never plain `MMKV` without encryption

**Why this specific choice, decided now even though not yet needed:** `../constitution.md`'s Replaceability section explicitly lists a storage migration path — `MMKV → SecureStore → SQLite` — but for a bearer token specifically (not general app state), `expo-secure-store` is correct from the start: it's backed by the OS-level secure enclave/keystore, encrypted at rest, and isolated per-app by the OS. `AsyncStorage` (and unencrypted `MMKV`) stores data in plaintext on the filesystem, readable by anything with filesystem access on a rooted/jailbroken device. A bearer token is exactly the kind of value where that distinction matters — it grants API access to whoever holds it.

## Rule 3 — Input validation is never UI-only; a repository's mock (and eventually real) implementation re-validates independently of what a form component already checked

Per the constitution's Security Philosophy — "all validation rules should exist independently from presentation" — and `../context.md`'s Security Goals — "input validation should never rely solely on UI." `LoginScreen.tsx`'s `Input` components today have no validation at all (the Sign In button is a no-op, so this hasn't yet been an issue in practice) — but the target pattern, once wired, is: the UI may show inline validation feedback for UX, but the repository/mock layer independently checks the same rules before "accepting" the input, exactly as a real backend would reject invalid data regardless of what client-side JavaScript ran.

**Why:** a client-side-only check is trivially bypassed (a modified app build, a direct API call, a compromised device) — it protects against user mistakes, not against a malicious or broken client. Since `zod` is not installed (Rule 4), this validation is currently hand-written; it must still live in the repository/business layer, not solely in a component's `onChangeText` handler.

## Rule 4 — `zod` is a target dependency, not installed; hand-written validation functions are the current standard, and they live in the feature's business layer, not the UI

`../context.md`'s Technology Stack lists Zod under Forms alongside React Hook Form; neither is in `package.json` today. Until adopted, a new feature's input validation is a plain TypeScript function with an explicit return type (`typescript.md` Rule 4), e.g.:

```ts
// src/features/auth/validateLoginInput.ts (target location, does not exist yet)
export function validateLoginInput(input: LoginCredentials): string[] {
  const errors: string[] = [];
  if (!input.email.includes("@")) errors.push("Enter a valid email address");
  if (input.password.length < 8) errors.push("Password must be at least 8 characters");
  return errors;
}
```

**Why hand-written now, and why it isn't wasted effort once `zod` arrives:** adding `zod` (or `react-hook-form`) is a deliberate dependency decision (mirroring `expo.md` Rule 2's stance on `app.json`/dependency changes), not something to reach for mid-feature. A hand-written validator that lives in the business layer (not a component) migrates to a `zod` schema later with the call sites unchanged — screens already call a named validation function, not inline `if` statements — so adopting `zod` later is a refactor of the function's internals, not a re-architecture of where validation lives.

## Rule 5 — `ENV.API_BASE_URL`'s silent fallback to a placeholder-looking production URL is a security-adjacent risk, not just a networking bug

Repeated from `expo.md` Rule 5 and `networking.md` Rule 7 because it has a genuine security dimension: `src/config/env.ts`'s fallback (`"https://api.sugar-admin.com/v1"`) means a misconfigured build silently sends every request — including login credentials — to whatever that domain actually resolves to (unprovisioned today, but not guaranteed to stay that way, and DNS for a domain the project doesn't control could be repointed by a third party in the future). This is not currently exploitable (the domain isn't live), but the pattern — a plausible-looking fallback that fails silently instead of loudly — is the actual risk, and it should not be replicated for any other environment-dependent endpoint (AI provider URLs, publishing platform webhooks, etc.).

**Why fixed here as a rule and not just flagged as debt:** any *new* environment-dependent value added to `src/config/env.ts` must not repeat this pattern — a required value with no safe fallback throws or fails a startup check rather than silently defaulting to a URL that looks legitimate.

## Rule 6 — No secret, API key, or credential is ever committed to source control, including in `app.json`, `.env` files, or hardcoded in `src/`

There is currently no `.env` file checked into the repository and no hardcoded secret found in `src/` — this rule keeps it that way. `EXPO_PUBLIC_*` variables (per `expo.md` Rule 5) are, by Expo's own design, bundled into the client JS and are **not** a place to put anything that must stay secret (a private API key, a signing secret) — only public-safe configuration (a base URL, a public client ID) belongs there. A genuine secret needed at build time (e.g. an EAS Build credential) belongs in EAS Secrets or CI environment configuration, never in a committed file.

**Why:** anything prefixed `EXPO_PUBLIC_` ships inside the compiled JS bundle on every user's device — it is, by definition, as public as the app binary itself, extractable by anyone who downloads the app. Treating an `EXPO_PUBLIC_*` variable as a secret is a category error with real consequences if it ever holds one.

## Rule 7 — Dependency additions are reviewed for maintenance status and transitive risk before merge, not added reflexively to unblock a feature

**Why:** `package.json` today is deliberately small (no test libraries, no MMKV, no form libraries — see `../context.md`'s Technology Stack for the gap between target and installed). Every dependency added is a piece of code the project now trusts with whatever access it needs (network, storage, native modules) and a piece of code the project is now responsible for keeping patched. Before adding a new dependency: check it has recent maintenance activity, check its transitive dependency count isn't disproportionate to the problem it solves, and prefer an already-installed `expo-*` package (per `expo.md` Rule 3) over a third-party equivalent when both exist.

---

# 4. Good Examples

## Good: business-layer validation, independent of the UI, matching the target pattern

```ts
// src/features/auth/validateLoginInput.ts
export function validateLoginInput(input: LoginCredentials): string[] { /* as above */ }

// src/features/auth/repository/mockAuthRepository.ts
export const mockAuthRepository: AuthRepository = {
  async login(credentials) {
    const errors = validateLoginInput(credentials); // re-validated here, not trusted from the UI
    if (errors.length) throw new ValidationError(errors);
    // ...
  },
};
```

This is good because the repository does not trust that the UI already validated — it validates again, matching how a real backend would behave regardless of what client code ran.

---

# 5. Bad Examples

## Bad: working around the missing persistence gap with an insecure quick fix

```ts
// Rejected — do not do this to "solve" session persistence under deadline pressure
import AsyncStorage from "@react-native-async-storage/async-storage";
await AsyncStorage.setItem("authToken", token); // plaintext, unencrypted, filesystem-readable
```

**Consequence:** the token is now recoverable by any other process/app with filesystem access on a compromised or rooted device, and by physical device access via ADB/backup extraction on Android without additional protection. Use `expo-secure-store` (Rule 2), added as a deliberate decision, not `AsyncStorage` reached for because it requires no new setup.

## Bad: trusting a valid-looking form as sufficient validation

```tsx
// LoginScreen.tsx — no repository call exists yet, but if one is added naively:
<Button label="Sign In" onPress={() => authRepository.login(credentials)} />
// with no validation anywhere, client or server-equivalent
```

**Consequence:** matches the constitution's explicit warning against trusting "mock validation" — a mock repository with no validation logic teaches the rest of the app (and any future real backend integration) that unchecked input is acceptable, and any actual validation bugs won't surface until a real backend enforces rules the mock never did.

---

# 6. Checklist

- [ ] No new code assumes the auth session persists across an app restart.
- [ ] If token persistence is added, it uses `expo-secure-store`, never `AsyncStorage` or unencrypted storage.
- [ ] New input validation exists in the repository/business layer, not only in a UI component's change handler.
- [ ] No new environment-dependent value silently falls back to a plausible-looking placeholder URL; a missing required value fails loudly.
- [ ] No secret, API key, or credential is committed to source control or placed in an `EXPO_PUBLIC_*` variable.
- [ ] Any new dependency was checked for maintenance status and reviewed as a trust decision, not added reflexively.

---

# 7. References

- `../constitution.md` — Security Philosophy
- `../context.md` — Security Goals
- `state.md` § Rule 8 — the in-memory-token gap from the state-management angle
- `networking.md` § Rule 3, 7 — the `globalThis.__authToken` bridge and the `ENV.API_BASE_URL` fallback
- `expo.md` § Rule 5 — `EXPO_PUBLIC_*` variable conventions
- `typescript.md` — explicit return types for validation functions
