# Changelog

All notable changes to the Evolver GitHub Copilot integration are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-07-18

Adds a tenant-deployable Microsoft 365 Copilot Cowork plugin while preserving the
existing VS Code/GitHub Copilot integration.

### Added

- Microsoft 365 Unified App manifest v1.28 with a stable application ID.
- Cowork-native `capability-evolver` Agent Skill with explicit redaction,
  validation, and untrusted-result handling rules.
- Hosted EvoMap Streamable HTTP MCP connector using OAuth Dynamic Client
  Registration and PKCE, with no embedded tenant secret or API key.
- Static MCP tool catalog exposing eight remote-safe GEP tools.
- Deterministic Cowork package validation and build scripts producing
  `dist/evolver-cowork.zip`.
- Cowork package tests, live read-only MCP/OAuth compatibility check, npm audit,
  local SAST preflight, GitHub Dependency Review, and CodeQL workflow.
- Microsoft 365 admin deployment and first-use verification instructions.

## [0.1.0] — 2026-07-17

Initial public release. Adapts the Evolver agent-memory workflow for GitHub
Copilot in VS Code using Copilot-native extension points.

### Added
- Repository-level Copilot custom instructions in `.github/copilot-instructions.md`.
- Reusable Copilot prompt files in `.github/prompts/evolver-*.prompt.md` for
  evolve, search, status, run, review, solidify, sync, and distill workflows.
- VS Code MCP configuration in `.vscode/mcp.json` for the `evolver-proxy` bridge.
- Zero-dependency installer CLI (`evolver-copilot-plugin`) with install, verify,
  and uninstall modes.
- MIT clean-room runtime helpers and MCP bridge shared with the sibling Evolver
  agent integrations.
- Black-box tests for installer behavior, runtime helper behavior, and MCP
  initialize/tools flow.
