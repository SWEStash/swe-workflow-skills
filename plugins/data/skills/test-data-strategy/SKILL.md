---
name: test-data-strategy
description: "Design and generate test data — factories, synthetic data, property-based testing, boundary analysis, contract testing, load scenarios, GDPR-safe data. Triggers: test data, synthetic data, fake data, factory, seed data, fixtures, property-based testing, fuzz testing, boundary values, contract testing, Pact, load test data, anonymize, GDPR test data."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Test Data Strategy

Design and generate the data that powers tests. Bad test data causes false confidence (tests pass but bugs hide) and false alarms (tests fail on irrelevant data quirks). Good test data is realistic, covers edge cases, and respects privacy.

## Scope Boundary

This skill designs **what data** to create and **how** to create it. For **how to structure tests** (naming, pyramid, framework setup), use `test-suite-design`. For **test-first implementation**, use `tdd-workflow`.

## Workflow

### Step 1: Assess Data Needs

For the feature or system under test, identify:

- **What entities are involved?** (Users, orders, products, transactions)
- **What relationships matter?** (User has many orders, order has many items)
- **What data states exist?** (Active user, suspended user, deleted user)
- **What are the boundary values?** (Empty, one item, max items, zero price, max price)
- **What constitutes invalid data?** (Missing required fields, wrong types, out-of-range values)
- **Is production data available for reference?** (Understand real distributions)
- **Are there privacy constraints?** (GDPR, HIPAA, PCI — cannot use real customer data)

### Step 2: Choose the Right Strategy

Different testing needs require different data strategies:

| Strategy | Best For | When to Use |
|----------|----------|-------------|
| **Factories** | Unit/integration tests | Most tests — deterministic, focused, fast |
| **Property-based testing** | Algorithmic code, parsers, serialization | When exhaustive example testing is impractical |
| **Boundary value analysis** | Validation, calculations, range checks | Any function with numeric or string limits |
| **Synthetic data generation** | Load testing, staging environments | When you need volume or realistic distributions |
| **Contract testing** | Service-to-service boundaries | When multiple services agree on a data format |
| **Snapshot testing** | Complex outputs (API responses, renders) | When output is large and changes infrequently |

See [references/data-generation-patterns.md](references/data-generation-patterns.md) for implementation of each strategy.

### Step 3: Design Factory Architecture

For most applications, factories are the backbone of test data. Design them in layers:

**Layer 1 — Build functions** (create plain objects in memory):
```
buildUser({ role: 'admin' }) → { id: '...', name: '...', role: 'admin', ... }
```

**Layer 2 — Create functions** (insert into database and return):
```
createUser({ role: 'admin' }) → User record in DB
```

**Layer 3 — Scenario builders** (create a complete test scenario):
```
createCheckoutScenario() → { user, cart with 3 items, valid payment method, applied discount }
```

Layer 3 is the key insight most teams miss. Complex tests need complete scenarios, not individual entities assembled ad-hoc in every test.

### Step 4: Define Boundary Values

For every input that has limits, test:

```
          ┌─────────────────────────────────┐
Below min │  Min  │  Nominal  │  Max  │ Above max
          └─────────────────────────────────┘
  Invalid   Edge    Valid       Edge    Invalid
```

For each input, create test data for:
- **Below minimum** (invalid: -1 for quantity, empty string for name)
- **At minimum** (edge: 0 or 1, single character)
- **Nominal** (typical valid value)
- **At maximum** (edge: 255 characters, max integer)
- **Above maximum** (invalid: 256 characters, overflow value)
- **Special values** (null, undefined, NaN, Infinity, empty array, whitespace-only string)

### Step 5: Implement Property-Based Tests

For functions where example-based tests can't cover the input space, use property-based testing:

Instead of `test("sorts [3,1,2] to [1,2,3]")`, assert the property: "for ANY array, sort(arr) produces a result where every element is ≤ the next."

Properties to look for:
- **Roundtrip**: `deserialize(serialize(x)) === x`
- **Idempotence**: `f(f(x)) === f(x)` (e.g., normalization, formatting)
- **Invariants**: `sort(arr).length === arr.length` (no elements lost or added)
- **Commutativity**: `f(a, b) === f(b, a)` (order independence)
- **Oracle**: `myFunction(x) === referenceImplementation(x)` (compare against known-good)

See [references/data-generation-patterns.md](references/data-generation-patterns.md) for framework-specific implementation.

### Step 6: Handle Privacy and Compliance

When test data must resemble production data but cannot contain real PII:

**Never copy production data to test environments unmasked.** Instead:

1. **Use factories for most tests** — no real data involved, no compliance risk
2. **Generate synthetic data for staging** — realistic distributions without real identities
3. **Mask production data only when necessary** — anonymize PII before copying to lower environments
4. **Version control your data generation seeds** — for reproducible test runs
5. **Audit test environments** — ensure no real PII leaked into test databases

See [references/data-generation-patterns.md](references/data-generation-patterns.md) for privacy-safe generation patterns.

### Step 7: Design Load Test Data

Load testing requires different data characteristics:

- **Volume**: Thousands or millions of records, not tens
- **Variety**: Realistic distribution of data states (not all active users)
- **Uniqueness**: Unique identifiers to prevent constraint violations during concurrent loads
- **Pre-seeded**: Data must exist before the test runs (not created during the test)
- **Cleanable**: Easy to identify and remove after the test (`test_` prefix, specific date ranges)

## Principles Applied

- **KISS**: Start with factories. Add property-based testing for algorithmic code. Add synthetic generation for load tests. Don't build everything on day one.
- **DRY**: Centralize factories in a shared test helpers directory. Every test file should import from the same factory, not define its own.
- **YAGNI**: Don't build a synthetic data pipeline for unit tests. Factories are sufficient for 90% of test data needs.
- **Functional Independence**: Test data setup should be self-contained per test. Never depend on data created by another test.
