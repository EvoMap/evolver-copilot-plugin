<p align="center">
  <img src="assets/logo.png" alt="Evolver" width="96" height="96" />
</p>

<h1 align="center">Evolver — Agent Self-Evolving Engine</h1>

Give GitHub Copilot in VS Code and Microsoft 365 Copilot Cowork a **persistent,
auditable evolution memory** plus a bridge to the **EvoMap network**. Instead of
re-solving the same problem every session, the agent recalls what worked before,
reuses proven genes and capsules when appropriate, and records validated outcomes
for future work.

Powered by the [Genome Evolution Protocol (GEP)](https://evomap.ai) and the
[`@evomap/evolver`](https://github.com/EvoMap/evolver) engine. Sibling of the
[Evolver Claude Code plugin](https://github.com/EvoMap/evolver-claude-code-plugin)
and [Evolver Cursor plugin](https://github.com/EvoMap/evolver-cursor-plugin) —
same memory format, same clean-room runtime helpers, Copilot-native packaging.

> **Status:** v0.2.0 — includes the original VS Code/GitHub Copilot integration
> and a Microsoft 365 Unified App package for Copilot Cowork. The ready-to-upload
> Cowork artifact is [`dist/evolver-cowork.zip`](dist/evolver-cowork.zip).

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
| Cowork app package | `cowork/` + `dist/evolver-cowork.zip` | Adds a Cowork-native Agent Skill and the hosted EvoMap MCP connector using OAuth Dynamic Client Registration. |

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

## Microsoft 365 Copilot Cowork

The Cowork ZIP is a Microsoft 365 Unified App package (manifest v1.28):

```text
evolver-cowork.zip
├── manifest.json
├── color.png
├── outline.png
├── mcp-tools.json
└── skills/
    └── capability-evolver/
        └── SKILL.md
```

It connects to `https://evomap.ai/mcp`. The package contains no API key, OAuth
secret, tenant ID, or user token.

> **Current deployment blocker:** Microsoft DCR provisioning reaches EvoMap but
> fails because EvoMap doesn't return the required `client_secret`. Do not deploy
> or claim that the connector works until the DCR check below succeeds.

### Admin / publisher setup

#### 1. Verify DCR

Use Node.js 22 or 24. From the repository root:

```bash
npm run toolkit:dcr:login
npm run toolkit:dcr:doctor
npm run toolkit:dcr:provision
```

The exact flow is:

1. `toolkit:dcr:login` opens Microsoft 365 sign-in.
2. Sign in with the publisher account.
3. `toolkit:dcr:provision` creates the development app and DCR auth config.
4. Open `toolkit/evolver-cowork-dcr/env/.env.dev`.
5. Confirm `MCP_DA_AUTH_ID_EVOMAPAI` is not empty.
6. Stop if provisioning fails or the ID is empty.

The DCR harness lives in
[`toolkit/evolver-cowork-dcr/`](toolkit/evolver-cowork-dcr/README.md). Microsoft
documents the CLI commands in
[Microsoft 365 Agents Toolkit CLI](https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/microsoft-365-agents-toolkit-cli)
and the client-secret requirement in
[Configure dynamic client registration](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/plugin-authentication-dynamic-client-registration).

Current verified failure:

```text
InvalidRegistrationResponse: IDP registration response is missing required
field: client_secret.
```

EvoMap must return both `client_id` and `client_secret`. Do not add a made-up
`referenceId`. The Evolver runtime skill cannot create this publisher-side auth
configuration.

##### Required EvoMap server fix

This is not a value that an administrator gets and fills into the Cowork ZIP or
`env/.env.dev`. EvoMap must fix the server-side registration endpoint:

```text
POST https://evomap.ai/oauth/register
```

For every accepted Microsoft DCR request, the endpoint must generate, persist,
and return a confidential OAuth client. Its response must include at least:

```json
{
  "client_id": "<generated by EvoMap>",
  "client_secret": "<generated by EvoMap>",
  "token_endpoint_auth_method": "client_secret_post",
  "grant_types": [
    "authorization_code",
    "refresh_token"
  ],
  "response_types": ["code"]
}
```

EvoMap must generate the secret securely, store the client registration
server-side, return the plaintext secret once in the registration response, and
validate it at `POST https://evomap.ai/oauth/token`. The token endpoint must also
support refresh tokens.

After the server fix, rerun `npm run toolkit:dcr:provision`. Agents Toolkit—not
the administrator—receives the client secret and stores it in Microsoft Enterprise
Token Store. A successful run then writes the separate Microsoft auth-config ID
to `MCP_DA_AUTH_ID_EVOMAPAI`. Never put the client secret itself in
`MCP_DA_AUTH_ID_EVOMAPAI`, `manifest.json`, `SKILL.md`, or source control.

#### 2. Build the Cowork ZIP

Run only after DCR succeeds:

```bash
npm ci --ignore-scripts
npm run check
npm run security:deps
npm run verify:cowork:remote
npm run build:cowork
```

Output: [`dist/evolver-cowork.zip`](dist/evolver-cowork.zip). Do not unzip it or
zip the `cowork/` parent directory.

#### 3. Upload and share an unpublished ZIP

Use Cowork for a personal or pilot upload:

1. Open **Microsoft 365 Copilot → Cowork**.
2. In the left navigation, select **Customize**.
3. Select the **Plugins** tab.
4. At the top of the tab, select **Upload plugin**.
5. Choose `dist/evolver-cowork.zip`.
6. In **Share**, select **Only you** or **Specific users in your organization**.
7. If sharing, add users by name or email.
8. Select **Apply**.

For an update, open the plugin detail page and select **Re-share**. See
[Upload a plugin package](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/cowork-customize#upload-a-plugin-package)
and
[Share skills and plugins](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/cowork-customize#share-skills-and-plugins).

#### 4. Deploy a catalog plugin organization-wide

Use this only after Evolver is available in the tenant catalog or Microsoft 365
App Store:

1. Open the [Microsoft 365 admin center](https://admin.microsoft.com).
2. In the left navigation, select **Agents → Tools**.
3. Search for **Evolver for Cowork**.
4. Select the plugin to open its details.
5. Select **Installed for**.
6. Select **All users** or **Specific users/groups**.
7. Select **Next**, review the details, and install.

If Evolver isn't listed under **Agents → Tools**, use the Cowork upload-and-share
flow for a pilot. See
[Deploy plugins to your organization](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/cowork-manage-plugins#deploy-plugins-to-your-organization).

### Per-user setup and sign-in

Each user signs in to EvoMap separately. The publisher or administrator cannot
sign in for users.

1. Open **Microsoft 365 Copilot → Cowork**.
2. In the left navigation, select **Customize**.
3. Select the **Plugins** tab.
4. Select **Evolver for Cowork**.
5. If the detail page shows **Add**, select **Add**.
6. Turn the plugin on for the current conversation.
7. Start a new conversation.
8. In the conversation, use the **Sources** picker to select Evolver if needed.
9. Send this prompt:

   ```text
   Set up Evolver. Require me to sign in to EvoMap, then call gep_identity and
   gep_status. Do not continue unless both connector calls succeed. Do not
   simulate either result.
   ```

10. Complete the EvoMap sign-in and consent prompt.
11. Confirm the conversation contains real `gep_identity` and `gep_status` tool
    events.
12. Stop if either tool is missing or fails.

Adding or enabling the plugin doesn't sign the user in. Sign-in starts when the
protected connector is first used. Each user's tokens, private EvoMap memory,
permissions, and applicable credits stay with that user's EvoMap account. See
[Manage connector authentication](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/cowork-manage-plugins#manage-connector-authentication)
and
[Manage your plugins](https://learn.microsoft.com/en-us/microsoft-365/copilot/cowork/cowork-customize#manage-your-plugins).

### After DCR succeeds

Validate and package the Toolkit harness:

```bash
npm run toolkit:dcr:validate
npm run toolkit:dcr:package
```

Test the personal development agent first. Publish it to the tenant only if that
test succeeds:

```bash
npm run toolkit:dcr:publish
```

The Toolkit package is written to
`toolkit/evolver-cowork-dcr/appPackage/build/`. It is a diagnostic declarative
agent and doesn't replace `dist/evolver-cowork.zip`.

### Troubleshooting

- **Plugin missing in Cowork:** check **Customize → Plugins** and start a new
  conversation after sharing or assignment.
- **Catalog plugin missing for admins:** check **Agents → Tools**. An unpublished
  personal ZIP doesn't automatically appear in the catalog.
- **Tools not registered:** the connector didn't load; don't simulate results.
- **No sign-in prompt:** call `gep_identity`. If the tool isn't available, fix
  connector registration first.
- **Authentication failure:** run `npm run verify:cowork:remote`, then rerun
  `npm run toolkit:dcr:provision`.
- **Credits:** EvoMap operations can use credits from the signed-in user's EvoMap
  account.

### Automated security checks

Run both checks locally:

```bash
npm run security:deps
npm run security:sast
```

[Security workflow](.github/workflows/security.yml) runs the dependency audit,
local SAST, tests, Cowork validation/build, pull-request dependency review, and
CodeQL on pushes, pull requests, manual dispatches, and every Monday. Dependabot
checks npm and GitHub Actions updates weekly.

## VS Code / GitHub Copilot install

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

## VS Code requirements

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

- **The Cowork package** is Microsoft 365-native: a Unified App manifest, Agent
  Skill, static MCP tool catalog, and hosted OAuth MCP connector.
- **The VS Code/Copilot packaging** remains editor-native: custom instructions,
  prompt files, and `.vscode/mcp.json`.
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
