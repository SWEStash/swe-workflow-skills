---
name: dx-audit
description: "Audit and improve developer experience — inner-loop feedback (build/test/reload times), CI wait and queue times, flaky tests, local environment setup, onboarding time-to-first-PR, tooling friction, docs discoverability; produce a prioritized remediation plan. Triggers: developer experience, DX audit, devex, builds are slow, CI takes forever, flaky tests, onboarding takes weeks, tooling friction, developer productivity, engineers are frustrated. Code health/debt hotspots → technical-debt-review; designing one pipeline → cicd-pipeline."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# DX Audit

Find and fix the friction that taxes every engineer, every day. Developer
experience compounds: a 10-minute CI queue on a 20-person team burns weeks of
engineering time per month, and worse, it changes *behavior* — engineers batch
changes, skip test runs, and avoid touching areas with slow feedback.
Boundary: `technical-debt-review` audits the *code's* health; this skill audits
the *workflow around* the code — loops, tooling, environments, and onboarding.

## Workflow

### Step 1: Measure the Loops — Numbers Before Anecdotes

Quantify the feedback loops before collecting opinions, so the audit ranks by
data and the improvement is provable later:

- **Inner loop**: cold build, incremental build, single-test run, hot-reload —
  time them yourself in the actual repo.
- **Outer loop**: CI wall-clock (queue + run, from real recent pipelines), PR
  time-to-first-review and time-to-merge, deploy lead time (DORA overlap —
  `metrics-and-okrs`).
- **Flake rate**: retries and "re-run job" clicks per week; a 5%-flaky suite
  means engineers already ignore red.
- **Onboarding**: time from laptop to first merged PR for recent joiners.

### Step 2: Collect the Friction Log

Then ask the engineers — a lightweight survey or five 15-minute conversations:
"what wastes your time every day?", "what do you avoid doing because it's
painful?", "what would you fix first?". The second question matters most:
avoidance signals (never running the full suite locally, dreading a service's
local setup, batching deploys) reveal costs the timers can't see. Recurring
themes + Step-1 numbers = the finding list.

### Step 3: Audit the Inner Loop

The highest-frequency loop gets the deepest look: Is the dev environment
reproducible in one command (or is setup a wiki page of drift-prone steps)?
Can you run one test in seconds without the world? Does hot-reload actually
work? Is the IDE experience functional (types, go-to-def, lint-on-save)? Are
common tasks (reset DB, seed data, run service X) scripted or tribal
knowledge? Every manual step here multiplies by invocations-per-day.

### Step 4: Audit the Outer Loop

- **CI**: queue time vs run time (capacity vs speed problems differ), cache
  hit rates, test parallelization/sharding, whether PRs run only affected
  targets — delegate pipeline redesign to `cicd-pipeline`.
- **Flakes**: quarantine policy (a flaky test in the merge gate is a tax on
  everyone), ownership for fixing, `test-suite-design` for structural causes.
- **Review latency**: are PRs waiting on people or on process (required
  approvals, codeowner bottlenecks)?
- **Docs**: can an engineer answer "how do I X here?" without interrupting a
  senior — README freshness, runbooks, `project-documentation`.

### Step 5: Prioritize by Tax, Not by Annoyance

Score each finding as **time-cost × frequency × people affected** (daily
10-second cuts beat monthly 10-minute ones), weighted by behavior distortion
(anything that makes engineers *skip verification* is top-tier regardless of
seconds). Produce the remediation list: quick wins first (cache config, test
sharding, a `make dev` script) to build credibility, structural items
(environment overhaul, CI capacity) as scheduled work with owners.

### Step 6: Prove It and Keep It

Re-measure the Step-1 numbers after the fixes — DX work is uniquely easy to
verify, so verify it. Then keep the loop honest: track 2–3 DX metrics
continuously (CI p50/p95, flake rate, onboarding time), set a budget
("CI > 10 min is a defect"), and re-run the friction survey a couple of times
a year. DX decays by default — every new service adds setup steps and CI
minutes unless something pushes back.

## Principles Applied

- **Frequency beats magnitude**: optimize the loop that runs 50×/day before
  the one that runs weekly.
- **Avoidance is the loudest signal**: what engineers won't do reveals more
  than what they complain about.
- **Measured before and after**: a DX improvement that can't show the numbers
  moved is an opinion.

## Cross-Skill References

- `technical-debt-review` — the code-health complement to this workflow audit
- `cicd-pipeline` — redesigning the pipeline the audit flagged
- `test-suite-design` — structural fixes for slow or flaky suites
- `project-documentation` — the docs/onboarding gaps surfaced in Step 4
- `metrics-and-okrs` — DORA metrics and making DX goals measurable
- `retrospective` — mining recurring friction from team retros
