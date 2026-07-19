#!/usr/bin/env node
// SPDX-License-Identifier: MIT

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const scanRoots = ['.github', 'hooks', 'mcp', 'scripts', 'cowork', 'test', 'toolkit'];
const rootFiles = ['package.json', 'package-lock.json'];
const extensions = new Set(['.js', '.mjs', '.json', '.md', '.txt', '.yml', '.yaml']);
const findings = [];

const rules = [
  ['dynamic code execution', /\beval\s*\(|\bnew\s+Function\s*\(/g],
  ['shell-enabled child process', /\bshell\s*:\s*true\b/g],
  ['string-based child_process exec', /\b(?:exec|execSync)\s*\(/g],
  ['embedded private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['embedded credential', /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*["'][^"']{12,}["']/gi],
  ['unsafe TLS bypass', /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0/g],
];

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) findings.push({ file: path.relative(root, filePath), rule: 'symbolic link in scanned source' });
    else if (entry.isDirectory()) files.push(...walk(filePath));
    else if (entry.isFile() && extensions.has(path.extname(entry.name))) files.push(filePath);
  }
  return files;
}

const files = [
  ...rootFiles.map((file) => path.join(root, file)).filter((file) => fs.existsSync(file)),
  ...scanRoots.flatMap((directory) => walk(path.join(root, directory))),
];
for (const file of files) {
  if (file === __filename) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const [name, pattern] of rules) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push({ file: path.relative(root, file), rule: name });
  }
}

if (findings.length > 0) {
  process.stderr.write(`SAST preflight found ${findings.length} issue(s):\n`);
  for (const finding of findings) process.stderr.write(`- ${finding.file}: ${finding.rule}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`SAST preflight passed (${files.length} files, ${rules.length} rules).\n`);
}
