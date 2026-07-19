---
id: template-release-notes
title: Release Notes Template
category: template
version: 1.0.0
status: active
last_updated: 2026-07-18
---

# Release Notes Template

## Purpose

Use this template to write release notes for a new Sugar Admin version, published
as an Expo/EAS build. Filled out by whoever cuts the release (typically
`chief-architect` or a designated release owner), summarizing work merged since
the previous version.

Sugar Admin's current version is `1.0.0` (`app.json`'s `expo.version` field, which
drives the native app version separately from `package.json`'s own `version`
field — keep both in sync when bumping). There is no CHANGELOG.md or release
history in the repo yet; this template is the starting convention for one.

## Instructions

1. **Version** — follow semver against `app.json`'s `expo.version` and
   `package.json`'s `version`, which should always match. Bump both when cutting
   a release.
2. **Highlights** — 2-4 bullets, user-facing language, no internal jargon
   (a shop owner reads this, not an engineer).
3. **New Features** — group by feature module (matching `src/features/*`
   naming), not by individual PR.
4. **Improvements** — smaller, non-new-feature changes (performance, polish,
   accessibility fixes).
5. **Bug Fixes** — reference the bug report if one exists
   (`.claude/templates/bug-report.md`), in plain language.
6. **Known Issues** — be honest. An empty Known Issues section on a
   foundation-phase app (`context.md`: "Current Development Phase: Foundation,
   Status: Early Development") is a red flag, not a good sign — name real,
   current limitations.
7. **Upgrade Notes** — anything a developer or tester needs to do beyond
   installing the new build (env var changes, cleared local storage, etc.).

---

## The Template

```markdown
# Release Notes: v<X.Y.Z>

**Release date:** <YYYY-MM-DD>
**Expo SDK:** <version, from package.json>

## Highlights
- <user-facing bullet>
- <user-facing bullet>

## New Features
### <Feature module>
- <what's new>

## Improvements
- <improvement>

## Bug Fixes
- <fix, plain language> (<link to bug report if one exists>)

## Known Issues
- <honest, current limitation>

## Upgrade Notes
<Anything beyond "install the new build" — env changes, storage migrations, etc.
"None" if genuinely nothing.>
```

---

## Filled Example: v1.1.0 — Foundation Work

```markdown
# Release Notes: v1.1.0

**Release date:** 2026-07-18
**Expo SDK:** 56.0.11 (per `package.json`)

## Highlights
- Product catalog management is now available — create, browse, search, and
  archive products from your phone.
- The app now clearly tells you when you're offline instead of silently failing.
- Login sessions are more reliable across app restarts.

## New Features
### Products
- Browse your product catalog with search and category filters
  (`AppStack.ProductList`).
- View full product detail, including images, inventory, and categories
  (`AppStack.ProductDetail`).
- Create and edit products, including setting inventory counts and assigning
  categories (`AppStack.ProductForm`).
- Archive products you no longer sell without permanently deleting their history.

## Improvements
- Shared `Button` component gained an `outline` variant, used for lower-emphasis
  actions like "Cancel" throughout the app.
- Screens that load data now show consistent loading skeletons instead of a bare
  spinner, improving perceived performance (Constitution's Performance
  Philosophy: "Performance is designed. Not optimized afterward.").
- Offline banners now appear consistently across screens that show
  previously-loaded data instead of silently going blank.

## Bug Fixes
- Fixed: users were logged out every time the app was closed and reopened, even
  right after a successful login — the access token was never persisted to
  device storage, only held in memory (see
  `.claude/templates/bug-report.md`'s filled example, "Auth session lost on app
  restart"). Sessions now persist via secure on-device storage until the token
  legitimately expires or the user logs out.

## Known Issues
- Products, like all features in this release, run entirely against a mock
  backend — no real server integration exists yet (`context.md`: "Current
  Development Phase: Foundation," "Backend: Not implemented"). Data does not sync
  between devices.
- Bulk import/export of products is not available (explicitly out of scope for
  the initial Products feature — see `.claude/templates/feature-proposal.md`'s
  filled example, Scope section).
- The app's navigation library (React Navigation) differs from what `context.md`
  originally specified (Expo Router) — this is a documented, unresolved
  discrepancy, not a bug; see `.claude/templates/adr.md`'s filled example for the
  full record. It has no user-facing impact.
- No automated test suite exists yet for this release (`package.json` has no
  test runner installed) — all verification for this release was manual; see
  `.claude/templates/testing.md` for the plan to close this gap.

## Upgrade Notes
Existing installs from v1.0.0 will be logged out once, on first launch of
v1.1.0, while the new secure-storage session format takes effect — this is a
one-time re-login, not a recurring issue. No other manual steps required.
```

---

## Checklist

- [ ] Version matches `app.json` `expo.version` and `package.json` `version`
- [ ] Highlights are user-facing language, no internal jargon
- [ ] New Features grouped by feature module
- [ ] Bug Fixes reference a bug report where one exists
- [ ] Known Issues is honest and non-empty for a Foundation-phase release
- [ ] Upgrade Notes explicitly states "None" if there is genuinely nothing beyond installing

## References

- `.claude/context.md` — Current Development Phase, Technology Stack
- `app.json` — current `expo.version` (`1.0.0` at time of writing)
- `.claude/templates/bug-report.md` — source of Bug Fixes entries
- `.claude/templates/feature-proposal.md` — source of New Features scope/detail
- `.claude/templates/adr.md` — source of any Known Issues tied to a documented architectural decision
