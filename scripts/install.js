#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 EvoMap

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MANAGED_HEADER = '<!-- _evolver_copilot_managed: true -->';
const MANAGED_JSON_MARKER = '_evolver_copilot_managed';
const COPILOT_INSTRUCTIONS = path.join('.github', 'copilot-instructions.md');
const PROMPT_DIR = path.join('.github', 'prompts');
const MCP_CONFIG = path.join('.vscode', 'mcp.json');
const RUNTIME_DIRS = ['hooks', 'mcp', 'skills'];
const PROMPT_FILES = [
  'evolver-distill.prompt.md',
  'evolver-evolve.prompt.md',
  'evolver-review.prompt.md',
  'evolver-run.prompt.md',
  'evolver-search.prompt.md',
  'evolver-solidify.prompt.md',
  'evolver-status.prompt.md',
  'evolver-sync.prompt.md',
];
const HOOK_SCRIPTS = ['session-start.js', 'signal-detect.js', 'session-end.js'];

function usage() {
  return `Usage: evolver-copilot-plugin [--install|--verify|--uninstall] [--workspace <dir>] [--force]\n\nInstalls Evolver support for GitHub Copilot in VS Code into a workspace.\nIt writes Copilot custom instructions, prompt files, a VS Code MCP config,\nand the local Evolver hook/MCP runtime files.\n`;
}

function parseArgs(argv) {
  const args = {
    action: 'install',
    workspace: process.cwd(),
    force: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--install') args.action = 'install';
    else if (arg === '--verify') args.action = 'verify';
    else if (arg === '--uninstall') args.action = 'uninstall';
    else if (arg === '--force') args.force = true;
    else if (arg === '--help' || arg === '-h') args.action = 'help';
    else if (arg === '--workspace' || arg === '--config-root') {
      i += 1;
      args.workspace = argv[i] || args.workspace;
    } else if (arg.startsWith('--workspace=')) {
      args.workspace = arg.slice('--workspace='.length);
    } else if (arg.startsWith('--config-root=')) {
      args.workspace = arg.slice('--config-root='.length);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  args.workspace = path.resolve(args.workspace);
  return args;
}

function packageRoot() {
  return path.resolve(__dirname, '..');
}

function targetPaths(workspace) {
  return {
    workspace,
    instructions: path.join(workspace, COPILOT_INSTRUCTIONS),
    promptDir: path.join(workspace, PROMPT_DIR),
    mcpConfig: path.join(workspace, MCP_CONFIG),
    hooksDir: path.join(workspace, 'hooks'),
    mcpDir: path.join(workspace, 'mcp'),
    skillsDir: path.join(workspace, 'skills'),
  };
}

function atomicWrite(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (_err) {
    return false;
  }
}

function isManagedMarkdown(filePath) {
  try {
    return readText(filePath).includes(MANAGED_HEADER);
  } catch (_err) {
    return false;
  }
}

function isManagedJson(filePath) {
  try {
    const parsed = JSON.parse(readText(filePath));
    return parsed && parsed[MANAGED_JSON_MARKER] === true;
  } catch (_err) {
    return false;
  }
}

function withManagedHeader(content) {
  return content.includes(MANAGED_HEADER) ? content : `${MANAGED_HEADER}\n${content}`;
}

function copyManagedFile(src, dest, { force = false, json = false } = {}) {
  if (exists(dest)) {
    const managed = json ? isManagedJson(dest) : isManagedMarkdown(dest);
    if (!managed && !force) {
      return { ok: false, changed: false, error: `refusing to overwrite user-owned file: ${dest}` };
    }
  }
  let content = readText(src);
  if (json) {
    const parsed = JSON.parse(content);
    parsed[MANAGED_JSON_MARKER] = true;
    content = `${JSON.stringify(parsed, null, 2)}\n`;
  } else {
    content = withManagedHeader(content);
  }
  atomicWrite(dest, content);
  return { ok: true, changed: true };
}

function copyDir(src, dest, { force = false } = {}) {
  if (!exists(src)) return { ok: false, error: `missing source directory: ${src}` };
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      const result = copyDir(from, to, { force });
      if (!result.ok) return result;
    } else if (entry.isFile()) {
      if (exists(to) && !force) {
        try {
          const oldContent = fs.readFileSync(to, 'utf8');
          const newContent = fs.readFileSync(from, 'utf8');
          if (oldContent !== newContent) {
            return { ok: false, error: `refusing to overwrite existing runtime file: ${to}` };
          }
        } catch (_err) {
          return { ok: false, error: `refusing to overwrite existing runtime file: ${to}` };
        }
      }
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
  return { ok: true };
}

function removeIfManagedMarkdown(filePath) {
  if (!exists(filePath)) return false;
  if (!isManagedMarkdown(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

function removeIfManagedJson(filePath) {
  if (!exists(filePath)) return false;
  if (!isManagedJson(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

function removeEmptyParents(workspace, dirs) {
  for (const rel of dirs) {
    const dir = path.join(workspace, rel);
    try {
      if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    } catch (_err) {
      // best effort
    }
  }
}

function install({ workspace, force = false }) {
  const root = packageRoot();
  const p = targetPaths(workspace);
  fs.mkdirSync(workspace, { recursive: true });

  const steps = [];
  const instructionResult = copyManagedFile(
    path.join(root, COPILOT_INSTRUCTIONS),
    p.instructions,
    { force }
  );
  steps.push({ id: 'copilot_instructions', ...instructionResult });
  if (!instructionResult.ok) return { ok: false, action: 'install', workspace, steps, error: instructionResult.error };

  for (const file of PROMPT_FILES) {
    const result = copyManagedFile(
      path.join(root, PROMPT_DIR, file),
      path.join(p.promptDir, file),
      { force }
    );
    steps.push({ id: `prompt:${file}`, ...result });
    if (!result.ok) return { ok: false, action: 'install', workspace, steps, error: result.error };
  }

  const mcpResult = copyManagedFile(path.join(root, MCP_CONFIG), p.mcpConfig, { force, json: true });
  steps.push({ id: 'vscode_mcp_config', ...mcpResult });
  if (!mcpResult.ok) return { ok: false, action: 'install', workspace, steps, error: mcpResult.error };

  for (const dir of RUNTIME_DIRS) {
    const result = copyDir(path.join(root, dir), path.join(workspace, dir), { force });
    steps.push({ id: `runtime:${dir}`, ...result });
    if (!result.ok) return { ok: false, action: 'install', workspace, steps, error: result.error };
  }

  return { ok: true, action: 'install', workspace, steps };
}

function verify({ workspace }) {
  const p = targetPaths(workspace);
  const checks = [];

  checks.push({
    id: 'copilot_instructions',
    ok: isManagedMarkdown(p.instructions),
    detail: isManagedMarkdown(p.instructions)
      ? '.github/copilot-instructions.md installed'
      : 'missing managed Copilot instructions',
  });

  for (const file of PROMPT_FILES) {
    const promptPath = path.join(p.promptDir, file);
    checks.push({
      id: `prompt:${file}`,
      ok: isManagedMarkdown(promptPath),
      detail: isManagedMarkdown(promptPath) ? `${file} installed` : `${file} missing`,
    });
  }

  let mcpOk = false;
  let mcpDetail = 'missing managed .vscode/mcp.json';
  try {
    const mcp = JSON.parse(readText(p.mcpConfig));
    mcpOk = mcp[MANAGED_JSON_MARKER] === true && !!mcp.servers?.['evolver-proxy'];
    mcpDetail = mcpOk ? 'evolver-proxy MCP server configured' : 'managed MCP file does not define evolver-proxy';
  } catch (_err) {
    mcpOk = false;
  }
  checks.push({ id: 'vscode_mcp_config', ok: mcpOk, detail: mcpDetail });

  for (const name of HOOK_SCRIPTS) {
    const filePath = path.join(p.hooksDir, name);
    checks.push({
      id: `hook:${name}`,
      ok: exists(filePath),
      detail: exists(filePath) ? `${name} present` : `${name} missing`,
    });
  }

  checks.push({
    id: 'mcp_bridge',
    ok: exists(path.join(p.mcpDir, 'evolver-proxy.mjs')),
    detail: exists(path.join(p.mcpDir, 'evolver-proxy.mjs')) ? 'MCP bridge present' : 'MCP bridge missing',
  });

  checks.push({
    id: 'skill',
    ok: exists(path.join(p.skillsDir, 'capability-evolver', 'SKILL.md')),
    detail: exists(path.join(p.skillsDir, 'capability-evolver', 'SKILL.md')) ? 'capability-evolver skill present' : 'skill missing',
  });

  return {
    ok: checks.every((check) => check.ok),
    action: 'verify',
    workspace,
    checks,
  };
}

function uninstall({ workspace }) {
  const p = targetPaths(workspace);
  let removed = false;
  if (removeIfManagedMarkdown(p.instructions)) removed = true;
  for (const file of PROMPT_FILES) {
    if (removeIfManagedMarkdown(path.join(p.promptDir, file))) removed = true;
  }
  if (removeIfManagedJson(p.mcpConfig)) removed = true;
  removeEmptyParents(workspace, [PROMPT_DIR, '.github', '.vscode']);
  return { ok: true, action: 'uninstall', workspace, removed };
}

function printReport(report) {
  if (report.action === 'verify') {
    console.log(`[copilot] Verify ${report.ok ? 'passed' : 'failed'}`);
    console.log(`[copilot]   workspace: ${report.workspace}`);
    for (const check of report.checks) {
      console.log(`[copilot]   ${check.ok ? '[OK]  ' : '[FAIL]'} ${check.id} -- ${check.detail}`);
    }
    return;
  }
  if (report.ok) {
    const verb = report.action === 'uninstall' ? 'Uninstalled' : 'Installed';
    console.log(`[copilot] ${verb} Evolver support in ${report.workspace}`);
    if (report.action === 'install') {
      console.log('[copilot] Open this workspace in VS Code with GitHub Copilot Chat enabled.');
      console.log('[copilot] Enable the evolver-proxy MCP server when VS Code prompts you.');
    }
  } else {
    console.error(`[copilot] ${report.error || 'operation failed'}`);
  }
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error((err && err.message) || String(err));
    console.error(usage());
    process.exit(2);
  }
  if (args.action === 'help') {
    process.stdout.write(usage());
    return;
  }

  let report;
  if (args.action === 'verify') report = verify(args);
  else if (args.action === 'uninstall') report = uninstall(args);
  else report = install(args);

  printReport(report);
  if (!report.ok) process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  packageRoot,
  targetPaths,
  install,
  verify,
  uninstall,
  isManagedMarkdown,
  isManagedJson,
  PROMPT_FILES,
  MANAGED_HEADER,
  MANAGED_JSON_MARKER,
};
