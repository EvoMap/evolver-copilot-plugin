const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const installer = require('../scripts/install');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'evolver-copilot-install-'));
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_err) {
    // best effort
  }
}

describe('Copilot workspace installer', () => {
  it('installs Copilot instructions, prompt files, MCP config, and runtime files', () => {
    const workspace = tmpDir();
    try {
      const report = installer.install({ workspace, force: false });
      assert.equal(report.ok, true);

      const paths = installer.targetPaths(workspace);
      assert.ok(fs.readFileSync(paths.instructions, 'utf8').includes(installer.MANAGED_HEADER));
      for (const file of installer.PROMPT_FILES) {
        assert.ok(fs.readFileSync(path.join(paths.promptDir, file), 'utf8').includes(installer.MANAGED_HEADER));
      }
      const mcp = JSON.parse(fs.readFileSync(paths.mcpConfig, 'utf8'));
      assert.equal(mcp[installer.MANAGED_JSON_MARKER], true);
      assert.ok(mcp.servers['evolver-proxy']);
      assert.ok(fs.existsSync(path.join(workspace, 'hooks', 'session-start.js')));
      assert.ok(fs.existsSync(path.join(workspace, 'mcp', 'evolver-proxy.mjs')));

      const verify = installer.verify({ workspace });
      assert.equal(verify.ok, true, JSON.stringify(verify, null, 2));
    } finally {
      cleanup(workspace);
    }
  });

  it('refuses to overwrite user-owned Copilot instructions without force', () => {
    const workspace = tmpDir();
    try {
      const paths = installer.targetPaths(workspace);
      fs.mkdirSync(path.dirname(paths.instructions), { recursive: true });
      fs.writeFileSync(paths.instructions, '# user instructions\n', 'utf8');
      const report = installer.install({ workspace, force: false });
      assert.equal(report.ok, false);
      assert.match(report.error, /refusing to overwrite user-owned file/);
    } finally {
      cleanup(workspace);
    }
  });

  it('uninstalls only managed Copilot files', () => {
    const workspace = tmpDir();
    try {
      installer.install({ workspace, force: false });
      const report = installer.uninstall({ workspace });
      assert.equal(report.ok, true);
      assert.equal(report.removed, true);
      const paths = installer.targetPaths(workspace);
      assert.ok(!fs.existsSync(paths.instructions));
      assert.ok(!fs.existsSync(paths.mcpConfig));
    } finally {
      cleanup(workspace);
    }
  });

  it('reports verify failure before install', () => {
    const workspace = tmpDir();
    try {
      const report = installer.verify({ workspace });
      assert.equal(report.ok, false);
      const failed = report.checks.filter((check) => !check.ok).map((check) => check.id);
      assert.ok(failed.includes('copilot_instructions'));
      assert.ok(failed.includes('vscode_mcp_config'));
    } finally {
      cleanup(workspace);
    }
  });
});
