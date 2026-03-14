# PRD and RFC Examples

## What "Lightweight Agile" Means in Practice

A lightweight agile PRD is NOT:
- A 50-page waterfall requirements spec
- An exhaustive list of every edge case
- A contract that cannot change

A lightweight agile PRD IS:
- 1-3 pages that capture the essential problem, goals, and requirements
- A shared understanding document — alignment tool, not a spec
- Something a motivated engineer can write in an afternoon
- Living: updated as the team learns more

---

## Example: Good Lightweight PRD

**Feature**: Saved Searches

---

**Problem**

Power users of our analytics dashboard run the same searches every day. Currently they must re-enter filter combinations manually each session. Support tickets show 15% of users mention "having to set the same filters every time" as a pain point. Usage logs confirm the top 20% of users average 8 filter changes per session.

**Goals**
- Users can save up to 20 named search configurations
- Saved searches load with one click from the search bar
- Reduces average filter changes per session by 50% for power users (measure at 30 days post-launch)

**Non-goals**
- Sharing saved searches between users (deferred to v2)
- Search history / auto-complete (separate feature)
- Mobile app support (web only for now)

**User Stories**

*Must have:*
- As a power user, I want to save my current filter state with a name, so that I can return to it without re-entering filters
- As a power user, I want to load a saved search by clicking its name, so that I can switch between common configurations quickly
- As a power user, I want to delete saved searches I no longer need

*Should have:*
- As a power user, I want to rename a saved search, so that I can keep my list organized

**Acceptance Criteria** (for must-haves)

*Save a search:*
- Given I have applied one or more filters, when I click "Save search", then I see a dialog to name it
- Given I enter a name and click Save, then the search appears in my saved searches list immediately
- Given I try to save with a duplicate name, then I'm warned and can choose to overwrite or rename

*Load a search:*
- Given I have saved searches, when I click a saved search name, then all filters update to that saved configuration in under 200ms
- Given no saved searches exist, then the saved searches dropdown shows an empty state with "Save your first search" prompt

**Constraints**
- Max 20 saved searches per user (storage and UI constraint)
- Saved searches are persisted server-side (not localStorage) so they sync across devices
- Names limited to 50 characters

**Design context**: Saved searches appear as a dropdown from the existing search bar. Mockup linked in Figma: [link].

---

## What Makes This PRD Good

- **Problem is quantified**: "15% of support tickets", "8 filter changes per session" — not "users find it annoying"
- **Non-goals are explicit**: prevents scope creep discussions during development
- **MoSCoW prioritization**: the team knows what to cut if time is short
- **Acceptance criteria are testable**: Given/When/Then format, specific and binary (pass/fail)
- **Constraints are technical facts**, not preferences
- **Under 2 pages** — a motivated engineer can read this in 5 minutes

---

## Example: Good Technical RFC

**RFC: Migrate Session Storage from Redis to PostgreSQL**

---

**Context**

Our Redis cluster is consistently at 80% memory usage and requires a $2,400/month upgrade. Sessions are currently stored as Redis hashes with 24-hour TTL. We have ~50,000 active sessions at peak.

**Proposed Solution**

Store sessions in a `sessions` PostgreSQL table:
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at) WHERE expires_at > NOW();
```

Expired sessions are cleaned by a nightly job (`DELETE FROM sessions WHERE expires_at < NOW()`). Session reads update `last_accessed_at` asynchronously (fire-and-forget) to avoid read amplification.

**Alternatives Considered**

1. **Upgrade Redis** ($2,400/month, solves capacity but not the operational cost). Simple but doesn't reduce cost.
2. **Switch to JWT sessions** (stateless, no storage needed). Rejected: cannot revoke JWTs before expiry, which is a security requirement for us.
3. **PostgreSQL** (proposed): Reduces infrastructure cost to ~$0 marginal (existing PG cluster has headroom), adds session revocation query capability, adds audit trail. Tradeoff: higher read latency (~5ms vs ~1ms) and additional load on primary database.

**Migration Plan**
1. Add `sessions` table to Postgres (backwards compatible — Redis still in use)
2. Write to both Redis and Postgres for 2 weeks (dual-write)
3. Read from Postgres with Redis fallback for 1 week
4. Remove Redis reads; remove Redis writes
5. Remove Redis cluster

**Open Questions**
- Should we keep Redis for other uses (rate limiting, pub/sub)? If yes, downgrade instead of removing.
- Acceptable session read latency budget? Current Redis ~1ms, Postgres ~5ms. Impact on auth-heavy pages?

---

## What Makes This RFC Good

- **Quantified trigger**: "$2,400/month", "80% memory" — not "Redis is getting full"
- **Alternatives include "do nothing" equivalent**: upgrade Redis is explicitly evaluated
- **Tradeoffs are honest**: "higher read latency (~5ms vs ~1ms)" — doesn't hide downsides
- **Migration plan is phased**: dual-write period reduces risk
- **Open questions are targeted**: asks the two things that could change the decision
