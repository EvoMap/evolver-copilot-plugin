const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const COWORK = path.join(ROOT, 'cowork');
const { validatePackage, readPngInfo } = require('../scripts/validate-cowork-package');

describe('Copilot Cowork package', () => {
  it('passes package validation with the required skill and hosted MCP tools', () => {
    const report = validatePackage(COWORK);
    assert.equal(report.version, '0.2.0');
    assert.equal(report.skills, 1);
    assert.ok(report.tools >= 5);
    assert.ok(report.files.includes('skills/capability-evolver/SKILL.md'));
  });

  it('uses exact Microsoft icon dimensions with alpha channels', () => {
    const color = readPngInfo(path.join(COWORK, 'color.png'));
    const outline = readPngInfo(path.join(COWORK, 'outline.png'));
    assert.deepEqual([color.width, color.height], [192, 192]);
    assert.deepEqual([outline.width, outline.height], [32, 32]);
    assert.ok([4, 6].includes(color.colorType));
    assert.ok([4, 6].includes(outline.colorType));
  });

  it('builds an uploadable ZIP with package files at the archive root', () => {
    const build = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build-cowork-package.js')], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 15000,
    });
    assert.equal(build.status, 0, build.stderr || build.stdout);
    const zipPath = path.join(ROOT, 'dist', 'evolver-cowork.zip');
    assert.ok(fs.existsSync(zipPath));
    const list = spawnSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
    assert.equal(list.status, 0, list.stderr);
    const entries = list.stdout.trim().split(/\r?\n/);
    assert.ok(entries.includes('manifest.json'));
    assert.ok(entries.includes('mcp-tools.json'));
    assert.ok(entries.includes('skills/capability-evolver/SKILL.md'));
    assert.ok(!entries.some((entry) => entry.startsWith('cowork/') || entry.startsWith('__MACOSX/')));

    const firstArchive = fs.readFileSync(zipPath);
    const rebuild = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'build-cowork-package.js')], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 15000,
    });
    assert.equal(rebuild.status, 0, rebuild.stderr || rebuild.stdout);
    assert.deepEqual(fs.readFileSync(zipPath), firstArchive, 'Cowork ZIP should be reproducible');
  });

  it('has no runtime npm dependencies in the upload package or repository', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.deepEqual(packageJson.dependencies || {}, {});
    const manifest = JSON.parse(fs.readFileSync(path.join(COWORK, 'manifest.json'), 'utf8'));
    assert.equal(JSON.stringify(manifest).includes('node_modules'), false);
  });
});
