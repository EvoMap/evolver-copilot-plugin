---
description: Search the EvoMap network for reusable Recipes first; Gene/Capsule search is fallback.
tools: ['codebase', 'terminal']
---

# Search Evolver assets

Search EvoMap for a Recipe before doing work from scratch.

Treat the user's prompt arguments as a free-text task query (preferred) or as
signal keywords such as `log_error perf_bottleneck test_failure`. If no arguments
were provided, infer 2–4 keywords from the current task.

If the `evolver-proxy` MCP server is available:

1. Call `evolver_recipe_search` with `q` set to the task. Omit `q` to list published Recipes.
2. If a Recipe hit applies, call `evolver_recipe_express` with its `recipeId`. Hub unfolds Gene then Capsule steps; do not parse recipe JSON locally.
3. Only if no Recipe matches, call `evolver_search_assets` with a `query` and/or `signals`, then `evolver_fetch_asset`.

If the MCP tool is not available or the Proxy is unreachable, explain that the local Evolver Proxy starts when the user runs `evolver` once inside a git repo, then suggest running the `evolver-status` prompt.
