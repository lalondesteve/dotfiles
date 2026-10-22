---
name: implement
description: Use when the user asks to implement a task, ticket, feature, bug fix, or milestone. Delegate focused implementation work to subagents and keep the main context for coordination, integration, verification, and review.
---

# Implement

Apply this workflow to authorized implementation. A plan or ticket alone does
not authorize code changes. Respect the user's current scope, repository
instructions, permissions, and existing work.

Read the applicable instructions, agreed task, relevant code, and working-tree
status. Reuse established decisions instead of reopening them. Investigate
questions the repository can answer; ask the user about consequential choices
that remain unresolved.

## Keep changes small

When modifying existing code, prefer the smallest coherent change that meets
the acceptance criteria and fits the surrounding design. Reuse existing
interfaces and conventions. Avoid unrelated cleanup, broad refactors, and
speculative abstractions.

Do not introduce dead code or leave obsolete implementations alongside their
replacements. Remove code made unused by your change when it falls within
scope; preserve unrelated work.

Avoid duplicating logic when an existing implementation can be reused.
Consolidate repeated patterns when they represent the same responsibility
and are expected to change together. Keep repetition when sharing would
obscure behavior, couple independent concerns, or require a premature
abstraction. Do not expand the task merely to eliminate duplication.

## Divide and delegate

Break the work into small, independently verifiable outcomes. Prefer vertical
tracer bullets that exercise working behavior across the necessary layers.
Resolve uncertain shared contracts with an initial narrow path before
parallelizing dependent work. Do not force mechanical changes into artificial
end-to-end slices.

Delegate implementation to focused subagents by default. Use
`senior_implementer` for behavioral changes, debugging, and non-trivial
refactors; use `code_worker` for isolated edits whose exact change is known.
Use read-only exploration or research agents for bounded questions. Follow
the available agents' descriptions and permissions rather than hard-coding
models or assuming a particular roster exists.

Give each worker the goal, relevant paths and findings, contracts, acceptance
criteria, exclusions, and verification responsibilities. Include the small-change
and code-reuse constraints above. Pass enough context to work independently,
not the full conversation. Ask for a concise report of changed files,
acceptance evidence, commands and results, and blockers.

Keep the main context focused on decisions, task status, integration, and
review. Read targeted code and diffs when needed to judge the result; do not
repeat the worker's entire investigation. Start a fresh worker for a distinct
task when accumulated context would obscure it. Do not create extra agents
for ceremonial steps.

Run independent work in parallel only when contracts are settled and file
ownership is clear. Serialize overlapping edits and dependent changes.
Track every delegated task until it returns a result or an explicit blocker.
If a worker is interrupted or repeats an unsuccessful approach, inspect the
partial work and narrow the remaining task instead of blindly restarting it.

## Verify and review

For behavior changes, use a focused failing test, make the smallest correct
implementation, and verify the result. Derive expectations from requirements
or independently worked examples. Explain meaningful verification gaps rather
than weakening the acceptance criteria.

Assign verification ownership. Reuse fresh worker evidence for unchanged
code instead of automatically rerunning the same commands. Run combined
integration checks and repeat checks when relevant code changed, evidence
is incomplete, or a specific risk justifies it. Distinguish worker-reported
results from checks the main agent ran.

Review the resulting diff and behavior against the agreed scope. Check for
unnecessary changes, dead code, obsolete paths, and unjustified duplication
or abstraction. Keep the main agent responsible for the final assessment.
Use additional independent or critical review when the risk or intertwined
changes justify it, not after every task. Avoid automatic reviewer chains
and repeated full reviews; verify targeted fixes unless they introduce
broader risk.

## Finish

Finish with the implemented behavior, evidence against the acceptance
criteria, remaining limitations, and working-tree state. Update affected
existing documentation when it is within scope. Commit or push only when
the current request or applicable project instructions authorize it.
Stop when the agreed work is complete.
