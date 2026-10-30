import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { handleMessage, tools, resources } from '../src/mcp.js';

const root = new URL('..', import.meta.url).pathname;
const station = JSON.parse(fs.readFileSync(new URL('../examples/station.json', import.meta.url)));
const call = (name, args, id = 1) => handleMessage({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }, { cwd: root });

test('initialize negotiates a supported protocol version', () => {
  const r = handleMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
  assert.equal(r.result.protocolVersion, '2025-03-26');
  assert.ok(r.result.capabilities.tools && r.result.capabilities.resources);
  const unknown = handleMessage({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } });
  assert.equal(unknown.result.protocolVersion, '2025-06-18');
});
test('notifications get no reply and unknown methods fail', () => {
  assert.equal(handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  assert.equal(handleMessage({ jsonrpc: '2.0', id: 3, method: 'nope' }).error.code, -32601);
});
test('tools list declares read-only tools with object schemas', () => {
  const r = handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
  assert.deepEqual(r.result.tools.map(t => t.name), ['check_bundle', 'get_guidance', 'render_text', 'project_facts', 'get_schema']);
  for (const t of tools) { assert.equal(t.inputSchema.type, 'object'); assert.equal(t.annotations.readOnlyHint, true); }
});
test('check_bundle accepts an object or a path and reports diagnostics', () => {
  assert.equal(call('check_bundle', { bundle: station }).result.structuredContent.valid, true);
  const bad = call('check_bundle', { bundlePath: 'test/fixtures/hidden-binding.json' }).result.structuredContent;
  assert.equal(bad.valid, false);
  assert.ok(bad.diagnostics.some(d => d.ruleId === 'VISIBILITY'));
});
test('check_bundle applies a project policy', () => {
  const policy = JSON.parse(fs.readFileSync(new URL('../policies/base.json', import.meta.url)));
  policy.rules.push({ id: 'LOCAL-01', domains: ['interface'], patterns: ['action-label'], check: 'forbidden-phrase', value: 'request', severity: 'error', guidance: 'Use the project term.' });
  const r = call('check_bundle', { bundle: station, policy }).result.structuredContent;
  assert.equal(r.valid, false);
  assert.ok(r.diagnostics.some(d => d.ruleId === 'LOCAL-01'));
});
test('input problems return tool errors instead of guesses', () => {
  assert.equal(call('check_bundle', {}).result.isError, true);
  assert.equal(call('check_bundle', { bundle: station, bundlePath: 'x.json' }).result.isError, true);
  assert.equal(call('check_bundle', { bundlePath: 'missing.json' }).result.isError, true);
  assert.equal(call('check_bundle', { bundle: station, typo: 1 }).result.isError, true);
  assert.equal(call('get_guidance', { domain: 'unknown' }).result.isError, true);
  assert.equal(call('missing_tool', {}).error.code, -32602);
});
test('get_guidance narrows rules by pattern', () => {
  const g = call('get_guidance', { domain: 'narrative', pattern: 'dialogue' }).result.structuredContent;
  assert.ok(!g.rules.some(r => r.id === 'TEXT-01'));
  assert.equal(g.pattern, 'dialogue');
});
test('render_text and project_facts respect role and phase', () => {
  const text = call('render_text', { bundle: station, contentId: 'service.report', role: 'dispatcher', phase: 'planning', state: { 'service.status': 'requested', 'parcel.location': 'a' } });
  assert.equal(text.result.structuredContent.text, 'Service status: requested');
  const facts = call('project_facts', { bundle: station, role: 'dispatcher', phase: 'planning', state: { 'service.status': 'requested', 'parcel.location': 'a' } });
  assert.deepEqual(Object.keys(facts.result.structuredContent.facts), ['service.status']);
  assert.equal(call('render_text', { bundle: station, contentId: 'station.arrival', role: 'dispatcher', phase: 'planning' }).result.isError, true);
});
test('get_schema lists domains and patterns', () => {
  const r = call('get_schema', { which: 'patterns' }).result.structuredContent;
  assert.equal(r.patterns.length, 14);
  assert.deepEqual(r.domains, ['interface', 'narrative']);
});
test('every resource reads from a packaged file', () => {
  for (const { uri } of resources) {
    const r = handleMessage({ jsonrpc: '2.0', id: 1, method: 'resources/read', params: { uri } });
    assert.ok(r.result.contents[0].text.length > 0, uri);
  }
  assert.equal(handleMessage({ jsonrpc: '2.0', id: 1, method: 'resources/read', params: { uri: 'pbbg://missing' } }).error.code, -32002);
});
test('skill file has the frontmatter agents load', () => {
  const skill = fs.readFileSync(new URL('../skills/pbbg-content-schema/SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /^---\nname: pbbg-content-schema\ndescription: .+\n---\n/);
  for (const t of tools) assert.ok(skill.includes(t.name), `skill mentions ${t.name}`);
});
test('CLI mcp command serves JSON-RPC over stdio', async () => {
  const child = spawn(process.execPath, ['bin/pbbg-content.js', 'mcp'], { cwd: root });
  const lines = [];
  let buffer = '';
  const done = new Promise(resolve => child.stdout.on('data', chunk => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) { lines.push(JSON.parse(buffer.slice(0, i))); buffer = buffer.slice(i + 1); }
    if (lines.length >= 3) resolve();
  }));
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } }) + '\n');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  child.stdin.write('not json\n');
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'check_bundle', arguments: { bundlePath: 'examples/station.json' } } }) + '\n');
  await done;
  child.kill();
  assert.equal(lines[0].result.serverInfo.name, 'pbbg-content-schema');
  assert.equal(lines[1].error.code, -32700);
  assert.equal(lines[2].result.structuredContent.valid, true);
});
test('CLI installs the skill into a chosen directory', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbbg-skill-'));
  const r = spawnSync(process.execPath, [path.join(root, 'bin/pbbg-content.js'), 'install-skill', dir], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.ok(fs.existsSync(path.join(dir, 'pbbg-content-schema', 'SKILL.md')));
  fs.rmSync(dir, { recursive: true, force: true });
});
test('registry metadata matches the package', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
  const server = JSON.parse(fs.readFileSync(new URL('../server.json', import.meta.url)));
  assert.equal(server.name, pkg.mcpName);
  assert.equal(server.version, pkg.version);
  assert.equal(server.packages[0].identifier, pkg.name);
  assert.equal(server.packages[0].version, pkg.version);
  assert.ok(server.description.length <= 100);
});
