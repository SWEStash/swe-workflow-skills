# STRIDE: Threat Patterns and Standard Mitigations

Per-category catalog for Step 3. For each boundary crossing, scan the category's
typical threats and pick from the standard controls — invent a custom control
only when a standard one genuinely doesn't fit (custom security controls are
where vulnerabilities live).

## Spoofing (authentication)

**Typical threats**: credential stuffing/phishing at login; forged webhook or
callback calls; service-to-service calls with no caller identity; DNS/ARP
spoofing on internal traffic; replayed tokens or signed URLs.

**Standard mitigations**: strong auth (MFA for humans, mTLS or signed requests
for services); webhook signature verification **plus** timestamp/nonce to block
replay; short-lived tokens over long-lived API keys; OIDC/OAuth flows instead of
home-grown login; certificate pinning only where the threat justifies its
operational cost.

## Tampering (integrity)

**Typical threats**: parameter/payload manipulation (IDs, prices, quantities);
modification of data in transit; direct writes to a shared store bypassing the
app's rules; CI/CD or dependency supply-chain injection; unsigned mobile/desktop
update channels.

**Standard mitigations**: TLS everywhere (internal too); server-side validation
of every client-supplied value (client-side checks are UX, not security);
integrity signatures/HMACs on anything that round-trips through the client
(cookies, tokens, callback params); least-privilege DB accounts per service;
signed artifacts and locked dependencies in the pipeline.

## Repudiation (auditability)

**Typical threats**: admin or support actions with no trail; shared/service
accounts hiding who acted; logs an attacker can edit or delete; missing
before/after values on sensitive mutations.

**Standard mitigations**: append-only or write-once audit logs, shipped off the
host that generates them; per-human accounts (no shared logins) with actions
attributed through impersonation records; log the actor, action, target, and
before/after for sensitive operations; clock sync so timelines reconstruct.

## Information Disclosure (confidentiality)

**Typical threats**: IDOR (guessable IDs + missing object-level authz); verbose
errors/stack traces leaking internals; sensitive data in logs, URLs, or
analytics; overly broad API responses (returning the whole object when the
client needs two fields); backups/exports with weaker controls than the source;
enumeration via timing or error differences (valid vs invalid username).

**Standard mitigations**: object-level authorization on every read (not just
route-level); non-enumerable IDs where exposure matters; encrypt sensitive data
at rest and classify what "sensitive" means (Step 1); scrub PII/secrets from
logs and error responses; response shaping (field allowlists); uniform errors
and timing for auth failures.

## Denial of Service (availability)

**Typical threats**: unauthenticated endpoints doing expensive work (search,
export, PDF render); unbounded request sizes/collections ("give me all
records"); resource exhaustion via file upload; amplification through webhooks
or fan-out; a single tenant starving the rest.

**Standard mitigations**: rate limiting keyed to the right identity (IP for
anonymous, account for authenticated); pagination and hard caps on collection
endpoints; size limits and timeouts on every external input; queue + backpressure
for expensive work instead of doing it in-request; per-tenant quotas.

## Elevation of Privilege (authorization)

**Typical threats**: missing function-level checks (the admin route trusts the
hidden menu); role changes that don't re-evaluate existing sessions; mass
assignment setting `is_admin` from a request body; confused-deputy flows (your
service does something *for* a caller with *its own* elevated rights); path
traversal / injection escalating code execution.

**Standard mitigations**: deny-by-default authorization enforced server-side at
the function/object level; centralized policy (one authz module, not checks
scattered per handler); explicit field allowlists on writes; scoped credentials
so a deputy can only act with the caller's authority; re-check privileges on
sensitive actions, not just at login.

## Using the catalog

Walk each trust-boundary crossing from SKILL.md Step 3 down this list. Most
crossings surface 2–4 real threats, not all six categories — a database
crossing rarely has a repudiation story, a webhook crossing almost always has
spoofing + replay + DoS. Record only threats with a plausible attacker and
path; padding the model with theoretical entries buries the real ones.
