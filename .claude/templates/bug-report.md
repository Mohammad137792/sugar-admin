---
id: template-bug-report
title: Bug Report Template
category: template
version: 1.0.0
status: active
last_updated: 2026-07-18
---

# Bug Report Template

## Purpose

Use this template to report a defect in Sugar Admin — behavior that violates the
Constitution's Error Philosophy, a broken screen state, or a gap between
documented and actual behavior. Filed by anyone (engineer, reviewer, or AI agent
observing unexpected behavior); triaged and assigned by whichever engineer owns
the affected feature module, or escalated to `chief-architect` if the bug reveals
an architectural gap rather than an implementation slip.

## Instructions

1. **Summary** — one sentence, specific enough to be a searchable title. "Auth
   session lost on app restart" is good; "login broken" is not.
2. **Steps to Reproduce** — numbered, minimal, and literal — a stranger should be
   able to follow them without guessing.
3. **Expected vs. Actual** — state both even when they seem obvious; the gap
   between them is the entire bug report.
4. **Environment** — device/OS, Expo/React Native version (from `package.json`),
   dev vs. production build, mock vs. live backend if that distinction exists yet.
5. **Severity** — Blocker / Major / Minor / Cosmetic. Tie the choice to actual
   user impact, not to how annoying the bug was to find.
6. **Suspected Area of codebase** — name real files/modules
   (`src/store/authStore.ts`, `src/features/auth/`, etc.), not "somewhere in
   auth." If genuinely unknown, say "unknown — needs investigation" rather than
   guessing.
7. **Screenshots/Logs** — attach or paste; for a state-related bug, include the
   relevant store/state snapshot if available.

---

## The Template

```markdown
# Bug Report: <summary>

**Reported by:** <name/role>
**Date:** <YYYY-MM-DD>
**Severity:** Blocker | Major | Minor | Cosmetic

## Summary
<One sentence, specific.>

## Steps to Reproduce
1. <step>
2. <step>
3. <step>

## Expected
<What should happen.>

## Actual
<What actually happens.>

## Environment
- Device/OS: <e.g. iOS 18 Simulator, Pixel 8 / Android 15>
- App version / Expo SDK: <from package.json / app.json>
- Build: dev | production
- Backend: mock | live

## Suspected Area of Codebase
<Real file(s)/module(s), or "unknown — needs investigation.">

## Screenshots / Logs
<Attach or paste. Include relevant state snapshots for state-related bugs.>

## Notes
<Anything else — workarounds found, related bug reports, whether this is a known
limitation already documented elsewhere (e.g. an ADR).>
```

---

## Filled Example: Auth Session Lost on App Restart

```markdown
# Bug Report: Auth session lost on app restart, even after a successful login

**Reported by:** engineering (self-identified while reading `authStore.ts`)
**Date:** 2026-07-18
**Severity:** Major

## Summary
A user who logs in successfully is logged out again the next time the app is
opened, because the access token is only ever held in memory and is never
persisted to device storage.

## Steps to Reproduce
1. Open the app (cold start), land on `AuthStack.Login`.
2. Log in with valid credentials — `useAuthStore.login()` resolves, `isAuthenticated`
   becomes `true`, `AppStack` renders (e.g. `AppStack.Home`).
3. Fully close the app (swipe away from the app switcher, or force-stop).
4. Reopen the app.

## Expected
Per the Constitution's Mobile First section ("network interruptions" and
general mobile UX expectations) and standard mobile auth UX, the user should
remain logged in across app restarts until their token legitimately expires or
they explicitly log out — re-authenticating on every cold start is not
acceptable UX for a business tool used throughout the day.

## Actual
On reopen, `useAuthStore`'s initial state is `token: null, isAuthenticated: false`
(see `src/store/authStore.ts` lines 19-23) — Zustand's `create()` call has no
persistence middleware. The token was only ever written to
`(globalThis as any).__authToken` (an in-memory global, set in `login()` at line
30 and read by the axios interceptor in `src/api/client.ts` line 13) and to the
Zustand store's in-memory state — neither survives an app process restart.
`hydrate()` (lines 45-53) exists and is clearly intended to restore a session on
launch, but it only checks `(globalThis as any).__authToken`, which is always
`undefined` on a fresh process — so `hydrate()` always takes the early return at
line 46 and never actually rehydrates anything from persistent storage. The user
lands back on `AuthStack.Login` every time.

## Environment
- Device/OS: reproducible on any device/OS — this is a pure state-management gap,
  not platform-specific
- App version / Expo SDK: Expo 56.0.11, per `package.json`
- Build: dev and production — the bug is present in the code path itself
- Backend: mock and live — unaffected by backend choice; this is a client-only
  persistence gap

## Suspected Area of Codebase
- `src/store/authStore.ts` — `login()` (line 30, writes only to the in-memory
  global), `hydrate()` (lines 45-53, reads only the in-memory global)
- `src/api/client.ts` — line 13, reads the same in-memory global for the
  Authorization header
- `context.md`'s Technology Stack section names **MMKV** as the project's storage
  choice, and the Constitution's Replaceability section explicitly calls out
  "Storage: MMKV ↓ SecureStore ↓ SQLite should be isolated" — but no MMKV (or
  any) persistence call exists anywhere in `src/store/` today; `mmkv` is not even
  present in `package.json`'s dependencies. This is the root cause: the intended
  persistence layer was never wired up, not a regression in working code.

## Screenshots / Logs
N/A — behavior is deterministic and reproducible by code inspection; no
screenshot needed to demonstrate it. A future report should attach a screen
recording of steps 1-4 above if filed against an actual running build.

## Notes
This is a real, current limitation, not a hypothetical — confirmed by reading
`src/store/authStore.ts` directly (no persistence middleware, no MMKV import,
no `expo-secure-store` import anywhere in the file or `src/api/client.ts`).
Fixing this requires either Zustand's `persist` middleware backed by an MMKV
storage adapter, or `expo-secure-store` for the token specifically (tokens are
sensitive — the Constitution's Security Philosophy says "sensitive information
should never be stored insecurely," which argues for `expo-secure-store` or an
encrypted MMKV instance over plain MMKV for the token itself, while non-sensitive
session metadata could use plain MMKV). This is architecture-adjacent enough
(storage choice, security-sensitive) that a fix should go through
`.claude/templates/architecture-proposal.md` rather than being patched directly
into `authStore.ts` without review, per the Constitution's principle that
architecture decisions precede implementation.
```

---

## Checklist

- [ ] Summary is one sentence and specific enough to search for later
- [ ] Steps to Reproduce are numbered and literal, no guessing required
- [ ] Expected and Actual are both stated, even if "obvious"
- [ ] Environment includes device/OS, app/SDK version, build type, backend mode
- [ ] Severity is one of the four values, tied to real user impact
- [ ] Suspected Area names real files/modules, or explicitly says "unknown — needs investigation"
- [ ] Screenshots/Logs attached, or explicitly marked not applicable with a reason

## References

- `.claude/constitution.md` — Error Philosophy, Security Philosophy, Mobile First, Replaceability
- `.claude/context.md` — Technology Stack (Storage: MMKV — the gap this filled example documents)
- `src/store/authStore.ts` — subject of the filled example above
- `src/api/client.ts` — the in-memory token consumer affected by the same gap
- `.claude/templates/architecture-proposal.md` — recommended next step for a storage-layer fix
