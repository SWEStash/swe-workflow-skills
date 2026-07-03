# Regulation → Engineering Obligation Map

What each regime actually demands from the engineering side. Verify thresholds
and details against current official sources before relying on them — this map
orients; it doesn't replace the regulation text or counsel.

## GDPR / UK-GDPR (EU/UK personal data)

| Obligation | Engineering requirement |
|---|---|
| Lawful basis per processing purpose (Art. 6) | Record which basis covers each data flow; consent flows need capture + withdrawal machinery |
| Data minimization & purpose limitation (Art. 5) | Field-level justification; no reuse of data for new purposes without a new basis |
| Right of access / portability (Art. 15, 20) | Export of all of a subject's data, machine-readable, across every store |
| Right to erasure (Art. 17) | Deletion/anonymization across primary stores, caches, indexes, analytics; documented backup stance |
| Privacy by design & default (Art. 25) | Privacy review in the feature workflow; most-protective defaults |
| Records of processing (Art. 30) | The data inventory (SKILL.md Step 1), kept current |
| Security of processing (Art. 32) | Encryption in transit/at rest, access control, pseudonymization where feasible |
| Breach notification (Art. 33) | Detection + escalation path that can meet 72-hour notification — needs `observability-design`-grade alerting |
| Processors & transfers (Art. 28, Ch. V) | DPA with every vendor receiving personal data; transfer mechanism (SCCs/adequacy) for cross-border flows |
| DPIA for high-risk processing (Art. 35) | Formal assessment before launching high-risk features (large-scale profiling, sensitive categories) — pairs with `threat-modeling` |

## CCPA / CPRA (California residents)

Similar rights machinery to GDPR (know/access, delete, correct) plus two deltas
worth engineering attention: **opt-out of sale/sharing** (honor Global Privacy
Control signals; maintain a "Do Not Sell or Share" path) and **service-provider
contracts** (the CCPA analog of DPAs). Thresholds determine applicability
(revenue / volume of consumers' data / share of revenue from selling data) —
check current numbers.

## SOC 2 (Trust Services Criteria — what enterprise customers ask for)

SOC 2 is an audit of *your controls operating over time* (Type II), not a
checklist you pass once. The Security criterion (always in scope):

| Control area | Typical evidence engineering owns |
|---|---|
| Logical access | SSO/MFA, least-privilege roles, quarterly access reviews, provably-executed offboarding |
| Change management | PR review required on protected branches, CI gates, deploy audit trail |
| System operations | Monitoring/alerting, incident-response process with records (`incident-response`, `observability-design`) |
| Risk & vendor management | Vendor list with security review per processor; risk assessment cadence |
| Data handling | Encryption at rest/in transit, backup + restore testing (`resilience-engineering`), retention/disposal execution |

Availability, Confidentiality, Processing Integrity, and Privacy criteria are
opt-in scope — add them when customers demand them, not preemptively.

## HIPAA (US health data)

Applies to covered entities and their **business associates** (a BAA makes you
one). Engineering core: PHI inventory and isolation, access controls + audit
logs on every PHI touch, encryption, minimum-necessary access, breach
notification machinery. PHI in logs/analytics is the recurring violation.

## PCI-DSS (card data)

The dominant engineering decision is **scope reduction**: use a tokenizing
payment processor (Stripe/Adyen-style) so raw PANs never transit your systems —
this collapses most requirements to the lowest self-assessment tier. Storing
raw card data puts your whole environment in scope; treat that as a
`build-vs-buy` decision with a strong buy bias.

## Choosing what to tackle first

1. Data inventory (everything depends on it).
2. Kill the involuntary violations: PII in logs, forever-retention, missing
   deletion path.
3. Rights machinery (access + deletion) — deadline-bound once requests arrive.
4. Evidence automation for the controls you already operate.
5. Formal frameworks (SOC 2 audit, DPIAs) when customers or scale demand.
