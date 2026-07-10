---
name: build-vs-buy
description: "Decide whether to build in-house, buy a vendor/SaaS product, or adopt OSS — core-vs-commodity framing, multi-year total cost of ownership, integration and maintenance burden, vendor viability, lock-in and exit costs. Triggers: build vs buy, build or buy, vendor evaluation, SaaS vs in-house, should we adopt this open source, TCO, total cost of ownership, lock-in, exit cost, make or buy, off the shelf. Internal-structure decisions (patterns, service boundaries, ADRs for your own code) → architecture-design."
allowed-tools: Read, Grep, Glob, Write, Edit, WebFetch, WebSearch
---

# Build vs Buy

Make the build/buy/adopt decision on total cost and strategic fit, not on
whichever option the room already favors. The two systematic errors this skill
exists to counter: engineers underestimate the *ongoing* cost of building
(maintenance routinely exceeds the initial build within a few years), and
everyone underestimates the *exit* cost of buying (discovered only when
leaving). Boundary: this skill decides whether the capability comes from
outside; how you structure your own code is `architecture-design`'s ADR
territory, and vetting an individual library is `dependency-management`.

## Workflow

### Step 1: Frame the Capability — Core or Commodity?

Name the capability precisely, then ask the question that dominates the whole
decision: **does doing this better than anyone else win you customers?** If yes
(core differentiator), building earns strategic control; if it's commodity
plumbing (auth, feature flags, payments, analytics infra, CRUD admin), every
engineer-month spent building it is a month not spent on what differentiates
you. Then split requirements into *must-have* and *nice-to-have* — a vendor
covering 90% of must-haves usually beats a build covering 100% of a wishlist.

### Step 2: Inventory the Real Options

There are usually more than two:

- **Build** in-house
- **Buy** a vendor/SaaS product
- **Adopt** OSS self-hosted (you're not buying — you're taking an operations job)
- **Hybrid** — buy/adopt the commodity core, build the thin differentiating layer
- **Defer** — do nothing yet; a legitimate option when the need is unproven

Verify current facts (pricing, licensing, maintenance status) with live sources
— vendor pricing pages and OSS repos, not memory.

### Step 3: TCO Over 3 Years — Not the Sticker Price

Cost each finalist over a 3-year horizon; year-1 comparisons systematically
favor building (the build cost is visible, the ownership cost isn't):

- **Build**: initial engineering + **ongoing ownership** (maintenance, on-call,
  security patching, feature parity as needs grow — commonly comparable to the
  initial build per year for actively-used systems) + **opportunity cost** (what
  those engineers would otherwise ship — usually the largest and least-counted line).
- **Buy**: subscription *at projected usage*, not today's (model the pricing
  curve at 3× growth — usage-based pricing is where vendors recover their
  discounts) + integration + admin.
- **Adopt (OSS)**: hosting + operations + upgrades + security response + the
  expertise to run it; "free" describes the license, not the ownership.
- **Everyone forgets**: migration of existing data/flows, training, compliance
  and security review, vendor management overhead.

### Step 4: Risk — Lock-in, Exit, and Viability

Write the **exit plan now**, while you have leverage — the exit cost you can't
estimate is the one that traps you:

- What does leaving take? Data export (format? completeness? egress fees?),
  proprietary APIs/features you'd re-implement, contract terms (lock-in period,
  auto-renewal, price-increase caps).
- **Vendor viability**: funding/profitability, roadmap alignment, acquisition
  risk, what happens to your data if they fold.
- **OSS health**: maintainer bus factor, release cadence, CVE responsiveness,
  license (copyleft implications, and watch relicensing-to-source-available
  history in the space) — delegate a deep package-level check to `dependency-management`.
- **Build risk** is real too: key-person dependency, and the "internal vendor"
  failure mode — a team obligated to maintain a product nobody funds.

### Step 5: Decide and Record

Score the finalists in a weighted matrix — criteria and weights fixed *before*
scoring (after, the matrix just rationalizes the favorite). State a clear
recommendation with the dominant reasons, name the runner-up and what would
have flipped the decision, and set a **revisit trigger** ("revisit if usage
exceeds X / pricing changes >Y% / the maintainer goes dark"). Record it like an
ADR — decision, context, alternatives, consequences — so the next team
understands *why*, not just *what*.

### Step 6: De-risk Before Committing

For close calls or large commitments, run a time-boxed pilot against your top
must-haves and your real data volumes before signing multi-year terms or
staffing a build. A two-week PoC is the cheapest insurance in this workflow —
and pilot the *exit* too (run the data export once and look at what comes out).

## Principles Applied

- **Commodity → buy bias; differentiator → build bias** — most wrong decisions
  invert this because building is more fun than integrating.
- **Compare TCO, not sticker price** — the build's cost is mostly after launch;
  the vendor's is mostly at renewal and exit.
- **A decision without a revisit trigger is dogma** — pricing, vendors, and
  your scale all change.

## Cross-Skill References

- `architecture-design` — internal-structure decisions and the ADR format
- `dependency-management` — deep evaluation of a specific library/package
- `project-proposal` — wrap the decision in a business case for approval
- `effort-estimation` — sizing the build option honestly
- `strategic-review` — when the decision touches positioning or the moat
