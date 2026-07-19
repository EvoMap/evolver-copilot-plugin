#!/usr/bin/env node
// SPDX-License-Identifier: MIT

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_MANIFEST_FIELDS = [
  'manifestVersion',
  'version',
  'id',
  'developer',
  'name',
  'description',
  'icons',
  'accentColor',
];

function fail(message) {
  throw new Error(`Cowork package validation failed: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${path.basename(filePath)} is not valid JSON: ${error.message}`);
  }
}

function readPngInfo(filePath) {
  const data = fs.readFileSync(filePath);
  const pngSignature = '89504e470d0a1a0a';
  assert(data.length >= 26, `${path.basename(filePath)} is too small to be a PNG`);
  assert(data.subarray(0, 8).toString('hex') === pngSignature, `${path.basename(filePath)} is not a PNG`);
  assert(data.subarray(12, 16).toString('ascii') === 'IHDR', `${path.basename(filePath)} has no PNG IHDR`);
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    colorType: data[25],
  };
}

function frontmatterValue(markdown, key) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert(match, 'SKILL.md must start with YAML frontmatter between --- delimiters');
  const line = match[1].split(/\r?\n/).find((entry) => entry.startsWith(`${key}:`));
  assert(line, `SKILL.md frontmatter is missing ${key}`);
  return line.slice(key.length + 1).trim();
}

function walkFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    assert(!entry.isSymbolicLink(), `symbolic links are not allowed: ${absolute}`);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function validatePackage(packageRoot) {
  const root = path.resolve(packageRoot);
  assert(fs.existsSync(root), `package source does not exist: ${root}`);

  const manifestPath = path.join(root, 'manifest.json');
  const manifest = readJson(manifestPath);
  for (const field of REQUIRED_MANIFEST_FIELDS) {
    assert(manifest[field] !== undefined, `manifest.json is missing ${field}`);
  }
  assert(manifest.manifestVersion === '1.28', 'manifestVersion must be 1.28');
  assert(/^\d+\.\d+\.\d+$/.test(manifest.version), 'manifest version must be numeric semver');
  assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(manifest.id), 'manifest id must be a UUID');
  assert(/^#[0-9a-f]{6}$/i.test(manifest.accentColor), 'accentColor must be a six-digit hex color');

  for (const urlField of ['websiteUrl', 'privacyUrl', 'termsOfUseUrl']) {
    const value = manifest.developer[urlField];
    assert(typeof value === 'string' && value.startsWith('https://'), `developer.${urlField} must use HTTPS`);
  }

  const iconExpectations = [
    ['color', 192],
    ['outline', 32],
  ];
  for (const [kind, size] of iconExpectations) {
    const relative = manifest.icons[kind];
    assert(typeof relative === 'string' && !relative.includes('..'), `icons.${kind} must be a safe relative path`);
    const info = readPngInfo(path.join(root, relative));
    assert(info.width === size && info.height === size, `${relative} must be ${size}x${size}, got ${info.width}x${info.height}`);
    assert([4, 6].includes(info.colorType), `${relative} must have an alpha channel`);
  }

  assert(Array.isArray(manifest.agentSkills) && manifest.agentSkills.length > 0, 'manifest must declare at least one agentSkill');
  assert(manifest.agentSkills.length <= 20, 'manifest can declare at most 20 agentSkills');
  const skillFolders = new Set();
  for (const skill of manifest.agentSkills) {
    assert(typeof skill.folder === 'string' && skill.folder.length <= 256, 'each agentSkill needs a valid folder');
    assert(!skill.folder.startsWith('/') && !skill.folder.includes('..') && !skill.folder.includes('\\'), `unsafe skill folder: ${skill.folder}`);
    assert(!skillFolders.has(skill.folder), `duplicate skill folder: ${skill.folder}`);
    skillFolders.add(skill.folder);
    const skillFile = path.join(root, skill.folder, 'SKILL.md');
    assert(fs.existsSync(skillFile), `missing ${skill.folder}/SKILL.md`);
    const markdown = fs.readFileSync(skillFile, 'utf8');
    const folderName = path.basename(skill.folder);
    const name = frontmatterValue(markdown, 'name');
    frontmatterValue(markdown, 'description');
    assert(name === folderName, `skill name ${name} must match folder ${folderName}`);
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name), `skill name must be kebab-case: ${name}`);
    for (const forbidden of ['127.0.0.1', 'localhost', '~/.evolver', 'EVOMAP_API_KEY', 'process.env']) {
      assert(!markdown.includes(forbidden), `Cowork skill contains unsupported local/runtime reference: ${forbidden}`);
    }
  }

  assert(Array.isArray(manifest.agentConnectors) && manifest.agentConnectors.length === 1, 'manifest must declare the EvoMap connector exactly once');
  const connector = manifest.agentConnectors[0];
  const remote = connector.toolSource && connector.toolSource.remoteMcpServer;
  assert(connector.id === 'evomap-gep', 'connector id must remain stable as evomap-gep');
  assert(remote && remote.mcpServerUrl === 'https://evomap.ai/mcp', 'connector must use the hosted EvoMap MCP endpoint');
  assert(remote.authorization === undefined, 'authorization must be omitted so Cowork can use EvoMap Dynamic Client Registration');
  assert(remote.mcpToolDescription && typeof remote.mcpToolDescription.file === 'string', 'connector must reference a static MCP tool description');

  const toolCatalog = readJson(path.join(root, remote.mcpToolDescription.file));
  assert(Array.isArray(toolCatalog.tools) && toolCatalog.tools.length > 0, 'MCP tool description must contain tools');
  const toolNames = new Set();
  for (const tool of toolCatalog.tools) {
    assert(typeof tool.name === 'string' && /^[a-z0-9_]+$/.test(tool.name), `invalid MCP tool name: ${tool.name}`);
    assert(!toolNames.has(tool.name), `duplicate MCP tool: ${tool.name}`);
    toolNames.add(tool.name);
    assert(typeof tool.description === 'string' && tool.description.length > 10, `${tool.name} needs a useful description`);
    assert(tool.inputSchema && tool.inputSchema.type === 'object', `${tool.name} needs an object inputSchema`);
  }
  for (const requiredTool of ['gep_status', 'gep_recall', 'gep_search_community', 'gep_evolve', 'gep_record_outcome']) {
    assert(toolNames.has(requiredTool), `MCP tool description is missing ${requiredTool}`);
  }

  const files = walkFiles(root);
  const relativeFiles = files.map((file) => path.relative(root, file).split(path.sep).join('/'));
  for (const relative of relativeFiles) {
    assert(!relative.split('/').some((part) => part.startsWith('.')), `hidden files are not allowed: ${relative}`);
    assert(!relative.includes('..'), `path traversal is not allowed: ${relative}`);
    assert(fs.statSync(path.join(root, relative)).size <= 5 * 1024 * 1024, `file exceeds 5 MB: ${relative}`);
  }
  const allowedTopLevel = new Set(['manifest.json', 'color.png', 'outline.png', 'mcp-tools.json', 'skills']);
  for (const relative of relativeFiles) {
    assert(allowedTopLevel.has(relative.split('/')[0]), `unexpected top-level package content: ${relative}`);
  }

  const text = files
    .filter((file) => /\.(?:json|md)$/i.test(file))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
  const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*["'][^"']{12,}["']/i,
    /\bek_[a-z0-9_-]{16,}\b/i,
  ];
  for (const pattern of secretPatterns) assert(!pattern.test(text), `potential embedded secret matched ${pattern}`);

  return {
    root,
    version: manifest.version,
    appId: manifest.id,
    skills: manifest.agentSkills.length,
    tools: toolCatalog.tools.length,
    files: relativeFiles.sort(),
  };
}

if (require.main === module) {
  try {
    const report = validatePackage(process.argv[2] || path.resolve(__dirname, '..', 'cowork'));
    process.stdout.write(`${JSON.stringify({ ok: true, ...report }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { validatePackage, readPngInfo };
