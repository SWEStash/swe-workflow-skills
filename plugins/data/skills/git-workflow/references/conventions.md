# Git Conventions

## Contents
- Conventional Commits types
- Branch naming conventions
- Commit message examples
- When to squash vs keep history
- Interactive rebase patterns

## Conventional Commits Types

| Type | When to Use | Triggers Version Bump |
|------|-------------|----------------------|
| `feat` | New feature visible to users | Minor (0.X.0) |
| `fix` | Bug fix | Patch (0.0.X) |
| `refactor` | Code change that neither fixes a bug nor adds a feature | None |
| `test` | Adding or correcting tests | None |
| `docs` | Documentation only changes | None |
| `chore` | Maintenance (deps, configs, scripts) | None |
| `perf` | Performance improvement | Patch (0.0.X) |
| `ci` | CI/CD pipeline changes | None |
| `build` | Build system or dependency changes | None |
| `style` | Formatting, whitespace (no logic change) | None |
| `revert` | Reverts a previous commit | Depends on reverted type |

`BREAKING CHANGE:` in the footer bumps the major version (X.0.0) regardless of type.

## Branch Naming Conventions

Pattern: `<type>/<short-description>`

- `feat/user-notifications` — new feature
- `fix/login-redirect-loop` — bug fix
- `refactor/extract-payment-service` — code improvement
- `docs/api-endpoint-reference` — documentation
- `chore/upgrade-node-20` — maintenance
- `hotfix/payment-double-charge` — urgent production fix
- `release/2.1.0` — release preparation

Rules:
- Lowercase, kebab-case
- Short but descriptive (3-5 words max)
- Include ticket number if your team uses one: `feat/PROJ-123-user-notifications`

## Commit Message Examples

**Good: Simple feature**
```
feat(auth): add password reset via email

Users can now request a password reset link sent to their registered
email address. The link expires after 1 hour.

Closes #234
```

**Good: Bug fix with context**
```
fix(orders): prevent duplicate charge on retry

When a payment API call timed out, the retry logic would create a
second charge because it didn't check for an existing pending charge.
Added idempotency key to prevent duplicate transactions.

Fixes #456
```

**Good: Refactoring with rationale**
```
refactor(api): extract validation middleware from controllers

Controller files were growing large because each one duplicated
request validation logic. Extracted shared validation into middleware
that runs before the controller, reducing average controller size
by ~40%.
```

**Good: Breaking change**
```
feat(api): require API key for all endpoints

Previously, read-only endpoints were public. Now all endpoints
require authentication via API key header.

BREAKING CHANGE: All API requests must include X-API-Key header.
Existing integrations will receive 401 until they add the header.

Closes #567
```

**Bad examples and why:**
```
# Too vague — what was updated?
chore: update stuff

# Describes WHAT not WHY — the diff shows what
fix: change line 42 in user.js

# Too many things in one commit
feat: add login, registration, password reset, and profile page

# Useless body that repeats the subject
fix: fix the bug
This commit fixes the bug that was reported.
```

## When to Squash vs Keep History

**Squash into a single commit when:**
- The branch has "WIP", "fix typo", "oops" commits
- The intermediate commits are meaningless on their own
- The change is a single logical unit

**Keep multiple commits when:**
- Each commit represents a meaningful step (e.g., "add migration", "add model", "add API endpoint")
- The commits tell a useful story about the development process
- Reviewers might want to review step-by-step

**Recommendation**: Default to squash-merge for PRs, unless the author deliberately structured commits for readability.

## Interactive Rebase Patterns

Clean up history before requesting review:

```bash
# Rebase the last N commits
git rebase -i HEAD~N

# In the editor:
pick abc1234 feat(auth): add login endpoint        # keep
squash def5678 fix typo                             # fold into previous
squash ghi9012 WIP                                  # fold into previous
pick jkl3456 feat(auth): add registration endpoint  # keep as separate commit
drop mno7890 debugging leftovers                    # delete entirely
```

Common operations:
- `pick` — keep the commit as-is
- `squash` — merge into the previous commit (combine messages)
- `fixup` — merge into the previous commit (discard this message)
- `reword` — keep the commit but edit the message
- `drop` — delete the commit entirely
