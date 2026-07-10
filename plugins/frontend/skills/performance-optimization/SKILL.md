---
name: performance-optimization
description: "Identify and resolve performance bottlenecks via static analysis — N+1 queries, algorithmic complexity, query optimization, caching, memory leaks, bundle size, connection management. Triggers: this is slow, optimize, performance, N+1, query optimization, caching, bundle size, memory leak, latency, response time, scale, bottleneck."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Performance Optimization

Identify and resolve performance bottlenecks through static analysis and design review. Good performance optimization is measurement-driven — identify the bottleneck first, optimize second.

## Core Rule

**Never optimize without understanding the bottleneck.** Random optimization wastes time and often makes things worse. The workflow is always: measure → identify → optimize → verify.

## Workflow

### Step 1: Understand the Problem

Before touching code, establish baselines:

- **What is slow?** Specific endpoint, page load, batch job, query?
- **How slow?** Current latency/throughput numbers (or perceived slowness)
- **What's acceptable?** Target latency, throughput, or response time
- **When did it start?** Was it always slow, or is this a regression?
- **Under what conditions?** Load-dependent, data-size-dependent, time-dependent?

If the user doesn't have measurements, help them instrument first (see Step 2). Optimization without measurement is guessing.

### Step 2: Identify the Bottleneck

The bottleneck is almost always in one of these areas. Check in this order (most common first):

1. **Database queries** — N+1 problems, missing indexes, full table scans, unoptimized joins
2. **External API calls** — Sequential calls that could be parallel, no caching of responses
3. **Algorithmic complexity** — O(n²) or worse hiding in loops, nested iterations over large datasets
4. **Memory usage** — Leaks, loading entire datasets into memory, unbounded caches
5. **Network/I/O** — Large payloads, no compression, chatty protocols, missing CDN
6. **Serialization** — Expensive JSON parsing/generation, unnecessary data transformation
7. **Concurrency issues** — Race conditions, lock contention, thread pool exhaustion, async bottlenecks. See [references/concurrency.md](references/concurrency.md) for patterns and common bugs.

See [references/bottleneck-patterns.md](references/bottleneck-patterns.md) for the detailed detection guide.

### Step 3: Analyze and Recommend

For each identified bottleneck:

1. **Explain** what the problem is and why it causes slowness
2. **Quantify** the impact (e.g., "This makes 50 DB queries per page load instead of 2")
3. **Propose** a specific fix with expected improvement
4. **Assess** the complexity and risk of the fix

Order recommendations by impact-to-effort ratio. The best optimizations are high impact and low effort.

### Step 4: Implement the Fix

Apply one optimization at a time. For each:

1. Write or confirm a performance test exists (even a simple timing assertion)
2. Apply the change
3. Verify the improvement
4. Check for regressions (functional tests still pass, other paths not degraded)

### Step 5: Verify and Document

After optimization:
- Compare before/after metrics
- Document what was changed and why (this prevents someone from "cleaning up" the optimization later)
- Set up monitoring to alert if performance regresses

## Anti-patterns

- **Premature optimization**: Don't optimize code that runs once at startup or handles 10 requests/day
- **Micro-optimization**: Don't optimize individual array operations when the real bottleneck is a database query taking 2 seconds
- **Caching everything**: Caches add complexity and staleness bugs. Cache only what's measured as slow and frequently accessed
- **Optimizing the wrong layer**: Frontend optimization won't fix a slow API. Database optimization won't fix a slow algorithm
- **Sacrificing readability**: If the optimization makes the code unmaintainable, it's a bad trade unless the performance gain is critical

## Principles Applied

- **KISS**: The simplest optimization that meets the target wins. Don't build a distributed cache when a database index will do.
- **YAGNI**: Optimize for current scale, not hypothetical future scale. Document triggers for when to revisit.
- **DRY**: Centralize caching logic, query optimization, and connection management — don't optimize the same pattern in 10 places.
