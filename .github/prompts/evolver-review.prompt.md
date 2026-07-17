---
description: Review Evolver pending changes, then approve or reject them when the user explicitly asks.
tools: ['terminal', 'codebase']
---

# Review Evolver changes

Review the changes Evolver currently has pending solidify in this repository.

1. Show the user what is pending:

   ```bash
   git status --short
   git diff
   ```

2. Resolve the CLI:

   ```bash
   EVOLVER="evolver"; command -v evolver >/dev/null 2>&1 || EVOLVER="npx -y @evomap/evolver"
   ```

3. Act only on explicit user intent:
   - If the user asked to approve or passed `--approve`, run `$EVOLVER review --approve`.
   - If the user asked to reject or passed `--reject`, run `$EVOLVER review --reject`.
   - If no explicit approve/reject intent was provided, summarize the diff and stop for the user's decision.

Report the final state and resulting git status.
