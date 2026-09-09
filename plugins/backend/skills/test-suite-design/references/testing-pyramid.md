# The Testing Pyramid

## Contents
- Layer definitions and trade-offs
- What to test at each layer
- Anti-patterns
- Fixture and factory patterns

## Layer Definitions

### Unit Tests (~70% by default)

**Scope**: A single function, method, or class in isolation.
**Speed**: Milliseconds per test.
**Dependencies**: All external dependencies mocked/stubbed.
**Confidence**: High confidence that individual pieces work correctly.

What to test here:
- Business logic and calculations
- Data transformations and mapping
- Validation rules
- State machines and transitions
- Conditional branching
- Error handling and edge cases
- Utility and helper functions

What NOT to test here:
- Database queries (use integration tests)
- HTTP request/response cycles (use integration tests)
- Third-party library behavior (trust but verify at integration level)

### Integration Tests (~20% by default)

**Scope**: Two or more components working together.
**Speed**: Hundreds of milliseconds to seconds per test.
**Dependencies**: Real database (test instance), real filesystem, mock external APIs.
**Confidence**: High confidence that components connect correctly.

What to test here:
- Database query correctness (does the query return what we expect?)
- API endpoint behavior (request → response, including middleware)
- Service-to-service communication (with mocked external services)
- Message queue producers and consumers
- File I/O operations
- Cache behavior

Typical setup:
- Test database with migrations applied fresh per suite (or per test for isolation)
- Seed data via factories, not fixtures (factories are dynamic, fixtures go stale)
- Clean up after each test (transaction rollback or truncation)

### E2E Tests (~10% by default)

**Scope**: Full user journey through the entire stack.
**Speed**: Seconds to minutes per test.
**Dependencies**: Full running system (or close to it).
**Confidence**: High confidence that the whole system works for critical paths.

What to test here:
- Critical user journeys only (signup, purchase, core workflow)
- Integration with real third-party services (in staging/sandbox)
- Cross-service workflows

Keep these minimal. Each E2E test is expensive to write, slow to run, and fragile to maintain. If you can test something at a lower level, do it there instead.

## Adjusting the Ratio for the Codebase

70/20/10 is the default, not the target. It assumes most behavior lives in code you can
call directly, which is true of a service with a real domain layer and false of plenty of
real codebases. Name the split you are aiming for and what moved it:

| Codebase shape | Where it lands | Why |
|---|---|---|
| Domain logic in plain functions/classes | 70/20/10 | The default holds |
| ORM-heavy (Django, Rails, Laravel) — logic is queries and view wiring | ~40/50/10 | A unit test against a mocked queryset asserts the mock, not the query |
| Thin API over a third-party service | ~30/50/20 | The risk is the integration contract, not internal branching |
| Data pipeline / transform-heavy | ~80/15/5 | Transforms are pure and cheap to test in isolation |

The number is a communication device: it forces an explicit claim about where this
codebase's risk actually sits. **A stated distribution with a reason beats a recited one.**

## Anti-patterns

**Ice cream cone**: More E2E tests than unit tests. Slow suite, flaky CI, hard to debug failures. Invert the pyramid.

**Testing the framework**: Writing tests that verify React renders a component or Express routes a request. The framework already works. Test your logic.

**100% coverage obsession**: Coverage measures lines executed, not behaviors verified. A test that calls a function without asserting anything shows as "covered". Focus on behavior coverage.

**Shared mutable state**: Tests that depend on data created by a previous test. One test failure cascades into false failures across the suite.

**Sleep-based waits**: `await sleep(1000)` to wait for async operations. Flaky and slow. Use polling, event-based waits, or test-specific hooks.

## Fixture and Factory Patterns

### Factories (recommended)

Factories generate test data dynamically with sensible defaults and overrides:

```javascript
// JavaScript/TypeScript pattern
function buildUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: 'member',
    createdAt: new Date(),
    ...overrides,
  };
}

// Usage
const admin = buildUser({ role: 'admin' });
const inactiveUser = buildUser({ active: false });
```

```python
# Python pattern (using factory_boy or manual)
def build_user(**overrides):
    defaults = {
        "id": uuid4(),
        "name": fake.name(),
        "email": fake.email(),
        "role": "member",
        "created_at": datetime.utcnow(),
    }
    return {**defaults, **overrides}
```

**Why factories over fixtures**: Fixtures are static JSON/YAML that go stale. Factories express intent ("give me an admin user"), are composable, and stay in sync with schema changes because they fail loudly when fields change.

### Database Factories (for integration tests)

For tests that need records in a real database, create factory functions that insert and return:

```javascript
async function createUser(overrides = {}) {
  const data = buildUser(overrides);
  return db.users.create({ data });
}
```

### Builder Pattern (for complex objects)

When objects have many optional fields or complex relationships:

```javascript
const order = new OrderBuilder()
  .withCustomer(customer)
  .withItems([item1, item2])
  .withDiscount(10)
  .build();
```

Use builders when factory overrides get unwieldy (more than 5-6 fields commonly overridden).
