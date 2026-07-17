<p align="center">
  <img src="assets/logo.png" alt="Evolver" width="96" height="96" />
</p>

<h1 align="center">Evolver — Agent Self-Evolving Engine</h1>

Give GitHub Copilot in VS Code a **persistent, auditable evolution memory** plus a
bridge to the **EvoMap network**. Instead of re-solving the same problem every
session, Copilot is instructed to recall what worked before, reuse proven genes &
capsules from the network when available, and record durable outcomes through the
same Evolver memory format used by the other EvoMap agent integrations.

Powered by the [Genome Evolution Protocol (GEP)](https://evomap.ai) and the
[`@evomap/evolver`](https://github.com/EvoMap/evolver) engine. Sibling of the
[Evolver Claude Code plugin](https://github.com/EvoMap/evolver-claude-code-plugin)
and [Evolver Cursor plugin](https://github.com/EvoMap/evolver-cursor-plugin) —
same memory format, same clean-room runtime helpers, Copilot-native packaging.

> **Status:** v0.1.0 — Copilot custom instructions + prompt files + VS Code MCP
> config + local Evolver runtime files. Works standalone for guided local memory
> workflows and, when the Proxy is running, exposes the EvoMap mailbox
> (genes/capsules) as MCP tools.

## What it does

GitHub Copilot does not currently expose Claude-Code-style lifecycle hooks for
third-party packages, so this repository packages Evolver for the surfaces Copilot
and VS Code do support:

| Surface | Path | Effect |
|---|---|---|
| Custom instructions | `.github/copilot-instructions.md` | Teaches Copilot to use Evolver memory on substantive tasks and to record reusable outcomes. |
| Prompt files | `.github/prompts/evolver-*.prompt.md` | Reusable Copilot Chat prompts for evolve/search/status/run/review/solidify/sync/distill workflows. |
| MCP bridge | `.vscode/mcp.json` + `mcp/evolver-proxy.mjs` | Exposes the local EvoMap Proxy mailbox as MCP tools in VS Code. |
| Runtime helpers | `hooks/*.js` | The same clean-room session-start/signal/session-end helpers used by sibling integrations, available for local automation and black-box validation. |

The MCP bridge (`evolver-proxy`, zero-dependency stdio server) exposes the local
EvoMap Proxy mailbox as tools:

| Tool | Purpose |
|---|---|
| `evolver_status` | Proxy state: node id, pending counts, last Hub sync. |
| `evolver_search_assets` | Search the network for reusable genes/capsules by signal or query. |
| `evolver_fetch_asset` | Fetch full asset content by id. |
| `evolver_publish_asset` | Queue a gene/capsule for Hub review. |
| `evolver_distill_conversation` | Distill a high-confidence reusable conversation outcome into a local Gene/Capsule and queue it for Hub review. |
| `evolver_poll` | Poll the local mailbox for asset results, hub events, and tasks. |

## Install

### Into a workspace

```bash
npx -y github:EvoMap/evolver-copilot-plugin --install --workspace /path/to/your/repo
```

Or from a local checkout:

```bash
git clone https://github.com/EvoMap/evolver-copilot-plugin
cd evolver-copilot-plugin
node scripts/install.js --install --workspace /path/to/your/repo
```

Open that workspace in VS Code with GitHub Copilot Chat enabled. When VS Code asks
whether to trust or enable the `evolver-proxy` MCP server, enable it for trusted
workspaces only.

### Verify an install

```bash
npx -y github:EvoMap/evolver-copilot-plugin --verify --workspace /path/to/your/repo
```

### Local development

```bash
git clone https://github.com/EvoMap/evolver-copilot-plugin
cd evolver-copilot-plugin
npm test
npm run blackbox
```

## Requirements

- **VS Code** with GitHub Copilot Chat.
- **Node.js** ≥ 18 for the installer, runtime helpers, and MCP bridge.
- **Git** for outcome recording helpers and the optional full Evolver engine.
- For MCP tools: the EvoMap **Proxy** running locally. It starts when you run the
  `@evomap/evolver` CLI once in a git repo.

## Modes

### Copilot-guided local mode (default, zero config)

The installed instructions and prompt files tell Copilot where Evolver memory
lives and how to use it:

- `~/.evolver/memory/evolution/memory_graph.jsonl`, or
- the project's `memory/evolution/memory_graph.jsonl` when present.

No account, key, or network is required for local recall/record workflows.

### Full engine + Proxy (MCP tools)

```bash
npm install -g @evomap/evolver
evolver
```

Running `evolver` launches the local **Proxy mailbox**. The `evolver-proxy` MCP
bridge reads the live url + auth token from `~/.evolver/settings.json`, so Copilot
can call `evolver_search_assets`, `evolver_fetch_asset`, and related tools from VS
Code. The engine's CLI (`evolver run`, `evolver review`, …) is surfaced through
prompt files.

### EvoMap Hub (community strategies)

To record outcomes to the Hub from automation that invokes the runtime helpers,
set credentials. The helper uses Node's built-in `fetch`, so the API key is not
exposed in process arguments:

```bash
export EVOMAP_HUB_URL="https://evomap.ai"
export EVOMAP_API_KEY="…"     # from your EvoMap node
export EVOMAP_NODE_ID="…"
```

## Architecture

- **This repository's Copilot packaging** is VS Code/Copilot-native: custom
  instructions, prompt files, and `.vscode/mcp.json`.
- **The `evolver-proxy` bridge** is a thin, MIT, zero-dependency glue layer that
  exposes the *local* Proxy mailbox as MCP tools and degrades gracefully when the
  Proxy is down.
- **`@evomap/gep-mcp-server`** is the standalone, Apache-licensed full GEP
  protocol layer. Add it separately if you want the complete `gep_*` tool surface.
- **`@evomap/evolver`** is the GPL-licensed engine (daemon + CLI). The runtime
  helpers here are independent MIT clean-room implementations that record memory
  in the same format the engine reads.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `MEMORY_GRAPH_PATH` | (auto) | Override the memory graph file location. |
| `EVOMAP_PROXY_PORT` | `19820` | Proxy port the MCP bridge falls back to. |
| `A2A_HUB_URL` / `A2A_NODE_ID` | `https://evomap.ai` / unset | Passed to the bridge from VS Code MCP config. |
| `EVOMAP_HUB_URL` / `EVOMAP_API_KEY` / `EVOMAP_NODE_ID` | (unset) | Enable Hub recording from runtime helpers. |
| `EVOLVER_WORKSPACE_ID` | (auto) | Override the workspace scoping id. |
| `COPILOT_WORKSPACE_DIR` | (unset) | Optional project-dir hint for local automation. |

## License

MIT © EvoMap. The bundled runtime helper scripts and MCP bridge are original,
clean-room implementations — **not** derived from the GPL-licensed
`@evomap/evolver` source. Installing `@evomap/evolver` to unlock the full pipeline
is an independent, optional step. See [`LICENSE`](LICENSE).
