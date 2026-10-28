# Dependency Evaluation Checklist

## Contents
- Structured assessment template
- License compatibility guide
- Red flags to watch for
- Bundle size guidelines
- Common decisions by category

## Structured Assessment Template

Use this template when evaluating a library for adoption:

```markdown
## Dependency Evaluation: [library-name]

**Purpose**: [What does it do? Why do we need it?]
**Alternative to**: [What we're using now, or "nothing — new capability"]
**Evaluated on**: [Date]

### Necessity (Step 1)
- Used: [functions/features we call] of [what it ships]
- Pulls in: [transitive packages, native builds, maintainer groups]
- Already covered by: [stdlib / platform / existing dependency / nothing]
- Own module: [what, ~lines, how tested]
- Grows into: [planned features that would use more of it, or "none known"]
- Gives beyond code: [portability, abstraction, spec conformance, security record, checked]
- Verdict: [Own module / Adopt / Ask the user (question asked)]

### Maintenance Health
- Last release: [date]
- Commits in last 6 months: [number]
- Open issues / total issues: [ratio]
- Maintainers: [number, names if notable]
- Bus factor concern? [Yes/No]

### Adoption
- Weekly downloads: [number]
- GitHub stars: [number]
- Notable dependents: [projects]
- Stack Overflow questions: [rough count]

### Technical Fit
- TypeScript types: [built-in / @types / none]
- Bundle size (minified + gzipped): [KB]
- Transitive dependencies: [count]
- Compatible with our [framework] version? [Yes/No]
- API quality: [Good / Acceptable / Poor]

### Security & Legal
- License: [license type]
- Compatible with our project? [Yes/No]
- Known vulnerabilities: [count / none]
- Security advisory history: [clean / concerning]

### Alternatives Considered
| Criteria | [Library A] | [Library B] | [Library C] |
|----------|-------------|-------------|-------------|
| Bundle size | | | |
| TypeScript | | | |
| Maintenance | | | |
| API quality | | | |
| Adoption | | | |

### Decision
**Recommendation**: [Adopt / Don't adopt / Adopt alternative X]
**Rationale**: [1-2 sentences]
**Risks accepted**: [What we're giving up]
```

## License Compatibility Guide

| License | Commercial Use | Can Modify | Must Disclose Source | Viral |
|---------|---------------|------------|---------------------|-------|
| MIT | ✓ | ✓ | No | No |
| Apache 2.0 | ✓ | ✓ | No (but must include license) | No |
| BSD 2/3 | ✓ | ✓ | No | No |
| ISC | ✓ | ✓ | No | No |
| GPL 2/3 | ✓ | ✓ | Yes — your code must also be GPL | **Yes** |
| LGPL | ✓ | ✓ | Only for modifications to the library | Partially |
| AGPL | ✓ | ✓ | Yes — even for SaaS/network use | **Yes** |
| BSL | Varies | ✓ | After time period | Varies |
| Unlicense | ✓ | ✓ | No | No |

**Safe for most projects**: MIT, Apache 2.0, BSD, ISC, Unlicense
**Requires legal review**: GPL, LGPL, AGPL, BSL, any custom license
**Red flag**: No license file at all — technically you have no right to use it

## Red Flags

**Maintenance red flags:**
- No commits in 12+ months with open issues
- Single maintainer who has gone silent
- Repository archived or marked as deprecated
- No changelog or release notes for major versions

**Quality red flags:**
- No tests in the repository
- Many open issues with the "bug" label and no response
- Breaking changes in minor/patch versions (doesn't follow semver)
- Excessive transitive dependencies (a utility library with 50+ deps)

**Security red flags:**
- Known unpatched vulnerabilities
- History of supply chain attacks on this package
- Maintainer account compromise history
- Obfuscated or minified source code in the published package

## Bundle Size Guidelines

Context for JavaScript frontend projects:

| Category | Acceptable | Concerning | Excessive |
|----------|-----------|------------|-----------|
| Utility (lodash-like) | < 5 KB | 5-20 KB | > 20 KB |
| UI component | < 15 KB | 15-50 KB | > 50 KB |
| State management | < 10 KB | 10-30 KB | > 30 KB |
| Date library | < 10 KB | 10-30 KB | > 30 KB |
| Charting | < 50 KB | 50-150 KB | > 150 KB |
| Full framework | < 50 KB | 50-100 KB | > 100 KB |

Check with: `bundlephobia.com` or `npm pack && tar -tzf *.tgz | wc -l`

For backend projects, bundle size matters less — focus on transitive dependency count and startup time impact.

## Common Decisions by Category

| Need | Recommended Approach |
|------|---------------------|
| **Date handling** | Use `Intl.DateTimeFormat` (built-in) for formatting. Add `date-fns` only for complex date math. Avoid `moment` (deprecated, huge). |
| **HTTP client** | Use built-in `fetch` (Node 18+, all browsers). Add `ky` or `ofetch` for convenience wrappers only if needed. |
| **Validation** | `zod` for TypeScript (schema + types). `joi` for JavaScript. Built-in validators for simple cases. |
| **UUID generation** | `crypto.randomUUID()` (built-in Node 19+, all browsers). Add `uuid` only for v1/v5 or older runtimes. |
| **Cryptography** | Always use built-in `crypto` module or `bcrypt`/`argon2`. Never implement your own. |
| **Testing** | `vitest` for Vite projects, `jest` for everything else. Both are comprehensive enough to avoid extra test utilities. |
| **Linting** | `eslint` with `typescript-eslint`. `biome` as a faster alternative. Avoid stacking too many plugins. |
