# Common Bug Patterns

## Contents
- Universal patterns
- Async and concurrency bugs
- Data and state bugs
- Integration bugs
- Environment bugs

## Universal Patterns

**Off-by-one errors**: Loops that iterate one too many or too few times. Check `<` vs `<=`, `0` vs `1` starting indexes, and fence-post problems.

**Null/undefined reference**: Accessing a property of something that doesn't exist. Check: is the variable initialized? Could the query return no results? Is the API response missing a field?

**Type coercion**: Implicit conversions producing unexpected results. JavaScript `"5" + 3 === "53"`, Python `"5" * 3 === "555"`. Use strict equality and explicit conversions.

**Operator precedence**: `a || b && c` doesn't evaluate left-to-right in most languages. When in doubt, use parentheses.

**Mutable default arguments**: In Python, `def fn(items=[])` shares the same list across all calls. Use `None` as default and create inside the function.

## Async and Concurrency Bugs

**Unhandled promise rejection**: An async function throws, but nothing catches it. In Node.js, this can crash the process. Always add `.catch()` or use try/catch with await.

**Race condition**: Two operations depend on shared state, and the result varies based on timing. Signs: intermittent failures, works in debugger but fails at full speed. Fix: use locks, queues, or redesign to eliminate shared mutable state.

**Deadlock**: Two processes each wait for a resource the other holds. Signs: system hangs, no errors, no progress. Fix: consistent lock ordering, timeouts.

**Stale closure**: A callback captures a variable that changes before the callback runs. Common in loops with async operations. Fix: use block scoping (`let` in JS) or pass the value explicitly.

**N+1 query**: A loop makes one database query per item instead of a batch query. Signs: slow page load that scales with data size. Fix: eager loading, batch queries.

## Data and State Bugs

**State mutation side effect**: A function modifies an object that the caller didn't expect to change. Signs: object has wrong values "mysteriously". Fix: clone inputs or use immutable data structures.

**Timezone confusion**: Storing or comparing dates without consistent timezone handling. Signs: off-by-one-day errors, times shifted by a few hours. Fix: store everything in UTC, convert only for display.

**Encoding issues**: Characters display as garbage or question marks. Signs: works with ASCII, breaks with accented or CJK characters. Fix: use UTF-8 everywhere, specify encoding explicitly.

**Floating point precision**: `0.1 + 0.2 !== 0.3` in most languages. Fix: use integer arithmetic (cents instead of dollars), decimal libraries, or epsilon comparison.

**Cache staleness**: Application shows outdated data because a cache wasn't invalidated. Signs: data updates "eventually" or "after restart". Fix: explicit cache invalidation on writes.

## Integration Bugs

**API contract mismatch**: The client sends/expects data in a different format than the server provides. Signs: null fields, 400 errors, missing data. Fix: check the actual request/response (not the docs — they may be wrong).

**Connection pooling exhaustion**: Database connections aren't returned to the pool. Signs: app works fine, then suddenly can't connect to DB after running for a while. Fix: ensure connections are closed in finally blocks.

**Retry without idempotency**: A failed request is retried, but the original request actually succeeded. Signs: duplicate records, double charges. Fix: use idempotency keys.

**CORS**: Browser blocks a cross-origin request. Signs: works in Postman/curl, fails in browser. Fix: configure CORS headers on the server, not by disabling browser security.

## Environment Bugs

**Works on my machine**: Code behaves differently across environments. Common causes: different dependency versions, environment variable differences, OS-specific behavior (file paths, line endings).

**Missing environment variable**: App crashes or behaves unexpectedly because a config value isn't set. Fix: fail fast at startup with clear error messages for required config.

**Dependency version conflict**: Two packages require incompatible versions of a shared dependency. Signs: strange runtime errors that don't match the code. Fix: use lockfiles, check `node_modules` or `site-packages` for unexpected versions.
