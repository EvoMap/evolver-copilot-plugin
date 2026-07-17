const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

function request(proc, id, method, params) {
  proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
}

describe('MCP bridge black-box behavior', () => {
  it('initializes and lists evolver tools over stdio', async () => {
    const proc = spawn(process.execPath, [path.join(ROOT, 'mcp', 'evolver-proxy.mjs')], {
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const responses = [];
    let buffer = '';
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line) responses.push(JSON.parse(line));
      }
    });

    try {
      request(proc, 1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {} });
      request(proc, 2, 'tools/list', {});

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timed out waiting for MCP responses')), 3000);
        const interval = setInterval(() => {
          if (responses.length >= 2) {
            clearTimeout(timer);
            clearInterval(interval);
            resolve();
          }
        }, 25);
      });

      const init = responses.find((r) => r.id === 1);
      const tools = responses.find((r) => r.id === 2);
      assert.equal(init.result.serverInfo.name, 'evolver-proxy');
      const names = tools.result.tools.map((tool) => tool.name);
      assert.ok(names.includes('evolver_status'));
      assert.ok(names.includes('evolver_search_assets'));
      assert.ok(names.includes('evolver_distill_conversation'));
    } finally {
      proc.kill('SIGTERM');
    }
  });
});
