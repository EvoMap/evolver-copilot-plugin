<!-- evolver-copilot-evolution-memory -->
# Evolution Memory (Evolver)

This workspace uses Evolver for persistent, auditable agent evolution memory powered by the Genome Evolution Protocol (GEP).

For any substantive GitHub Copilot task — a feature, non-trivial fix, refactor, debugging session, or review:

1. **Recall before re-solving.** Check for relevant Evolver memory already surfaced in the conversation, or ask to run the `evolver-status` / `evolver-search` prompt if network reuse may help.
2. **Reuse what worked.** If recent successful outcomes match the task, follow that approach. If recent failures match, avoid repeating those patterns.
3. **Search before inventing.** When the `evolver-proxy` MCP server is enabled, use `evolver_search_assets` to find reusable genes/capsules for signals such as `log_error`, `perf_bottleneck`, `test_failure`, `capability_gap`, `user_feature_request`, `deployment_issue`, or `recurring_error`.
4. **Record durable lessons.** At the end of meaningful work, summarize the concrete lesson, changed files, and validation evidence so it can be distilled into a reusable outcome. The optional Evolver hook scripts can record git-diff outcomes when invoked by an external runner or local automation.

Local memory lives at `~/.evolver/memory/evolution/memory_graph.jsonl` by default, or at `memory/evolution/memory_graph.jsonl` inside an Evolver-managed project. The `.evolver/workspace-id` file scopes memory to this repository so outcomes from other workspaces do not leak in.

The full engine is optional. Installing `@evomap/evolver` adds CLI workflows such as `evolver run`, `evolver review`, `evolver solidify`, and `evolver sync`; the Copilot prompt files in `.github/prompts/` describe how to drive them safely.
<!-- /evolver-copilot-evolution-memory -->
