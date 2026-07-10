---
name: rollback-strategy
description: "Design safe rollback plans before deploying — identify irreversible changes, classify rollback complexity, create tested undo procedures. Triggers: rollback plan, rollback strategy, how do I undo this, can we revert, what if the deploy fails, safe to deploy, feature flag rollout, blue-green, database migration rollback, irreversible change."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Rollback Strategy

Design the undo plan before deploying — not during a production incident. A deployment without a rollback plan is a bet that nothing will go wrong.

## ⛔ The Iron Law

**If you can't undo it, don't ship it yet.**

Every change is classified by rollback complexity before deploy, and every non-Simple change has a written rollback procedure that has been *tested* — not just imagined. Decide rollback before the incident, never during it: the minutes you'd spend designing an undo mid-incident are the minutes users are down.

## Step 1: Analyze the Deployment

List every change being deployed:

- **Code changes**: Which services, which endpoints, what behavior changes?
- **Schema changes**: New tables, columns, indexes, constraints, dropped columns?
- **Data migrations**: Backfills, transformations, deletes?
- **Configuration changes**: New env vars, feature flag states, infrastructure config?
- **Dependency updates**: Library upgrades, external service version changes?

For each change, ask: **If this change caused a production incident 30 minutes after deploy, what would rollback look like?**

## Step 2: Classify by Rollback Complexity

Assign each change a rollback complexity:

| Complexity | Definition | Examples |
|-----------|-----------|---------|
| **Simple** | Revert the code deploy, no other steps | Logic change, UI change, new feature behind a flag |
| **Coordinated** | Code revert + one other step | New env var (remove it), new index (drop it), additive column (leave it, no harm) |
| **Complex** | Requires data migration reversal or multi-step coordination | Column rename (requires data migration), data backfill (must un-backfill) |
| **Irreversible** | Cannot be fully undone | Destructive data operations, sent emails/notifications, external API calls with side effects |

**If any change is Irreversible**: explicitly document what partial rollback looks like and get sign-off before deploying.

See [references/rollback-patterns.md](references/rollback-patterns.md) for detailed patterns per component type.

## Step 3: Design the Rollback Procedure

For each non-Simple change, write the explicit rollback steps:

**Database schema rollback:**
- Additive columns (new nullable column): safe to leave after rollback — old code ignores them
- Non-additive changes (rename, type change, NOT NULL constraint): require a reverse migration
- Dropped columns: need to be re-added and re-populated (use `git bisect` to find the data state)

**Feature flag rollback:**
- Define the "off" state before deploying
- Test the "off" state in staging before deploying to production
- Know which percentage to roll back to if doing a canary rollout

**Data migration rollback:**
- Write the reverse migration before deploying the forward migration
- Test both on a copy of production data
- If the migration is too large to reverse quickly, plan for an emergency read-only mode instead

**Configuration rollback:**
- Document the previous value of every env var being changed
- For secrets rotation: keep the old secret valid for 24 hours after switching

## Step 4: Document and Test the Plan

Write the rollback plan in the deployment PR or deployment runbook:

```
Rollback Plan:
1. [Step]: [Command or action]
2. [Step]: [Command or action]
3. Verify: [How to confirm rollback succeeded]
Estimated rollback time: [X minutes]
Rollback owner: [Who executes this during an incident]
```

**Test it before you need it:**
- Run the rollback steps in staging before production deploy
- Confirm the rollback takes the expected time (important during incidents)
- Verify application health after rollback completes

Use [templates/rollback-plan.md](templates/rollback-plan.md) for the full plan format.

## Principles Applied

- **KISS**: Prefer feature flags over complex rollback procedures. The simplest rollback is turning a flag off.
- **YAGNI**: Don't deploy a change you can't roll back without a documented, tested plan. If you can't undo it, don't ship it yet.
- **Defense in depth**: Multiple rollback options (flag → revert → data migration reversal) provide fallbacks when the first option isn't enough.
- **Fail fast**: Define rollback triggers before deploying (see `deployment-checklist`). Waiting until an incident to decide when to rollback wastes critical time.

## Rationalizations to reject

| Excuse | Reality |
|--------|---------|
| "We'll figure out rollback if it breaks" | Designing rollback mid-incident wastes the minutes that matter most. |
| "The migration is reversible, trust me" | Reversible in theory ≠ tested. Run the reverse on production-sized data first. |
| "It's behind a flag, that's enough" | Only if the off-state was defined and tested before deploy. |
| "Rollback is unlikely, skip the plan" | A rollback plan is insurance — you write it before you need it, not after. |
| "Additive column, no rollback needed" | Confirm old code ignores it and document the no-op explicitly. |

## Red flags — stop and correct course

- An Irreversible change with no documented partial-rollback and no sign-off.
- A reverse migration that has never actually been executed.
- A feature flag whose off-state was never tested in staging.
- The estimated rollback time is unknown.

## Cross-Skill References

- `deployment-checklist` — run before every deploy; rollback plan is a required gate
- `incident-response` — execute the rollback plan when an incident occurs
- `configuration-strategy` — design feature flags as part of config strategy (reduces rollback complexity)
