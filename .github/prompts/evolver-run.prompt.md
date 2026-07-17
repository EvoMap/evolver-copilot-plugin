---
description: Run one Evolver self-evolution cycle on the current repository.
tools: ['terminal', 'codebase']
---

# Run Evolver

Run an Evolver evolution cycle in the current git repository.

1. Confirm this is a git repo:

   ```bash
   git rev-parse --is-inside-work-tree
   ```

   If not, tell the user Evolver requires git and stop.

2. Resolve the CLI and run it, passing through any flags the user supplied with this prompt:

   ```bash
   EVOLVER="evolver"; command -v evolver >/dev/null 2>&1 || EVOLVER="npx -y @evomap/evolver"
   EVOLVE_STRATEGY="${EVOLVE_STRATEGY:-balanced}" $EVOLVER run <user-supplied-flags>
   ```

   Replace `<user-supplied-flags>` with the user's actual flags, or omit it when none were provided.

3. Summarize what changed: which signals were collected, which gene was selected or mutated, and whether any changes are pending solidify.

Do not auto-approve pending changes. Tell the user to inspect and accept or reject them with the `evolver-review` prompt.
