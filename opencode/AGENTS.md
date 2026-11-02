## Python tools

- Prefer `uvx` to run Python command-line tools in isolated environments when the tool supports it.
- Use `uv tool install` when a persistent command-line tool installation is needed.
- Follow the project's existing dependency-management instructions for project dependencies; do not use `uvx` as a substitute for adding them.
- If `uv` or `uvx` is unavailable, or the tool requires another installation method, explain the fallback.

## Context and delegation

- If you are the main agent, manage your context deliberately. Delegate substantial, self-contained exploration, research, implementation, or review to suitable subagents when doing so would keep the main context focused or allow independent work to proceed in parallel.
- Give each subagent a clear scope, relevant context, constraints, and the specific results or verification you need. Ask for concise findings with file paths and line numbers where relevant.
- Retain responsibility for decisions, integration, verification, and the final response. Review subagent results rather than assuming they are correct.
- Do simple or tightly coupled work directly when delegation would add more overhead than value.
- If you are a subagent, do not delegate further unless the main agent explicitly asks you to and delegation is permitted.
- Follow any higher-priority instructions or permission restrictions on subagent use.
