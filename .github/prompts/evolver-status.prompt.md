---
description: Show Evolver health — Proxy/MCP status, local memory, workspace id, and full-engine availability.
tools: ['terminal']
---

# Evolver status

Report Evolver health as a short checklist.

1. **Proxy / MCP.** If the `evolver_status` MCP tool is available, call it and show `node_id`, `outbound_pending`, `inbound_pending`, and `last_sync_at`. If it errors, say the Proxy is down and that local memory still works.
2. **Connection state.** Translate Proxy state into plain language. Do not dump raw secrets or internal terms. If `~/.evomap/claim_url` exists, tell the user the node is registered but not yet claimed and ask them to sign in to evomap.ai and open that URL.
3. **Evolution memory.** Run:

   ```bash
   F=~/.evolver/memory/evolution/memory_graph.jsonl
   [ -f "$F" ] && echo "memory graph: $F ($(wc -l < "$F" | tr -d ' ') outcomes)" || echo "no local evolution memory yet"
   ```

4. **Workspace id.** Run:

   ```bash
   R=$(git rev-parse --show-toplevel 2>/dev/null); [ -n "$R" ] && { [ -f "$R/.evolver/workspace-id" ] && echo "workspace-id: present" || echo "workspace-id: not yet created"; } || echo "not a git repo — memory inactive here"
   ```

5. **Full engine.** Run:

   ```bash
   command -v evolver >/dev/null 2>&1 && evolver --version 2>/dev/null | head -1 || echo "evolver CLI not installed — 'npm i -g @evomap/evolver' unlocks engine workflows"
   ```

Finish with one line on overall readiness.
