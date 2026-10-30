import fs from 'node:fs';
import path from 'node:path';
import { validateBundle, renderText, projectFacts, guidance,
  bundleSchema, policySchema, basePolicy } from './index.js';

// A local Model Context Protocol server over stdio. It exposes the same
// checks as the CLI. It has no network access, model calls or telemetry.

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
export const SERVER_INFO = { name: pkg.name, version: pkg.version };
export const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const patterns = bundleSchema.$defs.content.properties.pattern.enum;
const domains = bundleSchema.$defs.content.properties.domain.enum;
const fileUrl = rel => new URL(rel, import.meta.url);
const readText = rel => fs.readFileSync(fileUrl(rel), 'utf8');

const bundleInput = {
  bundle: { type: 'object', description: 'Content bundle as a JSON object. Use this or bundlePath.' },
  bundlePath: { type: 'string', description: 'Path to a bundle JSON file, relative to the server working directory. Use this or bundle.' }
};
const policyInput = {
  policy: { type: 'object', description: 'Project policy as a JSON object. Replaces the base policy as a whole.' },
  policyPath: { type: 'string', description: 'Path to a project policy JSON file. Replaces the base policy as a whole.' }
};
const scopeInput = {
  role: { type: 'string', description: 'A role declared in the bundle.' },
  phase: { type: 'string', description: 'A phase declared in the bundle.' },
  state: { type: 'object', description: 'Pre-evaluated fact values keyed by fact ID. The host engine supplies these.' }
};

export const tools = [
  {
    name: 'check_bundle',
    title: 'Check a content bundle',
    description: 'Validate a content bundle against the schemas, references, visibility rules and the content policy. Returns valid plus diagnostics with ruleId, severity, JSON pointer, contentId, message and repair hint. Run after every edit to a bundle.',
    inputSchema: { type: 'object', properties: { ...bundleInput, ...policyInput }, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'get_guidance',
    title: 'Get writing guidance',
    description: 'Return the principles, domain guidance, checked rules and content entry schema for one domain and optional pattern. Call before writing or editing text so the draft follows the same rules the checker applies.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { enum: domains, description: 'interface for system copy such as labels and errors; narrative for story text and dialogue.' },
        pattern: { enum: patterns, description: 'Optional content pattern to narrow the rules.' },
        ...policyInput
      },
      required: ['domain'], additionalProperties: false
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'render_text',
    title: 'Render one content entry',
    description: 'Render a content entry for a role and phase, filling placeholders from entity names, action costs and visible facts. Fails instead of guessing when the bundle is invalid, the entry is not visible or a fact is missing. Use it to confirm bindings after an edit.',
    inputSchema: {
      type: 'object',
      properties: { ...bundleInput, contentId: { type: 'string', description: 'ID of the content entry.' }, ...scopeInput, ...policyInput },
      required: ['contentId', 'role', 'phase'], additionalProperties: false
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'project_facts',
    title: 'Project visible facts',
    description: 'Return only the fact values a role may see in a phase. Use it to check what a piece of text can safely reference.',
    inputSchema: {
      type: 'object',
      properties: { ...bundleInput, ...scopeInput },
      required: ['role', 'phase'], additionalProperties: false
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'get_schema',
    title: 'Get a schema or the base policy',
    description: 'Return the bundle schema, the policy schema, the base policy or the list of domains and content patterns.',
    inputSchema: {
      type: 'object',
      properties: { which: { enum: ['bundle', 'policy', 'base-policy', 'patterns'] } },
      required: ['which'], additionalProperties: false
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }
];

export const resources = [
  { uri: 'pbbg://skill', name: 'Agent skill', file: '../skills/pbbg-content-schema/SKILL.md', mimeType: 'text/markdown',
    description: 'Workflow for agents editing content bundles.' },
  { uri: 'pbbg://schemas/bundle', name: 'Bundle schema', file: '../schemas/bundle.schema.json', mimeType: 'application/schema+json',
    description: 'JSON Schema for content bundles.' },
  { uri: 'pbbg://schemas/policy', name: 'Policy schema', file: '../schemas/policy.schema.json', mimeType: 'application/schema+json',
    description: 'JSON Schema for content policies.' },
  { uri: 'pbbg://policies/base', name: 'Base policy', file: '../policies/base.json', mimeType: 'application/json',
    description: 'Editable base policy with interface and narrative guidance.' },
  { uri: 'pbbg://examples/station', name: 'Station example', file: '../examples/station.json', mimeType: 'application/json',
    description: 'Original neutral example bundle.' },
  { uri: 'pbbg://docs/architecture', name: 'Architecture', file: '../docs/architecture.md', mimeType: 'text/markdown',
    description: 'Data responsibilities, data flow and limits.' },
  { uri: 'pbbg://docs/adoption', name: 'Adoption guide', file: '../docs/adoption.md', mimeType: 'text/markdown',
    description: 'How to adopt the architecture in an existing game.' }
];

class InputError extends Error {}

function loadJson(args, key, pathKey, cwd, fallback) {
  if (args[key] !== undefined && args[pathKey] !== undefined) throw new InputError(`Use ${key} or ${pathKey}, not both.`);
  if (args[key] !== undefined) {
    if (!args[key] || typeof args[key] !== 'object' || Array.isArray(args[key])) throw new InputError(`${key} must be a JSON object.`);
    return args[key];
  }
  if (args[pathKey] !== undefined) {
    if (typeof args[pathKey] !== 'string' || !args[pathKey]) throw new InputError(`${pathKey} must be a nonempty string.`);
    const file = path.resolve(cwd, args[pathKey]);
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { throw new InputError(`Cannot read ${pathKey}: ${file}`); }
    try { return JSON.parse(text); } catch (e) { throw new InputError(`${pathKey} is not valid JSON: ${e.message}`); }
  }
  if (fallback !== undefined) return fallback;
  throw new InputError(`Supply ${key} or ${pathKey}.`);
}
const requireString = (args, key) => {
  if (typeof args[key] !== 'string' || !args[key]) throw new InputError(`${key} must be a nonempty string.`);
  return args[key];
};
const stateOf = args => {
  if (args.state === undefined) return {};
  if (!args.state || typeof args.state !== 'object' || Array.isArray(args.state)) throw new InputError('state must be a JSON object.');
  return args.state;
};

function callTool(name, args, cwd) {
  const policy = () => loadJson(args, 'policy', 'policyPath', cwd, basePolicy);
  const bundle = () => loadJson(args, 'bundle', 'bundlePath', cwd);
  switch (name) {
    case 'check_bundle': {
      const diagnostics = validateBundle(bundle(), { policy: policy() });
      return { valid: !diagnostics.some(d => d.severity === 'error'), diagnostics };
    }
    case 'get_guidance':
      return guidance(requireString(args, 'domain'), { pattern: args.pattern, policy: policy() });
    case 'render_text':
      return { text: renderText(bundle(), requireString(args, 'contentId'), {
        role: requireString(args, 'role'), phase: requireString(args, 'phase'), state: stateOf(args), policy: policy() }) };
    case 'project_facts':
      return { facts: projectFacts(bundle(), stateOf(args), requireString(args, 'role'), requireString(args, 'phase')) };
    case 'get_schema': {
      const which = requireString(args, 'which');
      if (which === 'bundle') return bundleSchema;
      if (which === 'policy') return policySchema;
      if (which === 'base-policy') return basePolicy;
      if (which === 'patterns') return { domains, patterns };
      throw new InputError('which must be bundle, policy, base-policy or patterns.');
    }
    default:
      return undefined;
  }
}

const reply = (id, result) => ({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

// Handle one parsed JSON-RPC message. Returns a response object, or null for
// notifications and responses that need no reply.
export function handleMessage(message, { cwd = process.cwd() } = {}) {
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') return fail(null, -32600, 'Invalid request.');
  const { id, method, params = {} } = message;
  const isNotification = id === undefined;
  if (typeof method !== 'string') return isNotification ? null : fail(id ?? null, -32600, 'Invalid request.');
  if (isNotification) return null;
  switch (method) {
    case 'initialize': {
      const requested = params.protocolVersion;
      return reply(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: 'Tools for the PBBG Content Schema. Classify each text entry by domain and pattern, call get_guidance before writing, edit the bundle, then call check_bundle and fix every error by its ruleId and hint. Read the pbbg://skill resource for the full workflow.'
      });
    }
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, { tools });
    case 'tools/call': {
      const tool = tools.find(t => t.name === params.name);
      if (!tool) return fail(id, -32602, `Unknown tool: ${params.name}`);
      const args = params.arguments ?? {};
      if (typeof args !== 'object' || Array.isArray(args)) return fail(id, -32602, 'Tool arguments must be an object.');
      const allowed = Object.keys(tool.inputSchema.properties);
      const unknown = Object.keys(args).filter(k => !allowed.includes(k));
      if (unknown.length) return reply(id, { isError: true, content: [{ type: 'text', text: JSON.stringify({ ruleId: 'INPUT', message: `Unknown argument: ${unknown.join(', ')}.` }) }] });
      try {
        const result = callTool(params.name, args, cwd);
        return reply(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result });
      } catch (error) {
        const body = { ruleId: 'INPUT', message: error.message, ...(error.diagnostics ? { diagnostics: error.diagnostics } : {}) };
        return reply(id, { isError: true, content: [{ type: 'text', text: JSON.stringify(body, null, 2) }] });
      }
    }
    case 'resources/list':
      return reply(id, { resources: resources.map(({ file, ...r }) => r) });
    case 'resources/read': {
      const resource = resources.find(r => r.uri === params.uri);
      if (!resource) return fail(id, -32002, `Resource not found: ${params.uri}`);
      return reply(id, { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text: readText(resource.file) }] });
    }
    case 'resources/templates/list':
      return reply(id, { resourceTemplates: [] });
    case 'prompts/list':
      return reply(id, { prompts: [] });
    default:
      return fail(id, -32601, `Method not found: ${method}`);
  }
}

// Start the server on newline-delimited JSON over stdin and stdout.
export function serveStdio({ input = process.stdin, output = process.stdout, cwd = process.cwd() } = {}) {
  let buffer = '';
  const send = response => { if (response) output.write(JSON.stringify(response) + '\n'); };
  input.setEncoding('utf8');
  input.on('data', chunk => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let message;
      try { message = JSON.parse(line); } catch { send(fail(null, -32700, 'Parse error.')); continue; }
      if (Array.isArray(message)) { send(fail(null, -32600, 'Batch requests are not supported.')); continue; }
      send(handleMessage(message, { cwd }));
    }
  });
}
