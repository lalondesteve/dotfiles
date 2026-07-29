---
name: to-spec
description: Turn the current conversation into a spec (also called a PRD) with no extra interview, just synthesis of what has already been discussed. Use when the user wants a durable feature specification.
---

# To Spec

Turn the current conversation and codebase understanding into a durable specification. Do not interview the user unless a critical ambiguity prevents a useful spec. Prefer synthesis of what is already known.

## Process

1. Explore the repo to understand the current state of the codebase, if you have not already. Use the project's domain glossary vocabulary throughout the spec, and respect any ADRs in the area being changed.

2. Identify the seams at which the feature will be tested. Prefer existing seams, and use the highest practical public seam for each observable behaviour. Propose a new seam only when the existing design cannot express or verify the required behaviour.

Include the seams in the spec. Ask the user about them only when a critical ambiguity prevents a useful testing plan; otherwise infer them from the conversation and repository conventions.

3. Write the spec using the template below. Present it in Markdown. If the user asks to save it, create `docs/issues/` lazily and write it to:

`docs/issues/00-spec-<topic>.md`

The `to-issues` skill can then turn the spec into repo-local implementation issues.

<spec-template>

## Problem Statement

The problem the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A comprehensive, numbered list of decision-relevant user stories. Each story should use this format:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see the balance of my accounts, so that I can make better-informed spending decisions.
</user-story-example>

Cover distinct actors, critical paths, meaningful edge cases, and failure states without adding repetitive stories solely for volume.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- Modules that will be built or modified
- Interfaces that will change
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do not include specific file paths or code snippets. They may become outdated quickly.

Exception: if a prototype produced a snippet that records a decision more precisely than prose can (such as a state machine, reducer, schema, or type shape), inline only the decision-rich part and note that it came from a prototype.

## Testing Decisions

A list of testing decisions that were made. Include:

- The observable behaviours that matter most
- The public seams through which they will be tested
- The modules covered by those seams
- Relevant testing prior art in the codebase

Tests should verify external behaviour rather than implementation details.

## Out of Scope

A description of what is deliberately excluded from the spec.

## Further Notes

Any assumptions, unresolved non-blocking questions, or other useful context.

</spec-template>
