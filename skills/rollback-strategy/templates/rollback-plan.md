# Rollback Plan

**Deployment**: [PR/ticket/description]
**Date**: [DATE]
**Author**: [Name]
**Rollback owner**: [Who executes this if needed]

---

## Changes Being Deployed

| Component | Change | Rollback complexity |
|-----------|--------|---------------------|
| [Service/component] | [Description] | Simple / Coordinated / Complex / Irreversible |

---

## Rollback Triggers

Roll back immediately if any of the following occur within [30/60] minutes of deployment:

- Error rate exceeds [X%]
- [Specific metric] drops below [threshold]
- [Specific alert fires]
- [Other trigger]

---

## Rollback Procedure

**Estimated rollback time**: [X minutes]

### Step 1: [First action]
```
[Command or instructions]
```

### Step 2: [Second action]
```
[Command or instructions]
```

### Step 3: Verify rollback succeeded
- [ ] [Check 1]: [How to verify]
- [ ] [Check 2]: [How to verify]
- [ ] Error rate returned to baseline
- [ ] Application health checks passing

---

## Irreversible Changes

*If any changes above are marked Irreversible, document them here and what partial rollback looks like:*

[Description of what cannot be undone and how to mitigate]

---

## Rollback Test Results

- [ ] Rollback procedure tested in staging on [DATE]
- [ ] Rollback completed in [X minutes] during test
- [ ] Application was healthy after test rollback

---

## Notes

[Any additional context, warnings, or dependencies for the rollback executor]
