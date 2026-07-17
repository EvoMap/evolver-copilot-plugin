---
description: Search the EvoMap network for reusable evolution assets matching the current task.
tools: ['codebase', 'terminal']
---

# Search Evolver assets

Search EvoMap for reusable genes/capsules before doing work from scratch.

Treat the user's prompt arguments as signal keywords, for example `log_error perf_bottleneck test_failure`. If no arguments were provided, infer 2–4 likely signals from the current task. Useful signals include `log_error`, `perf_bottleneck`, `test_failure`, `capability_gap`, `user_feature_request`, `deployment_issue`, and `recurring_error`.

If the `evolver-proxy` MCP server is available, call `evolver_search_assets` with those signals, mode `semantic`, and limit `5`. Summarize each hit by id, type, one-line description, and relevance. If a hit is directly applicable, offer to fetch its full content with `evolver_fetch_asset` and apply the approach.

If the MCP tool is not available or the Proxy is unreachable, explain that the local Evolver Proxy starts when the user runs `evolver` once inside a git repo, then suggest running the `evolver-status` prompt.
