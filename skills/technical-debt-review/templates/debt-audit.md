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

### Critical — Address Immediately

| Item | Type | Location | Description | Effort |
|------|------|---------|-------------|--------|
| | | | | |

### High — Schedule This Quarter

| Item | Type | Location | Description | Effort | Prerequisite |
|------|------|---------|-------------|--------|-------------|
| | | | | | |

### Medium — Address Opportunistically

| Item | Type | Location | Description |
|------|------|---------|-------------|
| | | | |

### Accepted Debt — Won't Address

| Item | Reason for accepting |
|------|---------------------|
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

## Next Review Date

[Date — typically 1 quarter from now]
