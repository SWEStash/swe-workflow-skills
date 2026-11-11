# Security Audit Report Template

```markdown
# Security Audit Report: [Project Name]

**Date**: [YYYY-MM-DD]
**Auditor**: [Name / Claude Code]
**Scope**: [What was reviewed — codebase, specific modules, infrastructure config]
**Commit**: [Git hash at time of audit]

## Executive Summary

[2-3 sentences: Overall security posture, number of findings by severity,
most critical issue found.]

**Finding Summary:**
| Severity | Count |
|----------|-------|
| Critical | [N] |
| High     | [N] |
| Medium   | [N] |
| Low      | [N] |

## Attack Surface

[Brief description of entry points, authentication boundaries, and data flows analyzed.]

## Findings

### [SEVERITY]-[NNN]: [Short Title]

**Severity**: Critical / High / Medium / Low
**Category**: [OWASP category, e.g., A03: Injection]
**Location**: `[file:line]` or `[endpoint]`

**Description:**
[What the vulnerability is.]

**Exploit Scenario:**
[How an attacker could exploit this. Be specific — show a curl command,
a malicious input, or a sequence of actions.]

**Evidence:**
```[language]
// The vulnerable code
```

**Remediation:**
<!-- Code for every finding, Medium and Low included, when the vulnerable code is in
     front of you. With no code, name the concrete change (library, setting, pattern)
     instead of stopping. -->
```[language]
// The fixed code
```

**Effort**: [Low / Medium / High]

---

[Repeat for each finding, ordered by severity]

## Recommendations Summary

### Immediate (fix before next deploy)
1. [Critical/High finding references]

### Short-term (fix within 1-2 sprints)
1. [Medium finding references]

### Long-term (address in roadmap)
1. [Low findings, architectural improvements]

## Out of Scope

[What was NOT reviewed and why — runtime testing, infrastructure, etc.]

## Next Steps

- [ ] Fix Critical and High findings
- [ ] Schedule follow-up audit after fixes
- [ ] Consider penetration testing for [specific areas]
```
