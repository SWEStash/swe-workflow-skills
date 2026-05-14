---
name: security-audit
description: "Comprehensive security analysis — OWASP Top 10, auth/authz flows, injection vulnerabilities, data exposure, secrets detection, dependency CVEs, hardening recommendations. Triggers: security audit, vulnerability, is this secure, security review, pentest prep, OWASP, harden this, check for vulnerabilities, injection, XSS, CSRF, auth security."
model: opus
allowed-tools: Read, Grep, Glob, Write, Edit, WebFetch, WebSearch
---

# Security Audit

Perform a structured security assessment of an application. This skill goes far deeper than the security checklist in code-reviewing — it's a dedicated, systematic analysis covering the OWASP Top 10 and beyond.

## Scope Boundary

This skill analyzes code, configuration, and architecture for security vulnerabilities through static analysis and design review. It does not replace penetration testing, but it prepares code for one by catching the issues a pentester would find.

## Workflow

### Step 1: Define the Attack Surface

Before reviewing code line by line, map what's exposed:

- **Entry points**: HTTP endpoints, WebSocket connections, GraphQL resolvers, CLI inputs, file uploads, webhooks, cron jobs
- **Authentication boundaries**: What's public vs authenticated vs admin-only?
- **Data flows**: Where does sensitive data enter, travel, and get stored?
- **External integrations**: Third-party APIs, OAuth providers, payment processors
- **Infrastructure**: Cloud services, databases, caches, queues

Present the attack surface map to the user. Gaps in understanding here mean gaps in the audit.

### Step 2: Assess by OWASP Top 10

Walk through each category systematically. See [references/owasp-top-10.md](references/owasp-top-10.md) for the detailed checklist.

For each finding:

- **Severity**: Critical / High / Medium / Low
- **Location**: File, line, endpoint
- **Vulnerability**: What the issue is
- **Exploit scenario**: How an attacker would use this (concrete, not theoretical)
- **Remediation**: Specific code change or configuration fix

### Step 3: Authentication & Authorization Deep Dive

Auth is where the highest-impact vulnerabilities live. Review:

**Authentication:**
- How are credentials stored? (bcrypt/argon2 with sufficient rounds, never MD5/SHA)
- Session management: secure flags, httpOnly, sameSite, expiration
- Token handling: JWT validation (algorithm, expiry, issuer), refresh token rotation
- Password policy: minimum complexity, breached password checking
- MFA implementation (if present): bypass resistance, recovery flow security
- Rate limiting on login: brute force protection

**Authorization:**
- Is authorization checked on every protected endpoint (not just the UI)?
- Are there IDOR vulnerabilities? (Can user A access user B's resources by changing an ID?)
- Is the authorization model consistent? (role-based, attribute-based, or ad-hoc?)
- Are there privilege escalation paths? (Can a regular user reach admin functionality?)
- Are API endpoints and UI permissions in sync?

### Step 4: Data Security Review

- **At rest**: Is sensitive data encrypted in the database? (PII, payment data, health data)
- **In transit**: Is TLS enforced everywhere? Any HTTP-only endpoints?
- **In logs**: Are passwords, tokens, SSNs, or credit card numbers logged?
- **In errors**: Do error messages leak internal details (stack traces, SQL queries, file paths)?
- **In responses**: Do API responses include fields the client shouldn't see?
- **Retention**: Is data deleted when it should be? GDPR/CCPA compliance?

### Step 5: Dependency Audit

Run dependency vulnerability scanners and review results:

```bash
# JavaScript/TypeScript
npm audit
npx better-npm-audit audit

# Python
pip audit
safety check

# Go
govulncheck ./...

# Ruby
bundle audit check --update
```

For each vulnerability found:
- What is the CVE and its severity?
- Is the vulnerable code path actually used in this project?
- Is there a patched version available?
- If no patch exists, what's the mitigation?

Suggest using the `dependency-management` skill for remediation planning.

### Step 6: Secrets and Configuration

- Scan for hardcoded secrets: API keys, passwords, tokens, private keys
- Check `.gitignore` covers sensitive files (`.env`, key files, certificates)
- Review git history for accidentally committed secrets: `git log --all -p | grep -i "password\|secret\|api_key\|token"`
- Verify environment variable usage for all secrets
- Check that different environments use different credentials

### Step 7: Produce the Report

Output the audit report using the template at [templates/security-report.md](templates/security-report.md). Organize findings by severity, with Critical and High items first.

## What This Skill Does NOT Cover

- Runtime penetration testing (requires running the application)
- Network-level security (firewall rules, VPN configuration)
- Physical security or social engineering
- Compliance certification (SOC 2, HIPAA, PCI DSS — though findings may relate)

## Principles Applied

- **Defense in depth**: Don't rely on a single security control. Layer protections.
- **Least privilege**: Every component should have the minimum permissions it needs.
- **Fail secure**: When something goes wrong, it should deny access, not grant it.
- **KISS**: Simpler security is more auditable security. Complex auth flows breed bugs.
