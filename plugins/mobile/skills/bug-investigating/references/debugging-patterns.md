# Debugging Patterns

## Hypothesis-Driven Debugging

The scientific method applied to bugs:

1. **Observe**: Collect all available evidence (error messages, logs, stack traces, reproduction steps)
2. **Hypothesize**: Form a falsifiable explanation — "I think X is happening because Y"
3. **Predict**: "If my hypothesis is correct, then when I do Z, I should see W"
4. **Test**: Run the experiment — add a log, check a value, change an input
5. **Conclude**: If the prediction was wrong, update or discard the hypothesis

Never skip step 3. A test without a prediction teaches you nothing useful — you don't know what result would confirm or deny the hypothesis.

## Narrowing Techniques

### Binary search in code
Add an assertion or log at the midpoint of the suspected code path. If state is correct there, the bug is downstream. If wrong, upstream. Repeat until the exact line is isolated.

### Git bisect (regression bugs)
```bash
git bisect start
git bisect bad              # current commit is broken
git bisect good <hash>      # this commit was known-good
# git checks out midpoint — test it, then:
git bisect good             # or: git bisect bad
# Repeat until git identifies the culprit commit
git bisect reset            # return to HEAD
```

### Input reduction (data-dependent bugs)
Start with the full failing input. Remove half of it. Still fails? Remove another half. When it passes, the removed part was essential. Binary search until you have the minimum failing case.

## Bug Categories and Where to Look

### Off-by-one errors
- Loop bounds: `< len` vs `<= len`, `0` vs `1` as starting index
- String/array slicing: `[0:n]` vs `[0:n+1]`
- Fence-post problems: n items need n-1 gaps, or n+1 fences
- Symptom: Wrong count, missing last element, processing one extra item

### Null / undefined reference
- Cause: Assuming a value exists when it can be absent
- Check: Where does this value come from? Can that source ever return null?
- Fix: Validate at the boundary where data enters, not at every use site

### Type coercion / comparison bugs
- JavaScript `==` vs `===`, Python `is` vs `==`
- Integer vs float comparison (`0.1 + 0.2 != 0.3`)
- String-to-number coercion in dynamic languages

### Race conditions
- Symptom: Intermittent failure, passes when you add logging (logging adds timing)
- Look for: Shared mutable state accessed from multiple threads/async contexts
- Tools: Thread sanitizers, sleep injection to exaggerate timing windows

### State mutation bugs
- Symptom: Correct result first call, wrong result on second call
- Look for: Global state, cached values that aren't invalidated, objects mutated in place

### N+1 query bugs
- Symptom: Slow with many records, fast with few
- Look for: Database queries inside loops
- Tool: Query logging (`EXPLAIN ANALYZE`, ORM query counting in tests)

### Async / Promise bugs (JavaScript/TypeScript)
- Unhandled promise rejection: Missing `await` or `.catch()`
- Stale closure: `async` callback captures variable value at creation time, not call time
- Fire-and-forget: `async` function called without `await`, caller proceeds before it completes

## Language-Specific Tips

### JavaScript / TypeScript
- `console.dir(obj, {depth: null})` — print nested objects fully
- `debugger` statement + Chrome DevTools or Node `--inspect`
- `JSON.stringify(obj, null, 2)` for serializable objects
- TypeScript: Read the type error message carefully — it tells you exactly what's wrong

### Python
- `import pdb; pdb.set_trace()` — interactive debugger
- `breakpoint()` — Python 3.7+ shorthand
- `print(repr(value))` — shows exact type and value, including whitespace
- `traceback.print_exc()` — print exception from except block

### Go
- `fmt.Printf("%+v\n", struct)` — print struct with field names
- `fmt.Printf("%T\n", value)` — print type
- Delve debugger: `dlv debug ./cmd/myapp`
- Race detector: `go test -race ./...`

### SQL
- `EXPLAIN ANALYZE <query>` — shows actual execution plan and row counts
- Check for sequential scans on large tables (missing index)
- Check for `N+1` by counting queries in test logs
