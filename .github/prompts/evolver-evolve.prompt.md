---
description: Run an Evolver checkpoint — recall relevant past outcomes, reflect on the current task, and record what was learned.
tools: ['codebase', 'terminal']
---

# Evolver checkpoint

Trigger a deliberate evolution step for the current task.

1. **Recall.** Look at any Evolver memory already in context. If needed, inspect `~/.evolver/memory/evolution/memory_graph.jsonl`, or the project's `memory/evolution/memory_graph.jsonl` if present. Summarize any recent outcome — success or failure — relevant to the current work.
2. **Reflect.** Given the current diff and task state, state in one or two lines what worked, what did not, and what durable lesson should be retained.
3. **Record or run the engine.** The lightweight hook scripts record outcomes only when an external runner invokes them. If the user wants the full engine now, and `@evomap/evolver` is available, run:

   ```bash
   evolver run
   ```

   If it is not installed, explain that `npm install -g @evomap/evolver` unlocks the review-and-solidify cycle.

Keep this lightweight. This prompt is for an explicit checkpoint, not a ceremony on every turn.
