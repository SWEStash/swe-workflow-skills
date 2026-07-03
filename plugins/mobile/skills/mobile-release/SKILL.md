---
name: mobile-release
description: "Ship mobile apps through the app stores — signing and provisioning, store review and rejection handling, phased/staged rollouts with halt criteria, crash monitoring, versioning and build numbers, beta channels (TestFlight, Play tracks), forced updates, and the no-instant-rollback reality of mobile. Triggers: app store release, publish to App Store, Play Store, TestFlight, staged rollout, app review rejected, code signing, provisioning profile, mobile release, hotfix a mobile bug. General semver/registry/library publishing → release-management."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash, WebFetch, WebSearch
---

# Mobile Release

Ship through a channel you don't control, to a fleet you can't roll back. Two
facts shape everything here: a **review queue** (hours to days, with rejection
risk) sits between you and users, and **there is no rollback** — once a version
is on devices, you can only ship *forward* through that same queue. Mobile
release engineering is the discipline of making those two facts survivable.
Boundary: `release-management` owns general versioning/changelog/registry
publishing (libraries, services); this skill owns the store-mediated path.

## Workflow

### Step 1: Set Up the Release Machinery (once, before it's urgent)

- **Signing**: certificates/keystores are crown jewels — store them in a
  secrets manager, wire CI signing (fastlane match-style or the platform's
  cloud signing), and document recovery; a lost Android upload key is a
  support-ticket saga. Verify current store requirements live — both stores
  change policies frequently.
- **Versioning**: user-facing version (marketing semver) + **monotonically
  increasing build number** per store upload; automate both in CI — manual
  build-number bumps end in rejected uploads.
- **Channels**: internal build on every merge → beta (TestFlight / Play
  tracks) on a cadence → production. Beta users are your only pre-review
  real-device signal; keep the channel alive, not ceremonial.
- **Compliance surfaces**: privacy manifests / data-safety forms and
  permission justifications — stale ones are a top rejection cause; update
  them *with* the feature that changes data use (`compliance-privacy` for
  what the answers should be).

### Step 2: Gate the Candidate Before Submission

The verification gate scales with the no-rollback stakes: release-build (not
debug) smoke test on real devices — oldest supported OS included; crash-free
sessions from the beta channel as a numeric gate; a store-guideline self-review
for the flagged categories (payments outside IAP, background location, broken
links, login for reviewers via a demo account); and screenshots/metadata that
match the build. Submitting is a claim the app works —
`verification-before-completion` applies with a review queue as the penalty
for guessing.

### Step 3: Submit with Review Risk Managed

Expect rejection as a normal outcome, not a crisis: submit *ahead* of any date
commitment (never promise a release date you don't control), respond to
rejections factually and fast (argue via the resolution center only when the
reviewer misunderstood; fix and resubmit when they didn't), and keep an
expedited-review request in reserve for genuine emergencies — it's a favor,
not a pipeline stage.

### Step 4: Roll Out Staged, Watch, Be Ready to Halt

Never release to 100% at once. Phased release (iOS) / staged rollout (Play):
start at a low percentage, define **halt criteria numerically before
starting** (crash-free rate below threshold, error spike on key flows, vitals
regression), watch crash reporting and analytics at each step, and expand only
when the numbers hold. Halting stops *new* users from getting the bad version
— everyone who already updated keeps it. That asymmetry is why the percentages
start small.

### Step 5: When It's Bad Anyway — the Forward-Only Playbook

The rollback conversation, mobile edition, in order of speed:

1. **Remote config / feature flag off** — seconds, if the feature shipped
   behind one (this is why `mobile-architecture` insists on kill-switches for
   risky features; a flag is the only instant rollback mobile has).
2. **Server-side fix** — when the defect is reachable from the backend.
3. **Halt the rollout** — caps the blast radius at the current percentage.
4. **Hotfix build** — minimal diff, through the beta gate fast, expedited
   review if justified, staged again (a rushed hotfix that crashes is the
   same problem twice).
5. **Forced update** — the minimum-version mechanism, for security or
   data-corruption cases; user-hostile, so it's the last resort — and it only
   exists if it shipped in an *earlier* version.

### Step 6: Close the Loop

Tag the release, keep the changelog honest (`release-management` conventions),
record rollout metrics (time-in-review, crash-free at each stage, halt
events), and feed rejections and halts into the Step-1/2 machinery — every
rejection is a checklist item you were missing; every halt is a gate the beta
channel should have caught. A `retrospective` after any halted rollout.

## Principles Applied

- **Forward-only**: every mitigation is a faster way forward — flags, server
  fixes, hotfixes — never a way back. Ship accordingly.
- **The gate scales with irreversibility**: a web deploy can YOLO and revert;
  a store build cannot — beta soak and real-device checks are the price.
- **Don't promise the queue**: review time is a distribution, not an SLA;
  date commitments belong after approval, not before submission.

## Cross-Skill References

- `release-management` — general release discipline this skill specializes
- `mobile-architecture` — the flags/remote-config and forced-update machinery
  this playbook depends on
- `deployment-checklist` — the backend half of a coordinated app+API release
- `compliance-privacy` — privacy manifests, data-safety forms, permission text
- `incident-response` — when a shipped defect becomes a production incident
- `retrospective` — after rejections, halts, and hotfix scrambles
