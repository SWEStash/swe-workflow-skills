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

[Bullet list of the main changes, grouped logically. Not every file —
just the meaningful changes.]

- Added `OrderService.calculateDiscount()` for percentage-based discounts
- Updated `Order` model with `discount_code` field and migration
- Added validation for discount codes in `POST /orders` endpoint

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
- [ ] PR is a reasonable size (< 400 lines changed)

## Notes for Reviewers

[Optional: anything the reviewer should pay special attention to,
areas of uncertainty, or questions you have about the approach.]
```
