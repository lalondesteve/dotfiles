---
name: tdd
description: Test-driven development. Use when the user wants to build features or fix bugs test-first, mentions "red-green-refactor", or wants integration tests.
---

# Test-Driven Development

## Philosophy

**Core principle**: Tests should verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't.

**Good tests** are integration-style: they exercise real code paths through public APIs. They describe _what_ the system does, not _how_ it does it. A good test reads like a specification - "user can checkout with valid cart" tells you exactly what capability exists. These tests survive refactors because they don't care about internal structure.

**Bad tests** are coupled to implementation. They mock internal collaborators, test private methods, or verify through external means (like querying a database directly instead of using the interface). The warning sign: your test breaks when you refactor, but behavior hasn't changed. If you rename an internal function and tests fail, those tests were testing implementation, not behavior.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## Seams -- where tests go

A **seam** is the location where a module's public interface lives. Tests cross that seam through the interface, exercising and observing behaviour without reaching into implementation details. Test each behaviour at the highest practical seam that exposes it.

- Prefer an existing seam to introducing a new one.
- Do not expose an internal collaborator solely to make it testable.
- If the correct seam is unclear or the current interface cannot express the behaviour, load the `codebase-design` skill before writing tests.
- Ask the user to resolve a seam only when the request and repository context do not provide enough information to choose confidently.

## Anti-Patterns

### Horizontal slices

**DO NOT write all tests first, then all implementation.** This is "horizontal slicing" - treating RED as "write all tests" and GREEN as "write all code."

This produces **crap tests**:

- Tests written in bulk test _imagined_ behavior, not _actual_ behavior
- You end up testing the _shape_ of things (data structures, function signatures) rather than user-facing behavior
- Tests become insensitive to real changes - they pass when behavior breaks, fail when behavior is fine
- You outrun your headlights, committing to test structure before understanding the implementation

**Correct approach**: Vertical slices via tracer bullets. One test -> one implementation -> repeat. Each test responds to what you learned from the previous cycle. Because you just wrote the code, you know exactly what behavior matters and how to verify it.

```
WRONG (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

RIGHT (vertical):
  RED->GREEN: test1->impl1
  RED->GREEN: test2->impl2
  RED->GREEN: test3->impl3
  ...
```

### Tautological tests

Do not compute the expected value with the same algorithm as the implementation. Such a test can agree with incorrect code by construction. Expected values must come from an independent source: a known literal, worked example, specification, or externally verified fixture.

## Workflow

### 1. Planning

When exploring the codebase, read `CONTEXT.md` (if it exists) so that test names and interface vocabulary match the project's domain language, and respect ADRs in the area you're touching.

Before writing code:

- Identify the observable behavior being added or corrected.
- Identify the highest practical public seam through which to test it.
- Check existing tests and repository conventions for prior art.
- List the behavior-focused tests needed, prioritizing critical paths.
- Load the `codebase-design` skill when the interface or seam itself requires design work.

Ask the user about the interface, behavior priorities, or test strategy only when the request and repository context do not provide enough information to proceed confidently. When requirements are clear, proceed directly with the first RED -> GREEN tracer bullet and state any reasonable assumptions in the final response.

**You can't test everything.** Focus testing effort on the critical paths and complex logic identified by the request and repository context. Ask the user to prioritise only when those sources leave materially different testing choices.

### 2. Tracer Bullet

Write ONE test that confirms ONE thing about the system:

```
RED:   Write test for first behavior -> test fails
GREEN: Write minimal code to pass -> test passes
```

This is your tracer bullet - proves the path works end-to-end.

### 3. Incremental Loop

For each remaining behavior:

```
RED:   Write next test -> fails
GREEN: Minimal code to pass -> passes
```

Rules:

- One test at a time
- Only enough code to pass current test
- Don't anticipate future tests
- Keep tests focused on observable behavior

### 4. Refactor

After all tests pass, look for [refactor candidates](refactoring.md):

- [ ] Extract duplication
- [ ] Deepen modules (move complexity behind simple interfaces)
- [ ] Apply SOLID principles where natural
- [ ] Consider what new code reveals about existing code
- [ ] Run tests after each refactor step

**Never refactor while RED.** Get to GREEN first.

## Checklist Per Cycle

```
[ ] Test describes behavior, not implementation
[ ] Test uses public interface only
[ ] Test would survive internal refactor
[ ] Code is minimal for this test
[ ] No speculative features added
```
