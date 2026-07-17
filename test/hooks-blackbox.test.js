const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'evolver-copilot-hooks-'));
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_err) {
    // best effort
  }
}

function runHook(script, input, options = {}) {
  return spawnSync(process.execPath, [path.join(ROOT, 'hooks', script)], {
    input: JSON.stringify(input),
    cwd: options.cwd || ROOT,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8',
    timeout: 15000,
  });
}

describe('runtime helper black-box behavior', () => {
  it('signal-detect emits context for Copilot-style edited content payloads', () => {
    const result = runHook('signal-detect.js', {
      tool_input: {
        file_path: 'src/cache.js',
        content: 'throw new Error("timeout while loading cache")',
      },
    });
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout || '{}');
    assert.match(payload.additionalContext, /Evolution Signal/);
    assert.match(payload.additionalContext, /src\/cache.js/);
  });

  it('session-end records a git diff outcome into a local memory graph', () => {
    const dir = tmpDir();
    try {
      const repo = path.join(dir, 'repo');
      const graph = path.join(dir, 'memory_graph.jsonl');
      fs.mkdirSync(repo, { recursive: true });
      spawnSync('git', ['init'], { cwd: repo, encoding: 'utf8' });
      fs.writeFileSync(path.join(repo, 'feature.js'), 'console.log("baseline")\n', 'utf8');
      spawnSync('git', ['add', 'feature.js'], { cwd: repo, encoding: 'utf8' });
      fs.writeFileSync(path.join(repo, 'feature.js'), 'console.log("TODO optimize slow path timeout")\n', 'utf8');

      const result = runHook(
        'session-end.js',
        { session_id: 'blackbox-session' },
        {
          cwd: repo,
          env: {
            COPILOT_WORKSPACE_DIR: repo,
            MEMORY_GRAPH_PATH: graph,
            EVOLVER_SESSION_END_DEDUPE_TTL_MS: '1',
          },
        }
      );
      assert.equal(result.status, 0, result.stderr);
      assert.ok(fs.existsSync(graph));
      const lines = fs.readFileSync(graph, 'utf8').trim().split('\n');
      assert.equal(lines.length, 1);
      const entry = JSON.parse(lines[0]);
      assert.equal(entry.session_id, 'blackbox-session');
      assert.equal(entry.cwd, repo);
      assert.ok(entry.outcome);
      assert.ok(Array.isArray(entry.signals));
    } finally {
      cleanup(dir);
    }
  });
});
