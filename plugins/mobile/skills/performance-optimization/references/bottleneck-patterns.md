# Bottleneck Detection Patterns

## Contents
- Database bottlenecks
- Algorithmic bottlenecks
- Memory bottlenecks
- Network and I/O bottlenecks
- Frontend-specific bottlenecks
- Caching strategies

## Database Bottlenecks

### N+1 Query Problem

**Signature**: A loop that makes one database query per iteration.

```javascript
// BAD: N+1 — 1 query for orders + N queries for users
const orders = await db.orders.findMany();
for (const order of orders) {
  order.user = await db.users.findById(order.userId); // N queries!
}

// GOOD: Eager loading — 2 queries total
const orders = await db.orders.findMany({
  include: { user: true }
});

// GOOD: Batch loading — 2 queries total
const orders = await db.orders.findMany();
const userIds = [...new Set(orders.map(o => o.userId))];
const users = await db.users.findMany({ where: { id: { in: userIds } } });
const userMap = new Map(users.map(u => [u.id, u]));
orders.forEach(o => o.user = userMap.get(o.userId));
```

**How to detect**: Look for database calls inside loops, `.map()`, `.forEach()`, or Promise.all with individual queries. Also check ORM lazy-loading that triggers queries on property access.

### Missing Indexes

**Signature**: Slow queries on columns used in WHERE, JOIN, ORDER BY, or GROUP BY.

```sql
-- If this is slow, check if there's an index on user_id and created_at
SELECT * FROM orders
WHERE user_id = 123
ORDER BY created_at DESC
LIMIT 20;

-- Fix: Add a compound index
CREATE INDEX idx_orders_user_id_created_at ON orders(user_id, created_at DESC);
```

**How to detect**: Run `EXPLAIN ANALYZE` on slow queries. Look for "Seq Scan" on large tables — that usually means a missing index.

**Index rules of thumb:**
- Index columns in WHERE clauses that filter large tables
- Index columns in JOIN conditions
- Compound indexes should match the query's column order
- Don't index columns with very low cardinality (boolean flags on huge tables)
- Every index slows writes — don't over-index

### SELECT * Anti-pattern

**Signature**: Selecting all columns when only a few are needed.

```javascript
// BAD: Loads entire row including large text columns
const users = await db.query('SELECT * FROM users');

// GOOD: Only fetch what's needed
const users = await db.query('SELECT id, name, email FROM users');
```

Especially impactful when tables have large TEXT/BLOB columns or many unused columns.

### Unoptimized Pagination

**Signature**: Using OFFSET on large tables.

```sql
-- BAD: Database must scan and discard 100,000 rows
SELECT * FROM events ORDER BY created_at OFFSET 100000 LIMIT 20;

-- GOOD: Cursor-based — database seeks directly
SELECT * FROM events
WHERE created_at < '2025-01-15T10:00:00Z'
ORDER BY created_at DESC
LIMIT 20;
```

OFFSET performance degrades linearly with page number. Cursor-based pagination is O(1).

## Algorithmic Bottlenecks

### Hidden O(n²)

**Signature**: Nested loops over collections, often disguised as `.includes()`, `.find()`, or `.indexOf()` inside a loop.

```javascript
// BAD: O(n²) — includes() scans the array each time
const uniqueItems = [];
for (const item of items) {
  if (!uniqueItems.includes(item)) {
    uniqueItems.push(item);
  }
}

// GOOD: O(n) — Set has O(1) lookup
const uniqueItems = [...new Set(items)];
```

```javascript
// BAD: O(n*m) — find() inside map()
const enriched = orders.map(order => ({
  ...order,
  user: users.find(u => u.id === order.userId) // O(m) per order
}));

// GOOD: O(n+m) — build lookup map first
const userMap = new Map(users.map(u => [u.id, u]));
const enriched = orders.map(order => ({
  ...order,
  user: userMap.get(order.userId) // O(1) per order
}));
```

### Unnecessary Computation

**Signature**: Recalculating something in every request/loop that doesn't change.

```javascript
// BAD: Parsing config on every request
app.get('/data', (req, res) => {
  const config = JSON.parse(fs.readFileSync('config.json')); // Every request!
  // ...
});

// GOOD: Parse once at startup
const config = JSON.parse(fs.readFileSync('config.json'));
app.get('/data', (req, res) => {
  // Use pre-parsed config
});
```

## Memory Bottlenecks

### Loading Entire Datasets

**Signature**: Reading all rows into memory instead of streaming or paginating.

```javascript
// BAD: Loads 1M rows into memory
const allUsers = await db.users.findMany();
const csv = allUsers.map(u => `${u.name},${u.email}`).join('\n');

// GOOD: Stream rows
const stream = db.users.stream();
for await (const user of stream) {
  writeChunk(`${user.name},${user.email}\n`);
}
```

### Unbounded Caches

**Signature**: In-memory cache with no size limit or eviction policy.

```javascript
// BAD: Grows forever
const cache = {};
function getData(key) {
  if (!cache[key]) cache[key] = fetchExpensiveData(key);
  return cache[key];
}

// GOOD: LRU cache with max size
const cache = new LRUCache({ max: 1000, ttl: 1000 * 60 * 5 });
```

### Event Listener Leaks

**Signature**: Adding event listeners without removing them, especially in loops or on repeated operations.

```javascript
// BAD: Adds a new listener every time this function runs
function setupHandler() {
  emitter.on('data', handleData); // Accumulates!
}

// GOOD: Remove before adding, or add once
function setupHandler() {
  emitter.removeListener('data', handleData);
  emitter.on('data', handleData);
}
```

## Network and I/O Bottlenecks

### Sequential External Calls

**Signature**: Awaiting multiple independent API calls one after another.

```javascript
// BAD: 3 sequential calls — total time = sum of all three
const user = await fetchUser(id);
const orders = await fetchOrders(id);
const recommendations = await fetchRecommendations(id);

// GOOD: Parallel — total time = slowest of the three
const [user, orders, recommendations] = await Promise.all([
  fetchUser(id),
  fetchOrders(id),
  fetchRecommendations(id),
]);
```

### Large Payloads

**Signature**: API responses that include data the client doesn't use.

- Return only the fields the client needs (field selection / sparse fieldsets)
- Compress responses (gzip/brotli)
- Paginate collections
- Use appropriate image sizes and formats

### Missing Connection Pooling

**Signature**: Creating a new database connection per request instead of reusing from a pool.

Most ORMs handle this, but verify: is the pool configured? Is the max size appropriate for the workload? Are connections returned to the pool after use?

## Frontend-Specific Bottlenecks

- **Unoptimized images**: Serve WebP/AVIF, lazy-load below-the-fold images, use srcset for responsive sizes
- **Bundle size**: Tree-shake unused code, code-split by route, analyze with `webpack-bundle-analyzer` or `source-map-explorer`
- **Render blocking**: Defer non-critical JS/CSS, inline critical CSS, preload key assets
- **Excessive re-renders**: In React — memoize expensive components, avoid creating objects/functions in render, use proper keys in lists
- **Layout thrashing**: Reading then writing DOM properties in a loop forces the browser to recalculate layout repeatedly

## Caching Strategies

| Strategy | Use When | Watch Out For |
|----------|----------|---------------|
| **HTTP caching** (Cache-Control, ETag) | Static assets, rarely-changing responses | Stale data served to users |
| **Application cache** (Redis, Memcached) | Expensive queries, computed results | Cache invalidation complexity |
| **In-memory cache** (LRU) | Hot data, single-instance apps | Memory pressure, stale data |
| **CDN** | Static assets, public API responses | Purging on update |
| **Database query cache** | Read-heavy workloads | Invalidated on any write (may not help) |

**Cache invalidation rules:**
- Write-through: Update cache on every write (consistent but slower writes)
- Write-behind: Queue cache updates asynchronously (fast writes, eventually consistent)
- TTL-based: Let entries expire after a time (simplest, acceptable staleness)
- Event-driven: Invalidate on specific events (most precise, most complex)

Start with TTL-based caching. Only add complexity if staleness is unacceptable.
