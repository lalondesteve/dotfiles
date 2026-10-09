---
name: domain-modeling
description: Build and refine a domain model. Use when clarifying domain terminology, relationships, or business rules, or documenting domain decisions.
---

# Domain modeling

Build a shared language for the domain. Clarify ambiguous terms and distinguish concepts whose differences affect behavior or rules. Use established terminology consistently, and revise it when it no longer fits.

Test the model with concrete examples and edge cases. Use them to uncover missing rules, unclear relationships, and invalid states.

Compare the model with existing code and documentation. Treat rules inferred from implementation as hypotheses, not confirmed requirements. When sources disagree, identify the discrepancy and clarify which behavior is intended.

Record agreed terms, relationships, and domain rules as they become clear. Keep unresolved questions that could change the model separate from agreed knowledge. Use the project's existing documentation conventions, and keep domain knowledge separate from implementation choices.

Offer to record decisions that are hard to reverse, surprising without context, or involve meaningful trade-offs. Capture why we chose them and any alternatives considered. Follow the project's existing decision-record format.

If the project has no existing formats, use the accompanying [context template](./CONTEXT-FORMAT.md) and [decision-record template](./ADR-FORMAT.md), omitting sections that add no useful information.

If you can't write files, list the proposed updates in the conversation instead.
