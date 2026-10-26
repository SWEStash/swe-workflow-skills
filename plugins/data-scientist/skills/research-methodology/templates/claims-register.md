# Claims Register Template

Every number or finding that may be quoted outside the project (thesis, report,
funding request) gets a row. Save as `docs/claims.md`.

```markdown
# Claims

A claim may be quoted only at its status. Provisional claims are quoted with
their caveat or not at all.

| ID | Claim, in words | Scope (area, population, product, period) | Evidence (experiment, commit, data version) | Checks done | Status |
|---|---|---|---|---|---|
| C-001 | [e.g. "Open Buildings matched 62% of surveyed households (95% CI …)"] | [surveyed parajes, department X, survey 2019–2023] | [A01, abc1234, data v3] | [EDA AE01; n per group; CI method] | Supported |
| C-002 | [e.g. "Detection is lower for straw-and-mud roofs"] | | | [missing: roof-class counts, instrument validity, confounders] | Provisional |

Status values: **Provisional** (measured, checks incomplete) · **Supported**
(checks done) · **Withdrawn** (with the reason and date).
```
