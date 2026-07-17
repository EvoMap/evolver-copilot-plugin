---
description: Distill a reusable skill/gene from the current conversation or recent Evolver run history.
tools: ['terminal', 'codebase']
---

# Distill Evolver lesson

Distill a reusable skill/gene from the current conversation or recent run history.

If the `evolver_distill_conversation` MCP tool is available and the reusable lesson came from this conversation, prefer that tool first. Provide a concrete summary, signals, strategy steps, artifact paths or links, and validation evidence so the local Proxy can quality-gate, persist, and optionally queue Hub publishing.

If using the CLI instead, run:

```bash
EVOLVER="evolver"; command -v evolver >/dev/null 2>&1 || EVOLVER="npx -y @evomap/evolver"
$EVOLVER distill <user-supplied-flags>
```

Replace `<user-supplied-flags>` with the user's actual flags, or omit it when none were provided.

Explain what was distilled, which signals it generalizes, and what validation evidence supports it.
