# Architecture Scan

Find and rank opportunities to turn shallow modules into deep ones. Use the vocabulary in [SKILL.md](SKILL.md) -- **module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, and **locality**.

## 1. Scope the scan

Deepening pays off where future change is likely. If the user names a module, subsystem, or pain point, scan that area. Otherwise inspect recent history for files and areas that change repeatedly, and use those hot spots to focus the search. Widen the scope only when no useful signal emerges.

Read the relevant `CONTEXT.md`, `CONTEXT-MAP.md`, and ADRs before judging the architecture. Use domain terms for the problem and codebase-design terms for its shape.

## 2. Explore for friction

Explore organically and note where:

- Understanding one behaviour requires bouncing between many small modules.
- An interface is nearly as complicated as its implementation.
- Callers repeat coordination, validation, error handling, or dependency knowledge.
- Changes to one concept scatter across unrelated callers.
- Implementation details leak across a seam.
- The important behaviour is hard to test through the current interface.
- Pure helpers are easy to test but the orchestration where bugs occur is not.

Apply the **deletion test** to each suspected shallow module: if deleting it merely moves its complexity into callers, it may be earning its keep; if its complexity vanishes, it is probably pass-through indirection.

## 3. Rank candidates

Do not design replacement interfaces yet. For each credible candidate, report:

- **Files or modules** -- the area involved.
- **Current friction** -- what makes change, understanding, or verification difficult.
- **Why it is shallow** -- how the interface fails to hide complexity or concentrate knowledge.
- **Deepening direction** -- what behaviour or knowledge could move behind one interface.
- **Leverage** -- what callers would gain.
- **Locality** -- what change would concentrate.
- **Testing effect** -- which observable behaviour could be tested through the resulting seam.
- **Recommendation strength** -- `Strong`, `Worth exploring`, or `Speculative`.

End with a top recommendation and explain why it has the best expected payoff. Mention an ADR conflict only when observed friction is strong enough to justify revisiting the decision.

## 4. Explore the chosen candidate

Once the user chooses a candidate, classify its dependencies with [DEEPENING.md](DEEPENING.md). If alternative interfaces are useful, follow [DESIGN-IT-TWICE.md](DESIGN-IT-TWICE.md). Keep scanning, dependency strategy, and interface design as separate decisions so an early interface idea does not bias candidate selection.
