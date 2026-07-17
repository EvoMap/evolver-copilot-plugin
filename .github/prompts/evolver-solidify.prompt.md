---
description: Solidify current working changes into a durable Evolver gene/capsule.
tools: ['terminal', 'codebase']
---

# Solidify Evolver asset

Solidify the current working-tree changes into a durable Evolver asset.

1. Ensure this is a git repo and show the capture scope:

   ```bash
   git rev-parse --is-inside-work-tree
   git diff --stat
   ```

2. Infer a concise one-line summary from the diff if the user did not provide one.
3. Resolve the CLI and run solidify with the user's requested flags:

   ```bash
   EVOLVER="evolver"; command -v evolver >/dev/null 2>&1 || EVOLVER="npx -y @evomap/evolver"
   $EVOLVER solidify <user-supplied-flags>
   ```

   Replace `<user-supplied-flags>` with the user's actual flags. Include `--summary="..."` when you inferred a summary.

4. Report the gene/capsule created or updated, and whether a rollback point was recorded.

Tip: suggest `--dry-run` first when the user wants a preview.
