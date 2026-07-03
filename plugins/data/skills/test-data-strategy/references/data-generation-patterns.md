# Data Generation Patterns

## Contents
- Factory patterns by language
- Property-based testing frameworks
- Synthetic data generation
- Contract testing patterns
- Privacy-safe data patterns
- Load test data patterns

## Factory Patterns by Language

### JavaScript/TypeScript (with Faker.js)

```typescript
import { faker } from '@faker-js/faker';

// Layer 1: Build (in-memory objects)
export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    role: 'member',
    active: true,
    createdAt: faker.date.past(),
    ...overrides,
  };
}

export function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    items: [buildOrderItem(), buildOrderItem()],
    total: 0, // calculated below
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  };
}

// Layer 2: Create (persisted to database)
export async function createUser(overrides: Partial<User> = {}): Promise<User> {
  const data = buildUser(overrides);
  return db.users.create({ data });
}

// Layer 3: Scenario builders
export async function createCheckoutScenario() {
  const user = await createUser({ active: true });
  const products = await Promise.all([
    createProduct({ price: 1999 }),
    createProduct({ price: 3499 }),
  ]);
  const cart = await createCart({ userId: user.id, items: products });
  const paymentMethod = await createPaymentMethod({ userId: user.id });

  return { user, products, cart, paymentMethod };
}
```

### Python (with Faker + factory_boy)

```python
import factory
from faker import Faker

fake = Faker()

# Layer 1: Build
def build_user(**overrides):
    defaults = {
        "id": fake.uuid4(),
        "name": fake.name(),
        "email": fake.email(),
        "role": "member",
        "active": True,
        "created_at": fake.date_time_this_year(),
    }
    return {**defaults, **overrides}

# Layer 2: Create (with factory_boy + SQLAlchemy)
class UserFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session = session

    name = factory.LazyFunction(fake.name)
    email = factory.LazyFunction(fake.email)
    role = "member"
    active = True

# Usage:
admin = UserFactory(role="admin")
inactive = UserFactory(active=False)

# Layer 3: Scenario
def create_checkout_scenario(session):
    user = UserFactory(active=True)
    products = [ProductFactory(price=1999), ProductFactory(price=3499)]
    cart = CartFactory(user=user, items=products)
    return {"user": user, "products": products, "cart": cart}
```

## Property-Based Testing Frameworks

### JavaScript: fast-check

```typescript
import fc from 'fast-check';

// Roundtrip property: JSON parse/stringify
test('JSON roundtrip preserves data', () => {
  fc.assert(
    fc.property(fc.jsonValue(), (value) => {
      expect(JSON.parse(JSON.stringify(value))).toEqual(value);
    })
  );
});

// Invariant: sort preserves length
test('sort preserves array length', () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      expect([...arr].sort((a, b) => a - b).length).toBe(arr.length);
    })
  );
});

// Custom arbitrary for domain objects
const userArbitrary = fc.record({
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.emailAddress(),
  age: fc.integer({ min: 0, max: 150 }),
});

test('user validation accepts all valid users', () => {
  fc.assert(
    fc.property(userArbitrary, (user) => {
      expect(validateUser(user).isValid).toBe(true);
    })
  );
});
```

### Python: Hypothesis

```python
from hypothesis import given, strategies as st

# Roundtrip
@given(st.text())
def test_encode_decode_roundtrip(s):
    assert decode(encode(s)) == s

# Invariant
@given(st.lists(st.integers()))
def test_sort_preserves_length(lst):
    assert len(sorted(lst)) == len(lst)

# Custom strategy
user_strategy = st.fixed_dictionaries({
    "name": st.text(min_size=1, max_size=100),
    "email": st.emails(),
    "age": st.integers(min_value=0, max_value=150),
})

@given(user_strategy)
def test_user_validation(user):
    result = validate_user(user)
    assert result.is_valid
```

## Synthetic Data Generation

### For staging environments (Faker at scale)

```python
import pandas as pd
from faker import Faker

fake = Faker()
Faker.seed(42)  # Reproducible!

def generate_users(n=10000):
    return pd.DataFrame([{
        "id": f"usr_{i:06d}",
        "name": fake.name(),
        "email": fake.email(),
        "country": fake.country_code(),
        "signup_date": fake.date_between("-2y", "today"),
        "plan": fake.random_element(["free", "pro", "enterprise"]),
        "active": fake.boolean(chance_of_getting_true=85),
    } for i in range(n)])

def generate_orders(users_df, avg_orders_per_user=5):
    orders = []
    for _, user in users_df.iterrows():
        n_orders = max(0, int(fake.random.gauss(avg_orders_per_user, 2)))
        for _ in range(n_orders):
            orders.append({
                "id": fake.uuid4(),
                "user_id": user["id"],
                "amount": round(fake.random.uniform(5, 500), 2),
                "status": fake.random_element(["completed", "pending", "refunded"]),
                "created_at": fake.date_between(user["signup_date"], "today"),
            })
    return pd.DataFrame(orders)
```

### Statistical distributions for realistic data

Don't use uniform random for everything. Real data has distributions:
- User activity → Power law (few super-active users, long tail of inactive)
- Transaction amounts → Log-normal (many small, few large)
- Time of day → Bimodal (peaks in morning and evening)
- Geographic → Clustered (real users aren't uniformly distributed)

Use numpy or scipy for realistic distributions:
```python
import numpy as np

# Log-normal transaction amounts (mean ~$50, long tail to $10K)
amounts = np.random.lognormal(mean=3.9, sigma=1.2, size=10000)
amounts = np.clip(amounts, 1, 10000).round(2)
```

## Contract Testing Patterns

### Pact (consumer-driven contracts)

Contract testing verifies that two services agree on the data format at their boundary, without requiring both to be running.

**Consumer side** (the service that CALLS the API):
```javascript
const { PactV3 } = require('@pact-foundation/pact');

const provider = new PactV3({ consumer: 'OrderService', provider: 'UserService' });

test('get user by ID', async () => {
  provider
    .given('user 42 exists')
    .uponReceiving('a request for user 42')
    .withRequest({ method: 'GET', path: '/users/42' })
    .willRespondWith({
      status: 200,
      body: { id: 42, name: string('Jane'), email: email() },
    });

  await provider.executeTest(async (mockServer) => {
    const user = await userClient.getUser(42, mockServer.url);
    expect(user.name).toBe('Jane');
  });
});
```

**Provider side** (the service that SERVES the API):
```javascript
const { Verifier } = require('@pact-foundation/pact');

test('verify contracts', async () => {
  await new Verifier({
    providerBaseUrl: 'http://localhost:3000',
    pactUrls: ['./pacts/orderservice-userservice.json'],
    stateHandlers: {
      'user 42 exists': async () => { await createUser({ id: 42, name: 'Jane' }); },
    },
  }).verifyProvider();
});
```

## Privacy-Safe Data Patterns

### Strategy selection

| Scenario | Recommended Approach |
|----------|---------------------|
| Unit tests | Factories (no real data involved) |
| Integration tests | Factories + test database (created fresh per suite) |
| Staging environment | Synthetic generation at scale |
| Performance testing | Synthetic with realistic distributions |
| Bug reproduction | Masked production subset (anonymize PII first) |

### Masking techniques

| Data Type | Masking Method |
|-----------|---------------|
| Email | `john.doe@company.com` → `user_a1b2@test.example.com` |
| Name | `John Doe` → `Person_82947` or Faker-generated name |
| Phone | `555-123-4567` → `555-000-XXXX` |
| SSN | `123-45-6789` → `XXX-XX-6789` (keep last 4 if needed) |
| Address | Replace with Faker address in same country/region |
| Credit card | `4111...1234` → `4111...0000` (keep BIN, zero out rest) |
| Date of birth | Shift by random offset (preserve age distribution) |

### Deterministic seeding for reproducibility

Always seed random generators in test data scripts:
```python
Faker.seed(42)
np.random.seed(42)
random.seed(42)
```

Commit the seed value. Tests using seeded factories produce the same data every run, making failures reproducible.

## Load Test Data Patterns

### Pre-seeding for load tests (k6 example)

```javascript
// data/users.json — pre-generated, committed or generated in CI
// Generate with: node scripts/generate-load-test-data.js > data/users.json

import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function () {
  return JSON.parse(open('./data/users.json'));
});

export default function () {
  const user = users[__VU % users.length]; // Each VU gets a different user
  const res = http.post('https://api.example.com/login', JSON.stringify({
    email: user.email,
    password: user.password,
  }));
  check(res, { 'login succeeded': (r) => r.status === 200 });
}
```

### Data volume guidelines

| Test Type | Typical Data Volume |
|-----------|-------------------|
| Smoke test | 10-50 records |
| Load test | 10K-100K records |
| Stress test | 100K-1M records |
| Soak test | 100K records, sustained over hours |

Generate data before the test run, not during. Creating data during a load test contaminates the results (you're measuring data creation speed, not application performance).
