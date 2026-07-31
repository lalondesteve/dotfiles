---
name: diagnosing-bugs
description: Diagnose hard bugs and performance regressions through a tight reproduction loop. Use when the user asks to diagnose or debug broken, failing, throwing, flaky, incorrect, or slow behaviour.
---

# Diagnosing Bugs

Use a feedback-loop-first discipline for hard bugs. Skip a phase only when there is a concrete reason.

Before investigating, read `CONTEXT.md` and relevant ADRs when they exist so the diagnosis uses the project's domain language and respects deliberate decisions.

Match the work to the user's requested outcome. If they ask only for diagnosis or root-cause analysis, stop after establishing the cause and proposing a fix. Do not modify tracked files unless they asked for a fix or explicitly approved diagnostic instrumentation. If they ask for the bug to be fixed, continue through regression testing, implementation, and cleanup.

## 1. Build a feedback loop

Construct a repeatable pass/fail signal that exercises the reported bug and detects its exact symptom. Try the cheapest suitable approach first:

1. A failing test at the seam that reaches the bug.
2. A CLI or HTTP invocation with fixture input and an asserted result.
3. A browser automation script that checks the DOM, console, or network behaviour.
4. Replay of a captured request, payload, trace, or event log.
5. A throwaway harness around the smallest runnable part of the system.
6. A property or fuzz loop for failures that appear only with some inputs.
7. An automated bisection check when the regression lies between known revisions.
8. A differential loop that runs the same input through two versions or configurations and compares the results.

Treat the loop as part of the investigation:

- Make the assertion specific to the reported symptom rather than merely checking that the program runs.
- Remove unrelated setup and initialization.
- Pin time, randomness, files, network responses, and other unstable inputs where practical.
- For intermittent failures, loop or stress the trigger until the reproduction rate is high enough to compare changes reliably.

Phase 1 is complete when one command has been run and is fast, repeatable, unattended, and capable of going red on the reported bug and green after a correct fix.

If no useful loop can be built, stop and state what was tried. Ask for the missing environment access or a captured artifact such as logs, a trace, a core dump, or a timestamped recording. Request temporary production instrumentation only when local evidence cannot expose the failure.

## 2. Reproduce and minimise

Run the loop and confirm that it detects the user's actual failure rather than a nearby error. Repeat it enough times to establish a stable result or a measurable failure rate.

Preserve the original command and its inputs or captured artifacts unchanged for final verification. Minimise a copy of the reproduction by removing inputs, callers, configuration, data, and steps one at a time. Change configuration or data only in isolated fixtures or disposable environments. Re-run the loop after every reduction. Stop when every remaining element is required to produce the failure.

The minimised reproduction should shrink the hypothesis space and provide the basis for a regression test.

## 3. Form hypotheses

Generate several ranked, falsifiable hypotheses before committing to a cause. For each one, state the observation it predicts:

> If X is the cause, then changing or measuring Y will make Z happen.

Discard or sharpen explanations that make no testable prediction. Surface the ranking when project knowledge from the user could change the investigation order, but do not block progress when the evidence already supports a clear next probe.

## 4. Instrument and test

Map every probe to one hypothesis and change one variable at a time.

Prefer, in order:

1. Debugger or REPL inspection.
2. Focused measurement at the seam that distinguishes hypotheses.
3. Targeted temporary logs.

Give temporary logs a unique searchable prefix such as `[DEBUG-a4f2]` so they can all be removed later. Do not add broad logging and search it for accidental clues.

For performance regressions, establish a repeatable baseline before changing code. Use timings, profiles, query plans, allocation measurements, or bisection as appropriate. Measure first and compare after every change.

## 5. Fix and regress

Enter this phase only when the requested outcome includes implementation. For diagnosis-only work, report the root cause, supporting evidence, proposed fix, and any remaining uncertainty instead.

Use the minimised reproduction to write a failing regression test before the fix when a correct seam exists. The test must reproduce the real bug pattern as it occurs for callers, not a shallower approximation that gives false confidence.

Then:

1. Watch the regression test fail.
2. Apply the smallest fix that addresses the established root cause.
3. Watch the regression test pass.
4. Re-run the original feedback loop against the unminimised scenario.
5. Run the relevant broader checks for regressions.

If no correct test seam exists, record that as an architectural finding rather than adding a misleading test. Use `codebase-design` after the bug is fixed to evaluate whether a deeper module or better seam would prevent recurrence.

## 6. Clean up and explain

Before declaring the diagnosis complete:

- Confirm the original reproduction no longer fails.
- Confirm the regression test and relevant broader checks pass.
- Remove all temporary instrumentation by searching for its unique prefix.
- Delete only throwaway harnesses created during the investigation, unless the user wants them retained or they have clear lasting diagnostic value.
- State the root cause, the evidence that isolated it, and why the fix addresses it.
- Note any follow-up that would prevent the same class of failure.
