---
name: code-archaeology
description: "Understand unfamiliar or legacy code before changing it — map entry points, mine git history (blame, churn, log -S), trace data flow, recover the why behind odd code, pin current behavior with characterization tests, find seams for safe change. Triggers: understand this codebase, legacy code, inherited this project, what does this code do, why is it written this way, nobody knows how this works, onboard to this repo, is it safe to change this. Prioritizing debt → technical-debt-review; improving code you already understand → refactoring."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Code Archaeology

Build a working model of code nobody fully understands — *before* changing it.
The cardinal rule: **the code is the way it is for reasons; find them before
overriding them.** Chesterton's fence applies — weird code is usually a bug fix
whose bug report is lost, and "cleaning it up" reintroduces the bug. Boundary
with siblings: `technical-debt-review` assesses and prioritizes what to fix;
`refactoring` improves code you already understand; this skill produces the
understanding both depend on.

## Workflow

### Step 1: Survey Before Digging

Get the shape of the territory without reading line-by-line: entry points
(main, routes, handlers, cron, consumers), the dependency skeleton (what are
the load-bearing modules — imported by everything), build/run/test commands
(does the test suite even pass? that's data), and the directory map with sizes.
Resist starting at file one and reading forward — comprehension follows the
call graph, not the alphabet.

### Step 2: Mine the History — the Code's Memory

Git knows what the docs forgot. The high-yield digs:

- `git log --follow -p -- <file>` — a file's life story; the commit that
  introduced the odd code usually says why (and links a ticket).
- `git log -S '<string>'` (pickaxe) — when a magic value or weird guard
  appeared, and what else changed with it.
- **Churn analysis** — files with the most commits are the active organs
  (`git log --format= --name-only | sort | uniq -c | sort -rn | head`);
  high-churn + large = where understanding pays most (same hotspot logic as
  `technical-debt-review`).
- `git blame -w -C` (ignore whitespace, follow copies) — who last touched this
  line *and in what commit context*; blame the commit, then read its message
  and siblings.
- Merge/PR references in messages — the review thread often holds the design
  discussion that never made it into the code.

### Step 3: Trace, Don't Guess

For the specific behavior you need to understand, follow the data: pick one
concrete input (a request, an event, a row) and trace it end to end — through
handlers, transformations, side effects, and persistence. Use the debugger or
strategic log statements over static reading when the control flow is dynamic
(dispatch tables, DI containers, metaprogramming). Write the trace down as you
go; a data-flow narrative ("the order enters here, gets enriched here, forks
here") is worth ten class diagrams.

### Step 4: Interrogate the Oddities

For each "why on earth" you hit, run the checklist before concluding it's
senseless: What does history say (Step 2)? Does a test encode it as intended
behavior? Do comments/tickets/ADRs reference it? Does production data depend on
it (that dead-looking branch may handle the 2019 records)? Only after all four
come up empty may you *suspect* it's vestigial — and even then you prove it
(logging/telemetry on the branch) rather than assume it.

### Step 5: Pin Behavior with Characterization Tests

Before changing anything you don't fully understand, write tests that capture
what the code **currently does** — not what it should do. Feed it
representative inputs (including the weird ones from production), assert the
observed outputs, and lock in today's behavior as the baseline. These tests
are your tripwire: if a "safe cleanup" changes an output, you learn it in CI,
not in production. Golden-master/snapshot testing works well when outputs are
large or numerous. (For designing the suite around them long-term:
`test-suite-design`.)

### Step 6: Leave the Map Better Than You Found It

Record what you learned where the next archaeologist will find it: a short
architecture note or README-in-the-directory (the data-flow narrative from
Step 3, the load-bearing oddities from Step 4 and *why they exist*), backfilled
ADRs for the big recovered decisions (`architecture-design`), and comments only
on the genuinely non-obvious constraints. Then, with understanding and
characterization tests in place, changes proceed via `refactoring` (seams,
safe transformations) or `dependency-impact-analysis` (blast radius) as normal.

## Principles Applied

- **Chesterton's fence**: understand why the fence is there before removing
  it; lost context is not absent context.
- **Evidence over inference**: history, traces, and tests beat reading-and-
  guessing — the code's actual behavior outranks anyone's model of it.
- **Capture as you go**: understanding that lives in one head (or one session)
  is re-excavated at full cost next time.

## Cross-Skill References

- `technical-debt-review` — assess and prioritize what to fix once understood
- `refactoring` — the safe-change patterns applied after comprehension
- `test-suite-design` — growing characterization tests into a real suite
- `dependency-impact-analysis` — blast radius before changing a shared piece
- `architecture-documentation` — recording the recovered architecture (C4, flows)
- `bug-investigating` — when the goal narrows to one specific misbehavior
