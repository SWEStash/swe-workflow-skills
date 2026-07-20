# Technical Debt Audit

**Codebase / Service**: [Name]
**Date**: [DATE]
**Reviewed by**: [Name(s)]
**Review scope**: [Whole codebase / specific module / specific time period]

---

## Executive Summary

[2-3 sentences: overall health assessment and top priority]

**Overall health**: [Green / Yellow / Red]
- Green: Debt is manageable, team moves at full speed
- Yellow: Debt is noticeable, slowing sprint velocity
- Red: Debt is critical, actively blocking features or causing incidents

---

## Hotspots

| File / Module | Debt types | Severity | Churn (last 90d) | Notes |
|---------------|-----------|---------|-----------------|-------|
| [path/to/file] | Complexity, Test | High | 23 changes | God class with 800 lines |
| | | | | |

---

## Debt Inventory

Every inventoried item cites evidence (`path:line-range`) and carries a confidence level — Low confidence means "what would confirm this" is stated in the description, not that the claim is asserted anyway.

### Critical — Address Immediately

| Item | Type | Evidence (path:line) | Description | Confidence | Risk of fix | Effort |
|------|------|---------------------|-------------|------------|-------------|--------|
| | | | | | | |

### High — Schedule This Quarter

| Item | Type | Evidence (path:line) | Description | Confidence | Risk of fix | Effort | Prerequisite |
|------|------|---------------------|-------------|------------|-------------|--------|-------------|
| | | | | | | | |

### Medium — Address Opportunistically

| Item | Type | Evidence (path:line) | Description | Confidence |
|------|------|---------------------|-------------|------------|
| | | | | |

### Accepted Debt — Won't Address

| Item | Reason for accepting |
|------|---------------------|
| | |

### Explicitly Not Flagged

Items considered and deliberately not flagged — proves the audit was discerning and prevents re-litigating.

| Item considered | Why it survived scrutiny |
|-----------------|--------------------------|
| | |

---

## Remediation Roadmap

### This Sprint (Quick Wins)
- [ ] [Item]: [Owner] — est. [X hours]
- [ ] [Item]: [Owner] — est. [X hours]

### Next Quarter
- [ ] [Item]: requires [prerequisite]. est. [X weeks]. Owner: [Name]
- [ ] [Item]: requires [prerequisite]. est. [X weeks]. Owner: [Name]

### Strategic Investment (requires planning)
- [Item]: est. [X months]. Needs: [team buy-in / dedicated sprint / architecture design]

---

## Metrics to Track Progress

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Test coverage (critical paths) | [X%] | [Y%] | [How measured] |
| Average function length (hotspot files) | [X lines] | [Y lines] | [How measured] |
| Bug rate from [module] | [X/month] | [Y/month] | [How measured] |

---

## Method Log

- **Passes run**: [map / static sweep / file-by-file / cross-file / history]
- **Tools and commands**: [e.g. `npx depcheck`, linter, coverage — with observed output; "not available" if a tool couldn't run — never fabricated]
- **Not covered → blind spots**: [unreadable files, skipped dirs, missing test env]

---

## Open Questions

[Judgment calls that need user input — e.g. which subsystem matters most, unknown team pain points. Never guessed silently.]

---

## Next Review Date

[Date — typically 1 quarter from now]
