---
description: Sync evolution assets between the local Evolver store and the EvoMap Hub.
tools: ['terminal']
---

# Sync Evolver assets

Sync Evolver genes/capsules with the EvoMap Hub.

```bash
EVOLVER="evolver"; command -v evolver >/dev/null 2>&1 || EVOLVER="npx -y @evomap/evolver"
$EVOLVER sync <user-supplied-flags>
```

Replace `<user-supplied-flags>` with the user's actual flags, or omit it when none were provided.

After it runs, summarize how many assets were pulled or updated, any local-only unpublished assets it listed, and where a `.gepx` archive was written if the user requested export.

If it reports missing node identity or Hub credentials, point the user to the `evolver-status` prompt and the README's EvoMap Hub section.
