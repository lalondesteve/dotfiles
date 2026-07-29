---
name: to-prd
description: Turn the current conversation into a PRD and repo-local issue drafts in docs/issues/ with no extra interview, just synthesis of what you've already discussed.
---

This skill takes the current conversation context and codebase understanding and produces a PRD plus repo-local implementation issue drafts. Do NOT interview the user unless a critical ambiguity blocks a useful PRD. Prefer synthesis of what you already know.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already. Use the project's domain glossary vocabulary throughout the PRD, and respect any ADRs in the area you're touching.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can. The fewer seams across the codebase, the better - the ideal number is one.

Include the seams in the PRD and issue drafts. Ask the user about them only when a critical ambiguity prevents a useful testing plan; otherwise infer them from the conversation and existing codebase conventions.

3. Write the PRD using the template below. Also derive a numbered set of implementation issue drafts from the PRD, ordered by dependency and delivery sequence.

4. Present the PRD and issue drafts in markdown. If the user asks you to save them, write them into `docs/issues/` using this naming pattern:

- `docs/issues/00-prd-<topic>.md`
- `docs/issues/01-<slug>.md`
- `docs/issues/02-<slug>.md`

<prd-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A comprehensive, numbered list of decision-relevant user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

Cover the feature's distinct actors, critical paths, meaningful edge cases, and failure states without adding repetitive stories solely for volume.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts -- not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this PRD.

## Further Notes

Any further notes about the feature.

</prd-template>

<issue-template>

# Issue NN: <title>

## Goal

What this issue accomplishes.

## User Value

Why this matters.

## Scope

What is included.

## Out of Scope

What is not included.

## Implementation Notes

Important decisions, seams, interfaces, constraints, or sequencing notes.

## Testing Notes

Observable behavior to verify through public interfaces. Prefer integration-style tests and avoid testing implementation details.

## Dependencies

Other issue numbers or prerequisites. Write "None" if this issue can be done independently.

</issue-template>
