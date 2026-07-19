---
id: rule-git
title: Git Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_commits
  - all_branches
  - all_pull_requests
last_updated: 2026-07-18
---

# Git Rules

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

`git log --oneline` on this repository, as of this writing, reads:

```
53cb072 --claude setting
522e911 --sugar-admin implementation
60ecdf2 hi git
a9c7fa4 HI GIT
0941023 Initial commit
```

Five commits, three of which (`hi git`, `HI GIT`, `--claude setting`) communicate nothing about what changed or why, one of which (`--sugar-admin implementation`) is closer but still doesn't say what was actually implemented, and only one (`Initial commit`) that's a conventional, expected message for what it is. This is not a hypothetical bad example — it is this project's actual, current commit history, and it is the reason this file exists: `constitution.md`'s Documentation section states that "if future developers must guess why something exists, documentation is missing," and a commit message is documentation — often the *only* documentation a change gets, and the first thing anyone bisecting a bug or writing a changelog reads.

This file states the convention going forward and shows, concretely, how each of the real commits above should have been written.

---

# 2. Scope

Applies to every commit message, branch name, and pull request in this repository, from this point forward. It does not require rewriting existing history — `git log`'s current state stays as documented, honest evidence of where the project started, per this file's own principle of honest documentation over a rewritten-to-look-clean history.

---

# 3. Rules

## Rule 1 — Commit messages follow Conventional Commits: `<type>(<scope>): <description>`

```
feat(auth): add login form validation
fix(client): attach Authorization header only when token is present
refactor(api): extract auth.ts into repository pattern
docs(handbook): add error-handling handbook
chore(deps): remove unused @types/react-native
```

**Why Conventional Commits specifically, and not a simpler free-text convention:** Sugar Admin has no changelog automation today (`.claude/templates/release-notes.md` states "there is no CHANGELOG.md or release history in the repo yet"), but the project's stated trajectory — multiple feature modules, five publishing platforms, a real backend eventually — means a changelog and release-note automation is a near-certain future need, not a hypothetical one. Conventional Commits' `type` prefix (`feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`) is machine-parseable by every common changelog generator, meaning adopting it now costs nothing extra today and avoids a painful retroactive migration later. It also gives a human reader the same benefit immediately: scanning `git log --oneline` for every `fix(auth):` commit is possible today, in a way scanning for "commits about login bugs" in freeform prose is not.

**Why not a simpler convention, given the project's current small size:** a "simpler for now, formalize later" approach is exactly the kind of premature-informality decision that produced this repository's actual current history (§ 1) — five commits in, and three are already unusable for their basic archival purpose. The cost of following a real convention from commit six onward is lower than the cost of retrofitting discipline after bad habits compound.

## Rule 2 — The `<type>` is one of: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`

**Why exactly this set, mapped to this project's own vocabulary:** each maps directly onto a distinction this workspace's own documents already draw. `feat` = new user-facing capability (a new screen, a new repository method). `fix` = a genuine bug fix — behavior was wrong, now it's right. `refactor` = structural change with no behavior change, matching `refactoring.md` § 4's precise definition exactly — a commit labeled `refactor` that changes behavior is a mislabeled commit by this project's own standard, not just a git convention violation. `docs` = `.claude/` workspace files, code comments, README content. `test` = test infrastructure or test cases, once `testing-strategy.md` § 7's adoption trigger is reached. `chore` = dependency bumps, config file changes with no functional effect. `perf` = a change justified by a stated measurement, per `.claude/rules/performance.md` Rule 2 — a `perf` commit with no measurement cited in its body is itself a violation of that rule. `style` = formatting-only changes (once a formatter is adopted — none exists today per `.claude/knowledge/current-limitations.md` § 11).

## Rule 3 — The `<scope>` names the feature folder, shared module, or workspace area touched, not a vague area

```
feat(products): add product list screen
fix(dashboard): correct stat trend arrow direction
docs(handbook): add performance handbook
```

Not `feat(stuff): add products` or `fix(bug): dashboard issue`.

**Why:** a scope drawn from `src/features/<name>/` or a top-level concern (`api`, `store`, `navigation`, `handbook`, `rules`, `agents`) makes `git log --grep` and scoped history review (`git log -- src/features/products/`) actually useful — a vague scope like `stuff` or `bug` defeats the entire purpose of having a scope field at all. When a commit spans multiple features (rare, and per Rule 6, usually a sign the commit should be split), omit the scope rather than inventing a misleadingly broad one: `feat: add cross-feature navigation types`.

## Rule 4 — The description is imperative mood, states what the commit does, under ~72 characters on the summary line

```
fix(client): retry request once on network timeout
```

Not `fixed a bug`, not `fixes client retry issue`, not a 140-character run-on sentence.

**Why imperative mood specifically:** "add," "fix," "remove" — not "added," "fixes," "removing." This matches the convention Git itself uses for its own generated messages (e.g. "Merge branch..."), and reads naturally when substituted into the sentence "If applied, this commit will ___." A message in past tense or gerund form doesn't complete that sentence cleanly, which is a real (if subtle) signal that the message drifted from describing the *change* toward describing the *process* of making it.

## Rule 5 — The body explains *why*, not *what* — the diff already shows what changed

```
refactor(api): migrate auth.ts login() into repository pattern

authStore.ts's login() called authApi.login() directly, coupling it to
axios and a specific base URL (architecture.md § 9). This extracts a
mockAuthRepository + httpAuthRepository behind an AuthRepository
interface, per 10-feature-planner.md § 10, with authStore.ts updated to
call the new repository's login() instead.

Verified: manually exercised valid and invalid credentials before and
after; authStore's resulting state (user, token, isAuthenticated, error)
is identical in both cases. logout() and hydrate() are left calling
authApi directly — follow-up commit.
```

**Why:** per constitution's Reviews section — "What changed? Why? Alternatives considered? Risks? Future impact?" — a diff answers "what changed" completely on its own; a commit body exists specifically to answer the four questions a diff cannot answer by itself. A body that just restates the diff in prose ("changed login to use repository instead of api") adds no information a reviewer or future bisector doesn't already have from the diff itself.

## Rule 6 — One logical change per commit; a commit that mixes an unrelated fix, a refactor, and a feature is split before it's committed

**Why:** this directly mirrors `refactoring.md` § 8's reasoning about sizing a refactor *step* correctly, applied one level up to the commit itself — a commit is the smallest unit a future `git bisect` or `git revert` can act on. A commit that bundles a genuine bug fix with an unrelated refactor means reverting the refactor (if it turns out wrong) also reverts the fix, and vice versa. `refactoring.md` § 9's own named Bad Example — "cleaned up `src/api/`... also fixed a typo in an error message and renamed a few variables" — is exactly the shape Rule 6 exists to prevent at the commit level, independent of whether it's also caught at the PR level.

## Rule 7 — Never skip commit hooks (`--no-verify`), never bypass signing, unless the user explicitly requests it for this specific commit

**Why:** a hook exists to catch something before it enters history — a lint failure, a type error, a formatting violation (once any of these are configured; none exist today per `.claude/knowledge/current-limitations.md` § 11, but this rule holds regardless of whether a hook is currently configured, because it will apply the moment one is). Skipping it "just this once" means whatever the hook would have caught enters the repository anyway, and the hook's presence stops being a reliable guarantee for the next person who trusts it.

## Rule 8 — Prefer a new commit over amending, unless the user explicitly asks for an amend

**Why:** amending rewrites history — for a commit already pushed or already reviewed, this silently invalidates whatever a reviewer already looked at, and can cause real confusion or lost work for anyone who already pulled the original commit. A new commit is always safe; an amend is only safe when the commit is purely local and unshared, and even then, only when explicitly intended rather than reached for by default.

## Rule 9 — Branch names follow `<type>/<short-description>`, matching the commit `<type>` vocabulary

```
feat/product-catalog
fix/dashboard-trend-arrow
refactor/auth-repository-migration
docs/handbook-completion
```

**Why:** using the same `<type>` vocabulary as commit messages (Rule 2) means a branch name alone signals its intent before anyone opens a single commit — useful when scanning a list of open branches or PRs. A generic branch name (`update`, `fix2`, `mohammad-branch`) gives a reviewer or teammate nothing to go on before opening it.

## Rule 10 — Pull requests stay small enough to review in one sitting; a PR mixing multiple unrelated concerns is split before requesting review

**Why:** directly mirrors `.claude/handbook/code-review.md`'s entire premise and `refactoring.md` § 8's step-sizing reasoning, applied to the PR as the reviewable unit. A PR that touches five unrelated files for five unrelated reasons forces a reviewer to either give each concern shallow attention or spend disproportionate time reconstructing what's actually being asked for review. `constitution.md`'s Core Values rank Correctness first — a PR sized so a reviewer can actually verify correctness in one sitting serves that value directly; an oversized PR works against it regardless of how good the individual changes inside it are.

---

# 4. Good Examples

## Good: how this project's actual early commits should have been written

The real, current history (§ 1) rewritten as it should have read from the start — not to suggest rewriting the actual history, but to make the convention concrete against real, familiar content:

```
0941023 chore: scaffold Expo project (initial commit)
a9c7fa4 feat: add core screens (login, dashboard, content, reports, ai-chat)
60ecdf2 feat(navigation): wire AppNavigator and AuthNavigator stacks
522e911 feat: implement sugar design system (Button, Card, GlassCard, theming) and initial API client
53cb072 chore(claude): add .claude/ engineering workspace configuration
```

Each line answers, in a glance, what changed and roughly why — a marked improvement over `hi git` / `HI GIT` / `--claude setting` communicating nothing.

## Good: a real, well-formed commit message for a hypothetical next change

```
fix(auth): type catch block explicitly instead of `any`

authStore.ts's login() caught errors as `any`, silently swallowing any
non-axios error into a generic "Login failed" message (typescript.md
Rule 3). Narrows to `unknown` with an `axios.isAxiosError` check so a
genuine bug surfaces distinctly from an expected invalid-credentials
rejection.
```

---

# 5. Bad Examples

## Bad: this project's actual, current commit messages

```
hi git
HI GIT
--sugar-admin implementation
--claude setting
```

Cited directly, not as a hypothetical — `hi git` and `HI GIT` communicate nothing about what changed; `--sugar-admin implementation` doesn't say what was implemented (the entire app? one feature? per § 1, this commit actually introduced the whole initial codebase); `--claude setting` doesn't say which setting, or why. None of the four would help a future engineer running `git log --oneline` understand the project's history without opening every diff individually.

## Bad: a commit that bundles unrelated changes

```
feat: add product list screen, fix dashboard bug, update dependencies
```

Three unrelated concerns in one commit and one message — violates Rule 6, makes a future revert of any one part impossible without manually un-reverting the other two.

---

# 6. Checklist

- [ ] Commit message follows `<type>(<scope>): <description>`, imperative mood, under ~72 characters on the summary line.
- [ ] `<type>` is one of `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `style`, and matches what the commit actually does (a `refactor` that changes behavior is mislabeled).
- [ ] `<scope>` names a real feature folder or workspace area, not a vague placeholder.
- [ ] The body (if present) explains *why*, not a restatement of the diff.
- [ ] The commit represents exactly one logical change — no bundled unrelated fix/refactor/feature.
- [ ] No `--no-verify` or signing bypass was used without explicit user request.
- [ ] A new commit was created rather than an amend, unless amending was explicitly requested.
- [ ] Branch name follows `<type>/<short-description>`.
- [ ] The PR is scoped small enough for one reviewer to verify in one sitting.

---

# 7. References

- [constitution.md](../constitution.md) — Documentation, Reviews.
- [.claude/handbook/refactoring.md](../handbook/refactoring.md) — § 4, § 8, the "what counts as a refactor" and step-sizing reasoning Rules 2, 6, and 10 build on.
- [.claude/handbook/code-review.md](../handbook/code-review.md) — the review process a properly-sized PR (Rule 10) feeds into.
- [.claude/rules/review-process.md](./review-process.md) — the enforceable review checklist a well-formed PR is evaluated against.
- [.claude/templates/release-notes.md](../templates/release-notes.md) — the changelog-adjacent document Conventional Commits (Rule 1) is chosen partly to support.
- Real, current `git log --oneline` output — the grounding evidence for this file's entire premise.
