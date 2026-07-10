---
name: compliance-privacy
description: "Engineer for regulatory and privacy obligations — GDPR/CCPA privacy-by-design, PII data mapping and minimization, retention and deletion (right to erasure), data subject requests, consent, SOC 2 controls (access, change management, audit logging). Triggers: GDPR, CCPA, SOC 2, HIPAA, compliance, privacy review, PII, personal data, data retention, right to be forgotten, DSR, audit requirements, are we compliant. Vulnerabilities in code → security-audit; attack analysis of a design → threat-modeling."
allowed-tools: Read, Grep, Glob, Write, Edit, WebFetch, WebSearch
---

# Compliance & Privacy Engineering

Turn regulatory obligations into engineering requirements — before an auditor,
a regulator, or a deletion request does it for you. This skill covers the
*engineering* of compliance (what to build and how); it is not legal advice, and
material decisions (lawful basis, DPAs, breach notification) need counsel —
flag them explicitly rather than silently deciding. Boundary with its siblings:
`security-audit` finds technical vulnerabilities, `threat-modeling` analyzes
attacker paths in a design; this skill handles what regulations *oblige* you to
do with data regardless of attackers.

## Workflow

### Step 1: Map the Data — You Can't Comply with What You Can't Find

Build the data inventory first; every obligation hangs off it:

- **What personal data exists** — direct identifiers (name, email, phone),
  indirect (IP, device IDs, location), sensitive categories (health, biometrics,
  children's data — these carry stricter rules).
- **Where it lives** — every store, including the ones people forget: logs,
  analytics, backups, data warehouses, third-party processors, caches, error
  trackers.
- **Where it flows** — which services touch it, which vendors receive it
  (each is a processor needing a DPA), and whether it crosses borders.

Grep the codebase and schemas for it; the inventory that only reflects the
architecture diagram misses the PII in logs and analytics events.

### Step 2: Determine What Applies

Which regimes govern you follows from the data and the users, not the company's
location: EU/UK users → GDPR/UK-GDPR; California residents → CCPA/CPRA; health
data in the US → HIPAA; card data → PCI-DSS; enterprise customers asking for
audits → SOC 2. Verify specifics against current official sources — regulations
and thresholds change; don't answer from memory. Then extract the engineering
obligations (see [references/obligations-map.md](references/obligations-map.md)
for the regulation → engineering-requirement mapping).

### Step 3: Design for Minimization and Purpose

The cheapest data to protect is data you don't have:

- **Collect less**: challenge every field — what breaks if we don't collect it?
- **Retain less**: every data class gets a retention period and an *automated*
  deletion path; "keep forever by default" is a finding, not a policy.
- **Expose less**: pseudonymize/tokenize where full identity isn't needed
  (analytics, testing — see `test-data-strategy` for GDPR-safe test data);
  scope access per purpose.
- **Log less**: PII in logs inherits none of your database's controls and all
  of its obligations — scrub at the logging layer, not in post-processing.

### Step 4: Build the Rights Machinery

Data-subject rights are engineering features with deadlines (typically ~30
days), not support tickets to improvise:

- **Access/export**: produce all of a person's data across every Step-1 store.
- **Deletion**: erase or anonymize across primary stores, caches, search
  indexes, analytics, and a documented stance on backups (usually: excluded
  from immediate erasure, purged on backup expiry — state it in the policy).
  Deletion that misses a store the inventory forgot is the classic failure.
- **Consent**: record what was consented to, when, and which version; make
  withdrawal as easy as granting; gate the relevant processing on it.

Test the deletion path like a feature — run it against a seeded user and verify
every store — because the first real request is a terrible time to discover it
doesn't work.

### Step 5: Implement the Control Layer (SOC 2 lens)

The controls auditors verify are mostly good engineering hygiene made
demonstrable: least-privilege access with a review cadence, change management
(PRs + reviews + CI — which you likely have; the gap is usually *evidence*),
append-only audit logging of sensitive-data access and admin actions
(overlaps `threat-modeling`'s repudiation counters), encryption in transit and
at rest, offboarding that provably revokes access, and vendor review for every
processor in the Step-1 flow map. Wire evidence collection into the systems
themselves — screenshots gathered the week before an audit don't scale.

### Step 6: Make It Continuous

Compliance decays with every feature that adds a data flow. Add a lightweight
privacy check to the definition of done for features touching personal data
(new data collected? new vendor? retention set? deletion path covers it?), keep
the data inventory in version control next to the code, and re-run the Step-1
mapping when architecture changes — same living-document discipline as a threat
model.

## Principles Applied

- **Minimization is the master control**: every other obligation scales with
  how much data you hold.
- **Rights are features**: access, deletion, and consent need designs, tests,
  and deadlines — not runbooks of manual SQL.
- **Evidence or it didn't happen**: an undocumented control fails the audit
  even when it works.

## Cross-Skill References

- `security-audit` — technical vulnerability review (confidentiality controls overlap)
- `threat-modeling` — design-time attack analysis; shares the data-classification step
- `data-modeling` — schema-level retention, soft-delete vs erasure, PII isolation
- `test-data-strategy` — GDPR-safe test data, anonymization
- `configuration-strategy` — secrets and access to production data
- `observability-design` — keeping PII out of logs, traces, and metrics
