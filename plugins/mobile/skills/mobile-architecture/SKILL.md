---
name: mobile-architecture
description: "Design mobile app architecture — native (Swift/Kotlin) vs cross-platform (React Native/Flutter) selection, navigation and deep linking, state management, offline-first design and data sync, local persistence, push notifications, platform constraints (background work, battery, permissions). Triggers: mobile app architecture, iOS app, Android app, React Native or Flutter, offline first, data sync, mobile state management, deep linking, push notifications, app structure. Web SPA component architecture → frontend-architecture."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Mobile Architecture

Design mobile apps around the constraints that make mobile different: the
network is intermittent, the OS kills your process whenever it likes, every
release rides a store review you don't control, and yesterday's version keeps
running on users' devices for months. Web assumptions imported unexamined
(always-online, instant deploys, one running version) are where mobile
architectures go wrong. Boundary: `frontend-architecture` owns web SPA
component architecture; this skill owns apps that ship through app stores
(shipping them: `mobile-release`).

## Workflow

### Step 1: Platform Strategy — the Costly-to-Reverse Decision

Native (Swift/Kotlin), cross-platform (React Native/Flutter), or web-wrapper —
decide from the actual drivers, not fashion: team skills (a JS team ships RN
months before it ships Swift), how deep the platform integration runs (heavy
camera/AR/background/widgets favor native), performance sensitivity, and how
much UI must feel platform-native vs brand-consistent. Cross-platform halves
the codebase, not the work — platform-specific edges remain. Record it as an
ADR (`architecture-design`) with the revisit trigger; migrating later is a
rewrite.

### Step 2: Structure and Navigation

Define the navigation graph early — mobile UI *is* navigation (stacks, tabs,
modals), and retrofitting it hurts. Design **deep links from day one**: every
important screen gets an addressable route (push notifications, marketing
links, and OS integrations all need them, and bolting them onto a
navigation-by-reference architecture later is painful). Modularize by feature,
with UI / domain / data layers inside each feature — build-time and ownership
both benefit.

### Step 3: State and Data Layer

Unidirectional data flow (whatever the platform flavor calls it) keeps
lifecycle chaos manageable — the OS destroys and recreates screens, so state
must live above the view and **survive process death** (persist what matters;
assume any screen can be killed and restored). Put a repository layer between
UI and data sources so the UI never knows whether data came from cache,
database, or network — that boundary is where Step 4 lives.

### Step 4: Offline and Sync — Decide, Don't Drift

The defining mobile decision. Choose explicitly per data domain:

- **Online-only** (honest spinner + clear offline messaging) — legitimate for
  real-time-only products; cheap; feels broken on the subway.
- **Read cache** — local store serves last-known data, network refreshes;
  right default for content/consumption apps.
- **Offline-first** — the local database is the source of truth the UI reads;
  mutations queue and sync in the background. Best UX, and it buys you a
  hard problem: **conflict resolution** (last-write-wins per field, merge
  rules, or surface-to-user — pick per data type *before* building the sync).

Queued mutations need idempotency keys (retries will happen) and visible
pending-state in the UI. Sync in delta batches, not full dumps — battery and
data plans are real constraints.

### Step 5: Platform Integration Realities

- **Push notifications**: design the token lifecycle and what each
  notification deep-links to; push is delivery-best-effort, never the only
  path to data.
- **Background work**: both OSes ruthlessly limit it — design sync to make
  progress in short foreground windows, treat background execution as a bonus.
- **Permissions**: ask in context with a pre-prompt explaining why (a denied
  permission is sticky and costly to win back).
- **Secrets & storage**: tokens in Keychain/Keystore, never in plain
  preferences; the device is an untrusted environment (`threat-modeling` when
  the data warrants it).

### Step 6: Design for the Fleet You Can't Update

Users run old versions for months, so: **version your API contracts** with
tolerance for old clients (`api-design` — additive changes only, server-side
defaults), gate risky features behind **remote config / feature flags** (your
only instant off-switch once shipped — see `mobile-release` on the no-rollback
reality), and plan a **forced-update mechanism** (minimum-supported-version
check) *in the first release* — the release where you need it is too late to
add it.

## Principles Applied

- **The network is optional; the local store is the truth** — architectures
  that assume connectivity degrade into spinners.
- **Survive process death**: the OS is a chaos monkey you don't configure.
- **Old versions live forever**: every contract and flag decision is made for
  a fleet, not a deployment.

## Cross-Skill References

- `frontend-architecture` — the web SPA counterpart (state and component patterns overlap)
- `mobile-release` — signing, store review, staged rollouts, hotfix reality
- `api-design` — versioned, old-client-tolerant contracts
- `architecture-design` — the platform-choice ADR
- `ui-ux-design` / `accessibility-design` — flows, states, and platform a11y
- `performance-optimization` — startup time, jank, memory on constrained devices
