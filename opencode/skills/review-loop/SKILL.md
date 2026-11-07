---
name: review-loop
description: Run an independent review loop on a plan or code changes.
---

# Review loop

Get independent review of a plan or code changes without letting the work grow. The reviewer finds problems, and you decide what to change. A review that only adds things has failed, so scope control matters as much as the fixes.

## 1. Before the first round

- Check the work yourself first: run the project's checks if it's code, and read the diff. Don't send a reviewer anything you already know is broken. Do not defer known fixes until reviews return.

- Save a snapshot so later rounds can show only what changed.
  - **Plan or document:** copy the file to the scratchpad as `round0`.
  - **Code:** record a tree without changing the working tree or the real index, including untracked files.

## 2. Start the reviewer

Unless the user names another model, use `delegate_task` with:

- `target`: `{"providerInstanceId": "opencode", "model": "cliproxy/gpt-6.1-sol", "options": {"variant": "high"}}`
- `role`: `review`, and `mode`: `async`

Call `orchestrator_capabilities` once per thread first. If the model is unavailable, tell the user instead of switching models. Each round is a new `delegate_task`, because a child starts with no history, so its brief must stand alone. End your turn after starting it; completion wakes the thread, so don't poll.

The first brief needs:

- **Read-only:** no edits, no commits, no subagents.
- **What to read:** the absolute paths of the work, the agreed decisions it must follow, and any code it builds on. Say which decisions are settled, and that they stay closed unless the reviewer finds a concrete contradiction.
- **Report only real problems:** false claims, contracts that can't work, gaps that lose data or produce wrong behaviour, ordering mistakes that block work, and tests or criteria that could pass on broken behaviour.
- **Don't report:** scope additions, extra abstraction, more hardening, nicer-to-have tests, style preferences, or vague concerns without a concrete failure scenario.
- **Output:** a numbered list by severity (blocker, major or minor), each with its location, the concrete scenario, and the smallest fix, ending with `VERDICT: approve` or `VERDICT: changes needed`.

## 3. Decide on each finding

Verify each finding against the code or the plan before accepting it. Reviewers can be wrong.

- **Valid:** make the smallest change that fixes it, and add the test or criterion that would have caught it.
- **Valid, but the suggested fix is too big or has a side effect:** use a smaller fix, and record why.
- **Scope creep or no concrete failure:** decline it, and record why.

Pushing back is expected. Give the reviewer your reasoning, and ask for a concrete failure scenario to overturn it, since a preference isn't enough.

Tell the user what was found, what you changed, and where you pushed back.

## 4. Re-review only the changes

Save the diff since the last snapshot, take a new snapshot, and start a new `delegate_task` with:

- The diff path, marked as the thing under review, and the full work as context only.
- Each earlier finding and how it was handled, including your objections and their reasoning.
- The questions: does each change fix its finding, and did it introduce a contradiction or a new way to fail?
- The instruction not to report anything outside the diff unless the diff makes it wrong.

Repeat until the verdict is `approve`. If the same disagreement survives a round with no new evidence, or findings stop mattering, ask the user to decide rather than looping.

## 5. Finish

- Commit, if the user asked for it. On the default branch, create a branch first. Don't push unless asked.
- Tell the user the commit hash and branch, how many rounds it took, what the review changed, and which suggestions you declined.
- Then stop and regroup. Don't start the next piece of work on your own.
