---
name: browser-verification
description: "Verify a web app change by driving the real UI in a browser — reproduce the user flow end to end, watch console errors and network failures, exercise loading/error/empty states, capture screenshots as evidence. Use before claiming a UI change works. Triggers: check it in the browser, verify the UI, click through the flow, console errors, test it like a user, smoke test the frontend. Designing persistent test suites → test-suite-design; the generic done-gate → verification-before-completion (this is its browser-specific practice)."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Browser Verification

Prove a web change works by *being the user*, not by reading the diff. Passing
unit tests and a clean build say the code is consistent with itself — they say
nothing about the page actually rendering, the handler actually firing, or the
API call actually succeeding with real wiring. This skill is the
browser-specific practice of `verification-before-completion`: the claim "the
UI works" requires having driven the UI, in this session, with the evidence
captured. Boundary: `test-suite-design` builds *persistent* automated suites;
this skill is the verification pass you run on the change in front of you
(what it finds often becomes a suite case afterward).

## Workflow

### Step 1: Define the Flow That Proves the Change

Name the user-visible behavior the change promises ("submitting the form shows
the success toast and the new record appears in the list") and the shortest
real path to it. That flow — not "the page loads" — is what verification means.
Include what should *stop* happening for bug fixes (the old broken behavior,
reproduced first if possible).

### Step 2: Run the Real App in a Realistic State

Launch the actual stack the change ships in (dev server + backend + seeded
data), not a mental model of it. State matters: an empty database hides list
rendering bugs; a logged-out session hides authz redirects. Seed what the flow
needs — including a user in the right role.

### Step 3: Drive the Flow Like a User

Automate the drive with a browser tool (Playwright or the environment's
browser automation) or click it manually — but *interact*: navigate, type into
the fields, submit, wait for the response, observe the outcome. Prefer
selectors a user would recognize (roles, labels, text) over brittle internals.
Loading a URL and seeing HTTP 200 is not driving the flow — most UI bugs live
after first paint.

### Step 4: Watch All Three Evidence Channels

The page can *look* right while failing. During the drive, check:

- **Console** — errors and warnings that fired during the flow (a caught-and-
  swallowed error today is the un-reproducible bug report next week).
- **Network** — the requests the flow triggered: right endpoints, right
  payloads, right status codes; no 4xx/5xx, no CORS failures, no retry loops.
- **UI state** — the visible outcome: content correct, no layout collapse, no
  infinite spinner masquerading as "loading".

### Step 5: Exercise Beyond the Happy Path

The states users hit that developers don't: **error** (kill the backend or
force a 500 — does the UI degrade or white-screen?), **empty** (zero items),
**loading** (throttle and look — flicker? layout shift?), **repeat actions**
(double-submit, back button, refresh mid-flow), and at least one non-desktop
viewport if the change touches layout. Scope to what the change plausibly
affects — a copy tweak doesn't need the full matrix; a checkout-flow change
does. (`ui-ux-design` owns designing these states; this skill verifies them.)

### Step 6: Capture Evidence and Report Precisely

Screenshot the key outcomes (success state, plus anything broken), keep the
console/network findings, and report in evidence terms: "drove signup →
dashboard with a fresh user; form validates, POST /users returns 201, toast
renders, zero console errors — screenshot attached" beats "the UI works".
Anything found but not fixed is reported, not silently absorbed. If the flow
proved valuable to verify, feed it to `test-suite-design` as a candidate e2e
case so next time it verifies itself.

## Principles Applied

- **The rendered page is the truth**: code review and unit tests approximate
  it; only the browser confirms it.
- **Interaction over inspection**: most UI bugs are reachable only by doing
  what a user does, in order.
- **Evidence, not impressions**: a screenshot with zero console errors is a
  verification; "looked fine" is a mood.

## Cross-Skill References

- `verification-before-completion` — the generic evidence gate this skill
  instantiates for web UIs
- `test-suite-design` — turning one-off verification flows into persistent e2e coverage
- `ui-ux-design` — designing the loading/error/empty states verified here
- `accessibility-design` — the deeper a11y pass when the change touches
  interaction patterns
- `bug-investigating` — when verification finds something broken and the cause
  isn't obvious
