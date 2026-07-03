# Error Handling Reference

## Contents
- Exceptions over error codes
- Don't return null
- Don't pass null
- Provide context in exceptions
- Define exceptions by caller's needs
- Never swallow exceptions

## Exceptions Over Error Codes

Prefer exceptions (or Result/Either types in functional languages) over returning error codes. Error codes force the caller to check the result immediately, cluttering the happy path with conditional logic.

**With error codes** (hard to read, easy to forget):
```
result = saveOrder(order)
if result == ERROR_VALIDATION:
    handleValidation()
elif result == ERROR_DB:
    handleDbError()
elif result == SUCCESS:
    continue()
```

**With exceptions** (clean happy path):
```
try:
    saveOrder(order)
    sendConfirmation(order)
except ValidationError as e:
    handleValidation(e)
except DatabaseError as e:
    handleDbError(e)
```

The exception approach separates the happy path from error handling, making both easier to read and maintain. The caller can also choose to let exceptions propagate rather than handling every error locally.

In languages with Result types (Rust, Kotlin, modern TypeScript), prefer those — they provide the same separation while making error handling explicit in the type system.

## Don't Return Null

Returning null forces every caller to add a null check. One forgotten check means a null pointer exception at runtime, often far from the source.

Instead of returning null:
- **Empty collection**: Return `[]` instead of null for "no results" — callers can iterate safely
- **Optional/Maybe type**: Use `Optional<User>` instead of `User?` when absence is a valid business case — makes the possibility explicit in the type
- **Null Object pattern**: Return a no-op implementation instead of null (e.g., `NullLogger` that discards messages)
- **Throw an exception**: If the absence indicates an error condition, throw rather than returning null

The goal is to make the absence of a value explicit and safe to handle, rather than a trap waiting to crash.

## Don't Pass Null

Passing null as a function argument is worse than returning it — it pushes the defensive checking responsibility into the callee, and every function in the chain must guard against it.

When you're tempted to pass null:
- Use an overloaded method or default parameter instead
- Introduce a Null Object or "empty" value
- Redesign the API so the parameter isn't needed in that case

In languages without null safety (Java, JavaScript), establish a convention: public API methods never accept null. This eliminates an entire class of bugs.

## Provide Context in Exceptions

An exception should tell you everything needed to understand the failure without reading the source code:
- **What operation failed**: "Failed to save order"
- **What input caused the failure**: "Order ID: 12345, User: jane@example.com"
- **Why it failed**: "Database connection timeout after 30s"

Bad: `throw new RuntimeException("Error")`
Good: `throw new OrderPersistenceException("Failed to save order 12345: connection timeout after 30s", cause)`

Include the original exception as the cause — stack traces that start at the catch site instead of the error site are useless for debugging.

## Define Exceptions by Caller's Needs

Don't create exception hierarchies based on the source of the error. Create them based on what the caller needs to do about it.

The caller typically has 3-4 responses to an error:
1. **Retry** (transient failure) — network timeout, lock contention
2. **Report to user** (validation failure) — bad input, missing required fields
3. **Abort operation** (unrecoverable) — corrupt data, missing configuration
4. **Ignore/degrade** (optional failure) — analytics failed, cache miss

Design your exception types around these responses. A single `AppException` with a severity/category field is often better than dozens of specific exception classes that all get handled the same way.

When wrapping third-party exceptions, translate them into your domain's exception types. Callers shouldn't need to know whether the failure came from PostgreSQL, MongoDB, or a REST API — they need to know whether to retry, report, or abort.

## Never Swallow Exceptions

An empty catch block is a bug waiting to happen. The exception represents a condition the system couldn't handle, and silently ignoring it means the system is now in an unknown state.

```
// Never do this
try {
    processPayment(order)
} catch (Exception e) {
    // TODO: handle later
}
```

If you genuinely need to catch and continue:
- **Log the exception** with enough context to diagnose later
- **Add a comment explaining why** ignoring this specific error is safe
- **Be specific** about which exception you're catching — never catch the base Exception/Error type to ignore it

The only acceptable empty catch is `InterruptedException` restoration in Java threading, and even that should restore the interrupt flag.
