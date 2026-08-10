# Pull Request Description Template

```markdown
## What

[1-2 sentences: what this PR does. Complete the sentence "This PR..."]

## Why

[Why is this change needed? Link to issue, task, or feature plan.]

Closes #[issue-number]

## How

[Brief description of the approach. Highlight key decisions, trade-offs,
or anything non-obvious about the implementation.]

## Changes

[OPTIONAL — delete this section unless it earns its place. The reviewer already
has the diff and the file list; this section is only for changes they would
otherwise miss or misread. If a bullet just names a file and what obviously
happened to it, cut the bullet.]

- `POST /orders` now rejects expired discount codes with 422, not 400 — the
  mobile client special-cases 400 and would have retried forever
- The `Order.discount_code` migration backfills NULL for existing rows; it is
  reversible but the backfill is not

## Testing

[How were these changes tested? Be specific.]

- Unit tests for discount calculation (including edge cases: 0%, 100%, expired codes)
- Integration test for the order creation endpoint with discount
- Manual testing on staging with real Stripe test keys

## Screenshots

[For UI changes — before/after. Delete this section if not applicable.]

| Before | After |
|--------|-------|
| [screenshot] | [screenshot] |

## Checklist

- [ ] Tests pass
- [ ] No linting errors
- [ ] Documentation updated (if applicable)
- [ ] Migration is reversible
- [ ] No hardcoded secrets or environment-specific values
- [ ] No personal data in fixtures, seeds, logs, or captured output
- [ ] No phase names, checkpoint IDs, or task codes that a tracked doc doesn't define
- [ ] PR is a reasonable size (< 400 lines changed)

## Notes for Reviewers

[Optional: anything the reviewer should pay special attention to,
areas of uncertainty, or questions you have about the approach.]
```
