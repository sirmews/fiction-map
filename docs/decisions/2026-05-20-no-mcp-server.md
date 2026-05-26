# Decision: No MCP Server — Use CLI Query Commands + Agent Skill Instead

**Date:** 2026-05-20

## Context

Milestone 4 (Agent & CI Integration) originally listed an MCP (Model Context Protocol) server as an "optional" deliverable. Two independent skeptical reviews (Gemini CLI v0.42.0 and the opencode assistant, both summarised in `docs/2026-05-20-progress-vs-canonical-docs.md`) flagged that "optional" was the wrong status: either it is critical and must ship, or it is out of scope and must be removed. Leaving it ambiguous would let it act as a permanent backlog liability.

We need to decide.

## Decision

**We will not ship an MCP server.**

Agent integration is delivered through two cheaper, more portable mechanisms instead:

1. **Read-oriented CLI subcommands** over `metadata.json` and `SEMANTICS.md`:
   - `fiction-map query nodes [--type <id>]`
   - `fiction-map query edges [--from <id>] [--to <id>]`
   - `fiction-map query paths --from <id> --to <id>`
   - `fiction-map graph show <id> [--format json|md]`
   - `fiction-map explain <node-id>` (SEMANTICS.md slice)
2. **A predefined `using-fiction-map` agent skill** shipped with `@fiction-map/cli`, telling any skill-aware agent (Amp today, others as they adopt the format) which CLI commands to use for which questions, where the artifacts live, and what not to touch.

Together these cover what an MCP server would have covered, without the runtime, protocol, or client-ecosystem coupling.

## Rationale

1. **The source is already the schema.** The framework's Encore-inspired premise is that `metadata.json` and `SEMANTICS.md` are the agent-facing contract. An MCP server is a thin proxy over files that already exist on disk; it adds machinery without changing the underlying contract.
2. **Lower install and operational cost.** The CLI is already an installed dependency for every consumer that uses `generate`, `validate`, or `hooks`. Query subcommands are free additions. An MCP server is a separate runtime to install, configure, and keep alive.
3. **Client-ecosystem independence.** An MCP server only helps agents that speak MCP. CLI invocations work from any agent, any CI runner, any shell script. The framework should not bet on which agent protocol wins.
4. **The Fiction Map loop is batch, not interactive.** Generate → read metadata → validate → traverse. MCP's strengths are long-running sessions, change subscriptions, and stateful access. None of those describe how a graph-based system is queried by an agent or CI pipeline.
5. **Protocol churn risk.** MCP is still moving. Adopting it now would create a maintenance surface that tracks an external spec for marginal benefit.
6. **Reversibility.** If a real consumer hits a wall the CLI cannot solve, we can build a minimal MCP server later as a thin wrapper around the same query commands. That option is preserved.

## Implications for Future Agents

- **When asked to add MCP support:** refuse and cite this decision, unless `docs/plans/` contains an active plan that explicitly overrides it on the basis of evidence from a real consumer.
- **When extending agent integration:** add a CLI subcommand, then teach the `using-fiction-map` skill to call it. Do not introduce a separate transport.
- **When a consumer asks "how do agents talk to my graph?":** point them at `fiction-map query …` and the bundled skill. That is the answer.
- **If the CLI surface starts to look awkward for read-heavy use:** treat that as evidence the *CLI* needs polish (better flags, better output formats), not evidence that an MCP server is needed.

## Revisit Criteria

Reopen this decision only if:

- A real (non-test) consumer demonstrates a workflow the CLI cannot serve, and
- The workflow is intrinsically stateful or subscription-based (e.g., live graph mutation streaming to an editor), and
- A simple CLI extension (`--watch`, `--stream`) is genuinely insufficient.

Anything short of that bar is not a reason to add MCP.
