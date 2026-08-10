# The Pre-Commit Publish Gate

Detail for the three checks in SKILL.md's *"What you're about to publish"*. Read
the leg that tripped; you rarely need all three.

The shared premise: a commit is permanent and public-by-default-eventually. Tests
and the doc gate both look at whether the code is *correct*. These three look at
whether it is *publishable* — a different question, with no other gate behind it.

## Contents
- Leg 1 — personal data and secrets
- Leg 2 — the anchor check for internal terminology
- Leg 3 — comment placement
- What this gate is not

---

## Leg 1 — Personal data and secrets

### Where to look

The scan runs on every commit — it costs seconds and a clean result is one line,
so there's no threshold worth defending. What *is* worth knowing is where personal
data actually shows up, so the scan is attentive rather than uniform:

| Surface | Examples |
|---|---|
| Data files | `.csv`, `.json`, `.sql` dumps, `.parquet`, spreadsheets, seed data |
| Test fixtures | recorded API responses, cassettes, snapshot files, factories with literal values |
| Config & secrets | `.env*`, credentials files, connection strings, CI variables, deploy manifests |
| Logs & captures | log excerpts, stack traces with payloads, screenshots, HAR files, session recordings |
| Docs with examples | READMEs and runbooks pasting a "real" request/response, a hostname, a user record |

A pure source-code refactor touches none of these — that's the common case, and it
closes in the exit-condition line without further thought. The cost of the scan is
supposed to be near zero; anything that makes it feel expensive is a bug in how
you're running it, not diligence.

### Read what's already been decided first

The project usually has an answer; ask only when it doesn't. In order:

1. **`CLAUDE.md` / project instructions** — often names the protected surfaces
   outright ("never commit data/", "the client list is confidential").
2. **Memory files** — standing instructions from earlier sessions.
3. **`.gitignore`** — what's excluded is a direct statement of what shouldn't be
   committed. A staged file matching an ignored *pattern* (force-added, or a
   near-miss like `data/sample.csv` beside an ignored `data/*.csv`) is a signal.
4. **Existing fixtures** — if every other fixture uses `user@example.com` and
   yours has a real address, the convention already answered the question.
5. **Standing instruction in this session.**

### When nothing is declared, ask — before the commit

One question, scoped to what you actually found, at the moment it matters:

> `fixtures/accounts.json` has 40 records with what look like real names, emails
> and phone numbers. Is this data safe to commit, or should I replace it with
> synthetic values?

Ask once per project and remember the answer. Do not re-ask on every commit — a
question that becomes ritual gets answered reflexively, which is worse than not
asking.

The question rides along with the rest of your response; it doesn't hold the work
hostage. If the user has already said this data is fine, that's the answer — note
it and commit.

### The response ladder

**Nothing on this ladder blocks the commit.** What changes with severity is how
loudly you say it and what consequence you name — never whether you proceed. A
refusal doesn't prevent the leak; the commit just happens without you, minus the
one participant who spotted it. Report, name the cost, and let the user choose.

| Finding | What to say |
|---|---|
| Live credentials — API keys, tokens, private keys, passwords, connection strings with secrets | The loudest rung. Say plainly that **the credential should be treated as already compromised** the moment it lands in a commit, so the fix is **rotation**, not deletion — deleting it from the diff leaves a valid secret in a file someone had. Point at `configuration-strategy` (env var, secret manager). Then do what the user says. |
| Real personal data — names, emails, phones, addresses, IDs, health/financial records | Name what's exposed and offer the three ways out: *redact* (mask in place), *synthesize* (generated equivalents — `test-data-strategy` keeps the shape correct), or *proceed with the risk on the record*. |
| Internal-but-not-personal — hostnames, internal URLs, org chart details, client names, file paths with usernames | Flag it, name the exposure in one line, move on. The user knows their audience better than you do, and this is where over-reacting does the most damage to the gate's credibility. |
| Plausibly-fake data you can't distinguish from real | Ask, in the same response as everything else. `john.smith@gmail.com` in a fixture is either fine or a person, and one question is cheaper than either mistake. |

The one thing that *is* mandatory: the finding reaches the user **before** the
commit, not after. Timing is the whole value — everything downstream of a push is
recovery.

### Handling rule: don't leak while checking

Checking for a leak must not create one.

- **Match on shape and location, not on value.** Report *"`config/prod.yml:14` holds
  what looks like a live database password"*, never the password.
- **Never paste a real value into your reply, a commit message, a doc, or a
  subagent prompt** to demonstrate that it exists. The file and line prove it.
- When redacting, edit in place. Don't quote the original into the conversation
  as a "before" for comparison.
- This holds even when the user asks you to verify a value loaded correctly —
  confirm presence and shape, not content.

---

## Leg 2 — The anchor check for internal terminology

### The problem

Planning vocabulary is *session* context. Phases, checkpoints, task codes, and
finding numbers are how the work was organized in a conversation — they are not
facts about the codebase. When they land in a versioned file, a reader who has
only the repo hits a reference they cannot resolve, and there is nothing to look
it up in.

### The shapes that trip it

`Phase 2` · `Fase 4` · `CP1.3` · `checkpoint 3/5` · `T02` · `P2-E08` ·
`finding #17` · `Sprint 4` · `Milestone 2` · `WP3` — in **any** staged content:
code comments, commit messages, PR descriptions, docs, test names, log strings.

### The rule is the anchor, not the token

The same string is correct in one repo and a leak in the next. Never blacklist
the vocabulary; check whether it resolves.

```bash
# Does a TRACKED document define this identifier?
git ls-files '*.md' | xargs grep -l "P2-E08"
```

- **Anchored** — a git-tracked document (an execution plan under `docs/`, an ADR,
  a roadmap, a tracked issue reference) defines the term. Keep it: it's a real
  cross-reference, and stripping it would lose information. Prefer making the
  pointer explicit (`per docs/roadmap.md#p2-e08`) over the bare label.
- **Unanchored** — the only definition lives in a plan file that is gitignored,
  in a chat, in a scratchpad, or in your own context. **Write what it means
  instead of what it was called.**

### Rewriting, not deleting

The information is usually worth keeping; only the label is unusable. The
sentence gets *better*, not shorter:

| Unanchored | Rewritten |
|---|---|
| `// Dashboard aggregates (Phase 4). All read-only.` | `// Dashboard aggregates. All read-only.` |
| `/** Build the re-ask prompt (findings #30). */` | `/** Build the re-ask prompt. The subject re-answers with the required keys when the first response omits them. */` |
| `// citty collapses a repeated string flag to its last value (finding #17)` | `// citty collapses a repeated string flag to its last value` |
| `feat: complete Phase 2, CP2.3 bugs fixed` | `feat(sync): add delta detection and fix the duplicate-row load` |
| `* From-tarball smoke test (checkpoint 3/5 verification)` | `* From-tarball smoke test: proves the bundle needs no repo layout` |

Note what happens in each: the label carried no information a reader could use,
so removing it costs nothing, and the space it freed is where the actual meaning
goes.

### Greenfield projects

A new repo has no tracked docs, so *everything* is unanchored and the check would
reject all of it. That's the wrong outcome. When a project hasn't decided what it
documents, that decision is the work — route to `project-documentation` to
establish which artifacts are versioned and which stay internal. Until then,
default to writing meanings, which is never wrong.

---

## Leg 3 — Comment placement

### When it trips

A new comment block of **four or more lines**. Short comments are rarely the
problem; the failure mode is the module-header essay that reproduces an
architecture document inside a source file.

### The placement rule

Three destinations, decided by what the comment explains:

| The comment explains | Where it belongs |
|---|---|
| A **system** — why this component exists, which alternatives were rejected, how it relates to other services, a cross-cutting constraint | An ADR or architecture doc. The comment keeps a one-line pointer: `// See ADR-018 for why triage state is a separate database.` |
| A **local invariant** — why *this* line is written the strange way it is, a consequence the caller can't see, a boundary condition the types don't express | Inline, right where it is. This is what comments are for. |
| **What the code does** | Nowhere. Delete it; the code says it already. |

### Why the pointer beats the essay

Not a style preference — the essay is worse on its own terms:

- It rots invisibly. Nobody re-reads a 12-line header when editing line 300, so
  it drifts into describing a design the file no longer implements, and a
  confidently wrong comment is worse than none.
- It's unfindable. Someone asking "why two databases?" greps the docs, not
  `triage.ts`.
- It's unreviewable. Architecture stated in a source comment never gets the
  scrutiny the same claim would get in an ADR.

### Calibration — the same length, opposite verdicts

**Keep** — a local invariant the types can't express, exactly where it's needed:

```ts
/**
 * Append an inclusive from/to date-range filter. Both ends compare the DATE part
 * (`date(col) >= date(?)`) so a picked `to` day includes that whole day — a plain
 * `col <= '2026-07-14'` would drop everything after midnight.
 */
```

**Move** — a system decision that belongs in the ADR it already cites:

```ts
/**
 * User-authored triage state is NOT derivable from the archive, so it can't live
 * in the rebuildable analytics DB — detect() wipes and re-inserts findings on
 * every ingest, and `ingest --full` drops every analytics table. Instead it lives
 * in a separate, writable triage.db that ingest never touches, keyed by the
 * stable finding id, so triage survives re-detection and full rebuilds. The
 * analytics handle stays read-only: it only ATTACHes this file to JOIN...
 */
```

→ `// Triage state lives in a separate writable DB; see ADR-018.`

`code-slop-cleanup`'s [slop-patterns.md](../../code-slop-cleanup/references/slop-patterns.md)
holds the full comment-slop catalog with its "when it's NOT slop" columns.

---

## What this gate is not

- **Not a code review.** Three greps over a diff you already have open. If they
  trip on a code diff, `code-reviewing` does the reviewing.
- **Not a security audit.** It catches what's in *this diff*. Auditing the repo,
  its history, or its dependencies is `security-audit`.
- **Not a compliance program.** GDPR/CCPA obligations, retention policy, data
  mapping, and DSR handling are `compliance-privacy`. This gate is the commit-time
  instance of a policy that skill defines.
- **Not a veto.** No finding on any leg stops a commit. The agent's job is that the
  check ran and the finding is on the record before the push; the decision was
  always the user's, and they hold context you don't. The one thing this gate must
  never do is make committing feel expensive enough to route around — a gate that
  gets bypassed protects nothing, and that is a far more common ending than a gate
  that was too lenient.
