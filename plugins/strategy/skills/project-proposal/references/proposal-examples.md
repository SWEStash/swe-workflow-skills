# Project Proposal Examples

## Calibrating Depth by Project Scale

A proposal for a 1-week internal tool looks very different from a proposal for a 6-month platform investment. Match depth to stakes:

| Scale | Team size | Duration | Proposal length | Business case depth |
|-------|-----------|----------|-----------------|---------------------|
| Small | 1-2 engineers | < 2 weeks | Half a page | Problem + 1 metric |
| Medium | 2-5 engineers | 2-8 weeks | 1 page | Full problem, ROI estimate |
| Large | 5+ engineers or cross-team | 2+ months | 1-2 pages | Full business case, risk table |

---

## Small Scale: Quick-Start Proposal

**Proposal**: Automate weekly dependency audit

**Problem**: Our team manually checks `npm audit` and `pip audit` each Monday. This takes ~45 minutes and often gets skipped when the team is busy. Three unaddressed vulnerabilities slipped into production last quarter.

**Solution**: Add a weekly scheduled CI job that runs security audits and opens a GitHub issue with findings if new critical/high vulnerabilities exist. Auto-closes the issue when the audit passes.

**Estimate**: 1 engineer, 3 days.

**Cost**: Zero infrastructure cost (existing CI minutes). Saves ~3 engineer-hours/month.

**Success**: Zero manually-skipped audits. Vulnerabilities detected within 7 days of publication.

---

What makes this good: Problem is concrete ("three slipped into production"), solution is tiny in scope, estimate is honest, success is measurable. No risk table needed for a 3-day project.

---

## Medium Scale: Full Proposal

**Proposal**: Customer-Facing Usage Dashboard

**Problem**

Enterprise customers currently email support to ask "how many API calls did we make this month?" Support handles ~40 such requests per month (4 hours of engineer time). 3 churned customers cited "poor visibility into usage" in exit surveys. Without usage visibility, customers don't know when they're approaching plan limits until they hit them — causing unexpected billing surprises.

**Solution**

Build a usage dashboard in the customer portal showing:
- API calls (daily/weekly/monthly)
- Current period usage vs. plan limit
- Per-endpoint breakdown
- Downloadable CSV for billing reconciliation

Usage data already exists in our analytics database. This is a read-only UI over existing data.

**Scope**

Included: Web dashboard, email alerts at 80%/100% of plan limits, CSV export
Excluded: Real-time updates (batch refresh every hour is sufficient), mobile app, per-user breakdown within an org

**Estimate**

- 2 engineers, 4 weeks
- Design: 1 week (1 designer)
- Infrastructure: No new services; read from existing analytics DB

**Risks**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Analytics DB performance (high-read queries) | Medium | Medium | Add read replica; query pre-aggregated tables |
| Scope expansion (customers request more metrics) | High | Low | Strict non-goals; defer to v2 |
| Data accuracy concerns | Low | High | Display data freshness timestamp; add reconciliation note |

**Success Criteria**

- Support requests about usage drop by 80% within 60 days of launch
- Customer satisfaction score (CSAT) for billing/usage queries improves
- Zero plan limit surprises in first 90 days post-launch

---

## Large Scale: Platform Investment Proposal

**Proposal**: Migrate Authentication to a Centralized Auth Service

**Problem**

Authentication logic is currently duplicated across 4 services (API, admin panel, mobile backend, partner portal). Last quarter:
- A JWT signing key rotation took 3 days because it required coordinated deploys across all 4 services
- An auth bug was fixed in 2 of 4 services; the other 2 remained vulnerable for 11 days
- Onboarding a 5th service (analytics API) would require duplicating auth logic again

Security team has flagged our auth architecture as high-risk in the last two security reviews.

**Solution**

Build a centralized auth service (OAuth2/OIDC server) that issues JWTs. All services validate tokens against a shared public key. Services no longer implement auth — they only validate tokens.

**Architecture summary**:
- Auth Service: issues tokens, handles login/logout/refresh, manages sessions
- All other services: validate token signature + claims only (stateless validation)
- Migration: phased, service by service, with backwards compatibility

**Alternatives Considered**

1. **Status quo + better coordination**: Document the auth pattern, add cross-service testing. Lower effort but doesn't eliminate duplication or key rotation pain.
2. **Adopt a managed auth provider (Auth0, Cognito)**: Faster to implement, reduces maintenance burden. Rejected: $8,000/month at our user volume, and we'd lose control of session data (compliance concern).
3. **Centralized auth service** (proposed): Higher upfront cost, eliminates duplication, solves key rotation, enables SSO as future option.

**Estimate**

- 3 engineers + 1 security engineer, 3 months
- Phase 1 (auth service + API migration): 6 weeks
- Phase 2 (remaining 3 services): 6 weeks
- Infrastructure: +$200/month for dedicated auth service instances

**Risks**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Auth service becomes single point of failure | Low | Critical | Multi-region deploy; circuit breakers in all services |
| Migration breaks a service | Medium | High | Feature flag per service; rollback is re-enable old auth path |
| Team expertise gap (OAuth2/OIDC) | Medium | Medium | Security engineer on team; use established library (Hydra or Keycloak) |
| Scope expansion (add SSO, MFA) | High | Medium | Strict phase gating; SSO is explicitly v2 |

**Success Criteria**

- Key rotation takes < 1 hour (down from 3 days)
- Auth vulnerabilities are patched in all services within 24 hours of discovery
- New services require < 1 day to integrate auth (vs. current 2+ weeks)
- Zero auth-related incidents in the 90 days following full rollout

---

## What to Cut When Time Is Short

If stakeholders need a decision quickly, prioritize in this order:
1. **Problem statement + impact** — without this, there's no decision to make
2. **Estimate** — stakeholders need to know the cost
3. **Success criteria** — how will we know it worked?
4. **Risks** — what could go wrong?
5. **Alternatives** — can be verbal rather than written for small proposals
