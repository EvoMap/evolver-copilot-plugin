#!/usr/bin/env node
// SPDX-License-Identifier: MIT

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { validatePackage } = require('./validate-cowork-package');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'cowork');
const dist = path.join(root, 'dist');
const output = path.join(dist, 'evolver-cowork.zip');
const ZIP_EPOCH = new Date('1980-01-01T00:00:00.000Z');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${(result.stderr || result.stdout).trim()}`);
  }
  return result.stdout;
}

function normalizeTimestamps(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) normalizeTimestamps(entryPath);
    fs.utimesSync(entryPath, ZIP_EPOCH, ZIP_EPOCH);
  }
  fs.utimesSync(directory, ZIP_EPOCH, ZIP_EPOCH);
}

function build() {
  const sourceReport = validatePackage(source);
  fs.mkdirSync(dist, { recursive: true });
  if (fs.existsSync(output)) fs.unlinkSync(output);

  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'evolver-cowork-package-'));
  try {
    fs.cpSync(source, temporary, { recursive: true, dereference: true });
    validatePackage(temporary);
    normalizeTimestamps(temporary);
    run('zip', [
      '-X',
      '-q',
      '-r',
      output,
      'manifest.json',
      'color.png',
      'outline.png',
      'mcp-tools.json',
      'skills',
    ], { cwd: temporary, env: { ...process.env, TZ: 'UTC' } });
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }

  const listing = run('unzip', ['-Z1', output])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const required of ['manifest.json', 'color.png', 'outline.png', 'mcp-tools.json', 'skills/capability-evolver/SKILL.md']) {
    if (!listing.includes(required)) throw new Error(`built ZIP is missing root entry: ${required}`);
  }
  if (listing.some((entry) => entry.startsWith('/') || entry.includes('../') || entry.startsWith('__MACOSX/'))) {
    throw new Error('built ZIP contains an unsafe or platform-specific path');
  }

  const archive = fs.readFileSync(output);
  const sha256 = crypto.createHash('sha256').update(archive).digest('hex');
  const report = {
    ok: true,
    output,
    version: sourceReport.version,
    bytes: archive.length,
    sha256,
    entries: listing.length,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (require.main === module) {
  try {
    build();
  } catch (error) {
    process.stderr.write(`Cowork package build failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { build };
