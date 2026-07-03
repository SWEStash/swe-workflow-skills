# Concurrency Reference

## Contents
- Separating concurrency from business logic
- Limiting shared mutable state
- Concurrency models
- Common concurrency bugs
- Testing concurrent code

## Separating Concurrency from Business Logic

Concurrency is inherently difficult — it changes the behavior of otherwise correct code in subtle ways. Keep concurrent code separate from business logic so that each can be reasoned about independently.

Principles:
- **Business logic should be pure**: Functions that compute business rules should not manage threads, locks, or async coordination. They take input and return output.
- **Concurrency is a deployment concern**: The decision to run code in parallel belongs to the orchestration layer, not the domain layer.
- **Single Responsibility applies**: A class that manages thread safety AND implements business rules has two reasons to change.

In practice:
- Write business logic as synchronous, pure functions
- Wrap concurrent execution in an orchestration layer (executor service, task queue, event loop)
- Use the Humble Object pattern: the concurrent wrapper is humble (hard to test but simple), the business logic is testable

## Limiting Shared Mutable State

Most concurrency bugs stem from shared mutable state — two threads reading and writing the same data without proper coordination.

Strategies to eliminate or reduce shared state (ordered by preference):

1. **Immutable data**: If data cannot change, it can be shared freely without synchronization. Use `const`, `final`, frozen objects, or immutable data structures.

2. **Message passing**: Instead of sharing state, send copies of data between concurrent tasks. Actor models (Erlang, Akka), channels (Go, Rust), and async queues follow this pattern.

3. **Thread-local / task-local storage**: Each concurrent task gets its own copy. No sharing, no coordination needed.

4. **Synchronized access**: When sharing is unavoidable, protect with mutexes, locks, or atomic operations. This is the last resort — it's correct but slow and error-prone.

**Rule of thumb**: If you need more than one lock to protect an operation, redesign the data model so the operation only touches one piece of shared state.

## Concurrency Models

Different concurrency models suit different problems. Choose based on the workload:

**Threads / OS processes**: Best for CPU-bound work that benefits from true parallelism. Heavy resource cost per thread. Risk of races and deadlocks with shared state.

**Async/await (event loop)**: Best for I/O-bound work (network calls, file I/O, database queries). Single-threaded concurrency — no shared state issues, but CPU-bound work blocks the loop.

**Goroutines / green threads**: Lightweight threads managed by the runtime. Good balance of parallelism and low overhead. Still require discipline with shared state (channels preferred).

**Actor model**: Each actor has private state and communicates via messages. Eliminates shared state by design. Good for distributed systems and complex state machines.

**Fork-join / work stealing**: Best for recursive divide-and-conquer problems. The runtime distributes sub-tasks across threads. Common in parallel stream/collection processing.

## Common Concurrency Bugs

### Race conditions
Two tasks access shared state and the outcome depends on execution order. The code works "most of the time" but fails under load or on different hardware.

Detection: Non-deterministic test failures, bugs that disappear under debugger (which changes timing), inconsistent data in production.

Prevention: Eliminate shared mutable state, use atomic operations, or protect with proper synchronization.

### Deadlocks
Two tasks each hold a lock the other needs. Both wait forever.

Prevention:
- Always acquire locks in the same order across the codebase
- Use timeouts on lock acquisition
- Prefer lock-free data structures when possible
- Reduce the number of locks (redesign to reduce shared state)

### Livelocks
Tasks keep responding to each other without making progress — like two people sidestepping in a hallway.

Prevention: Add randomized backoff to retry logic. Ensure at least one task can make progress.

### Starvation
A task never gets the resources it needs because other tasks monopolize them.

Prevention: Use fair scheduling, bounded queues, and priority mechanisms. Monitor task latency distributions for signs of starvation.

### Thread pool exhaustion
All threads in a pool are blocked waiting for I/O or downstream services. New work cannot be accepted.

Prevention: Size pools appropriately, use non-blocking I/O for network calls, add circuit breakers for slow dependencies, separate pools for different workload types.

## Testing Concurrent Code

Concurrency bugs are notoriously hard to reproduce. Standard unit tests often pass because they run too fast to trigger race conditions.

Strategies:

**Stress tests**: Run the same operation from many threads/tasks simultaneously. Repeat thousands of times. Bugs that occur "1 in 1000" will surface.

**Deterministic testing**: Use test frameworks that control thread scheduling (e.g., `ThreadSanitizer`, `loom` for Rust, `Lincheck` for Kotlin). These systematically explore different interleavings.

**Invariant checking**: Instead of asserting specific outcomes, assert invariants that must hold regardless of execution order. "Account balance is never negative" rather than "balance equals 42."

**Timeout-based detection**: If a test hangs instead of failing, a deadlock is likely. Set aggressive timeouts on concurrent tests.

**Race detectors**: Use runtime tools (`-race` flag in Go, ThreadSanitizer for C/C++/Rust, Java's `jcstress`) to detect data races automatically.
