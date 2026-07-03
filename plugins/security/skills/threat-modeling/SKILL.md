---
name: threat-modeling
description: "Design-time security analysis of a system or feature before it's built — trust boundaries, attack surface, STRIDE per element, abuse cases, prioritized mitigations that become security requirements. Triggers: threat model, STRIDE, trust boundary, attack surface, what could go wrong security-wise, security design review, abuse case, secure this design, security requirements. Reviewing EXISTING code/config for vulnerabilities → security-audit; use this skill while the design is still on the whiteboard."
model: opus
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Threat Modeling

Find the security flaws while they're still cheap — in the design, before the
code exists. A missing authorization check found here is a requirement; found by
`security-audit` it's a rework ticket; found by an attacker it's an incident.
The frame is Shostack's four questions: **what are we building, what can go
wrong, what are we doing about it, did we do a good job?**

Boundary: this skill is proactive and design-time. Once code exists, verify it
against this model with `security-audit` — the two are complements, not
alternatives.

## Workflow

### Step 1: Model the System

Sketch a data-flow view of what's being built: components (processes, stores,
external services), the data flowing between them, and **classification** of
that data (what here is worth stealing or corrupting — credentials, PII,
payment data, tokens?). Then draw the **trust boundaries**: every place data
crosses a privilege, ownership, or network line — internet → load balancer,
app → database, user → admin, your service → a third party, webhook → your
endpoint. Threats cluster at these crossings; a model without explicit
boundaries finds only generic threats.

### Step 2: Enumerate the Attack Surface

List the entry points ranked by exposure — unauthenticated internet-facing
first, then authenticated user, then internal/partner, then admin. Name the
assets an attacker actually wants (from Step 1's classification) and the
realistic attackers: opportunist with a scanner, malicious or curious insider,
targeted attacker after your data specifically. Effort should follow exposure ×
asset value, not enumeration order.

### Step 3: STRIDE Each Boundary Crossing

Apply STRIDE **per element and boundary crossing**, not once globally — that's
what makes it systematic rather than a vibes checklist:

| Category | The question at each crossing |
|---|---|
| **S**poofing | Can the caller pretend to be someone/something else? |
| **T**ampering | Can data or code be modified in transit or at rest? |
| **R**epudiation | Could an actor deny an action with no way to prove it? |
| **I**nformation disclosure | Can data leak to someone unauthorized? |
| **D**enial of service | Can this element be exhausted or made unavailable? |
| **E**levation of privilege | Can a lower-privilege actor gain higher privilege? |

Per-category threat patterns and standard mitigations:
[references/stride-mitigations.md](references/stride-mitigations.md).

### Step 4: Write Abuse Cases

For each key user story, write the attacker's version: "As a malicious user, I
can share a link that grants more than I have", "As a former employee, I can
still call the API with my cached token." Abuse cases catch the logic-level
threats STRIDE's element-by-element pass misses — especially authorization
logic, workflow bypasses, and quota/limit abuse.

### Step 5: Rank and Decide

Score each threat roughly by likelihood × impact — precision theater (long
DREAD decimals) wastes the room's time; high/medium/low is enough to order the
work. For each threat, record an explicit decision: **mitigate** (name the
control), **eliminate** (remove the feature/flow), **transfer** (vendor,
insurance), or **accept** (documented, with an owner — silent acceptance is the
only wrong answer). Mitigations become **security requirements with acceptance
criteria** — feed them into `feature-planning` so they ship with the feature
instead of after it.

### Step 6: Validate and Keep It Alive

Check coverage: every trust boundary STRIDE'd, every entry point owned, every
threat decided. Then treat the model as living documentation — revisit when the
architecture changes (new integration, new entry point, new data class), and
hand it to `security-audit` as the checklist when the built system gets
reviewed.

## Principles Applied

- **Threats cluster at trust boundaries** — model the boundaries first and the
  threats enumerate themselves; skip them and you get a generic list.
- **A decision per threat, even "accept"** — an undocumented accepted risk is
  indistinguishable from an unnoticed one.
- **KISS on scoring**: rank to order the work, not to defend the numbers.

## Cross-Skill References

- `security-audit` — reactive review of the *built* system; consumes this model
- `architecture-design` — record structural security decisions as ADRs
- `api-design` — authn/authz contracts for the boundaries identified here
- `data-modeling` — where the classified data actually lives
- `configuration-strategy` — secrets handling for the credentials in the model
- `feature-planning` — turns the mitigations into scheduled, testable tasks
