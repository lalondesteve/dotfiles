---
name: to-issues
description: Break a spec, plan, or current conversation into numbered repo-local implementation issue drafts under docs/issues/. Use when the user wants actionable work items without an external tracker.
---

# To Issues

Turn a spec, plan, or the current conversation into repo-local implementation issues. These Markdown files are the work queue; do not publish them to an external tracker.

## Process

### 1. Gather context

Use the current conversation and any spec or plan the user references. Read the complete source before decomposing it. If no source is named, use the relevant `docs/issues/00-spec-*.md` file when there is one clear match; otherwise use the conversation or ask one focused question.

### 2. Explore when needed

Explore the relevant code when the current repository state is not already understood. Use the project's domain glossary vocabulary, respect applicable ADRs, and check prior implementation and testing patterns.

Look for prefactoring that would make the requested change safer or simpler. Include it only when it directly enables the work; do not create speculative cleanup issues.

### 3. Draft vertical slices

Break the work into tracer-bullet issues:

- Each issue delivers one narrow but complete behaviour.
- A completed issue is independently demonstrable or verifiable.
- Slice through the applicable layers rather than creating separate schema, backend, frontend, and test issues that provide no value alone.
- Keep each issue small enough for one focused implementation and review.
- Give each issue observable acceptance criteria.
- State only the other issues that genuinely block it. An issue with no blockers can start immediately.

Do not force wide mechanical refactors into vertical slices. Sequence them as expand-migrate-contract:

1. **Expand** -- add the new form beside the old without breaking callers.
2. **Migrate** -- move callers in independently safe batches, each blocked by the expansion.
3. **Contract** -- remove the old form only after every migration is complete.

### 4. Present and save

Present the proposed issues as a numbered list with each title, blockers, delivered behaviour, and acceptance criteria. Ask about granularity or blockers only when a material ambiguity remains.

If the user asks to save the issues, create `docs/issues/` lazily and write one file per issue in dependency order:

- `docs/issues/01-<slug>.md`
- `docs/issues/02-<slug>.md`
- `docs/issues/03-<slug>.md`

Scan existing files and avoid overwriting them. Continue from the appropriate available number when issue drafts already exist.

<issue-template>

# Issue NN: <title>

## Goal

The narrow, complete behaviour this issue delivers.

## User Value

Why the behaviour matters.

## Scope

What is included.

## Out of Scope

What is deliberately excluded.

## Implementation Notes

Important decisions, seams, interfaces, constraints, or sequencing notes. Avoid brittle file paths and code snippets unless they record a decision that prose cannot express precisely.

## Testing Notes

Observable behaviour to verify through public interfaces. Prefer integration-style tests and avoid testing implementation details.

## Acceptance Criteria

- [ ] An observable criterion that can be verified independently

## Blocked By

Other local issue numbers and titles, or "None" when work can start immediately.

</issue-template>
