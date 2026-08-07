#!/usr/bin/env node
// SPDX-License-Identifier: MIT

const MCP_URL = 'https://evomap.ai/mcp';
const RESOURCE_METADATA_URL = 'https://evomap.ai/.well-known/oauth-protected-resource';
const AUTHORIZATION_METADATA_URL = 'https://evomap.ai/.well-known/oauth-authorization-server';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function json(url) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  assert(response.ok, `${url} returned HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const resource = await json(RESOURCE_METADATA_URL);
  assert(resource.resource === 'https://evomap.ai', 'OAuth protected-resource metadata has an unexpected resource');
  assert(Array.isArray(resource.authorization_servers) && resource.authorization_servers.includes('https://evomap.ai'), 'OAuth protected-resource metadata has no EvoMap authorization server');

  const authorization = await json(AUTHORIZATION_METADATA_URL);
  assert(authorization.issuer === 'https://evomap.ai', 'OAuth issuer is not EvoMap');
  assert(authorization.authorization_endpoint === 'https://evomap.ai/oauth/authorize', 'OAuth authorization endpoint changed');
  assert(authorization.token_endpoint === 'https://evomap.ai/oauth/token', 'OAuth token endpoint changed');
  assert(typeof authorization.registration_endpoint === 'string' && authorization.registration_endpoint.startsWith('https://'), 'OAuth Dynamic Client Registration endpoint is missing');
  assert(Array.isArray(authorization.code_challenge_methods_supported) && authorization.code_challenge_methods_supported.includes('S256'), 'OAuth PKCE S256 support is missing');

  const initialize = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-06-18',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'evolver-cowork-package-check', version: '1.0.0' },
      },
    }),
    signal: AbortSignal.timeout(10000),
  });
  assert(initialize.status === 401, `unauthenticated MCP initialize should return 401, got ${initialize.status}`);
  const challenge = initialize.headers.get('www-authenticate') || '';
  assert(challenge.includes('Bearer'), 'MCP endpoint did not return a Bearer challenge');
  assert(challenge.includes(RESOURCE_METADATA_URL), 'MCP Bearer challenge did not advertise OAuth resource metadata');

  process.stdout.write(`${JSON.stringify({
    ok: true,
    mcpUrl: MCP_URL,
    oauthIssuer: authorization.issuer,
    registrationEndpoint: authorization.registration_endpoint,
    pkce: 'S256',
    unauthenticatedInitialize: initialize.status,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Cowork remote check failed: ${error.message}\n`);
  process.exitCode = 1;
});
