---
name: implementation-planning
description: Turn an agreed design into an implementation plan with clear contracts, verifiable tasks, and explicit dependencies. Use when an agreed design needs to be broken into tasks or prepared for parallel implementation.
---

# Implementation planning

Inspect the relevant code, interfaces, documentation, and checks before defining implementation tasks. Identify existing behavior the change must preserve, and state any assumptions you could not verify.

Define the contracts needed for independent implementation. Prefer existing interfaces, and resolve shared assumptions before splitting work that depends on them.

When contracts or integration assumptions are uncertain, plan an initial tracer bullet: a narrow, working path through the necessary layers that tests them. Choose one that exposes that uncertainty, and make dependent work wait for its verification. For a small or well-understood change, skip the tracer bullet and make the first task the complete working path.

Split the remaining work into small, independently verifiable outcomes. Prefer end-to-end behavior over layer-by-layer tasks. For each task, state the intended outcome, affected components, acceptance criteria, dependencies, and verification steps.

For each piece of work, define how to verify its acceptance criteria through observable behavior. Prefer existing tests and checks; add coverage where they leave meaningful behavior unverified.

Derive expected results from requirements or independently worked examples, rather than duplicating the implementation's logic.

For bug fixes, include a regression check that fails on the broken behavior and passes with the fix. Make confirming that it fails for the expected reason an explicit verification step.

State what blocks each piece of work and why. Mark work as parallelizable only when its required contracts are settled and shared changes won't require unresolved coordination.

Specify how parallel work will be integrated, who owns shared changes, and how the combined behavior will be verified. Include integration work in the plan.
