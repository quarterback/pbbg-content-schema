#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { validateBundle, guidance, basePolicy } from '../src/index.js';
const usage = 'Usage: pbbg-content check BUNDLE [--policy FILE] [--json] | guidance DOMAIN [--pattern NAME] [--policy FILE] | install-skill [DIR] | mcp';
const args = process.argv.slice(2), command = args.shift();
const option = name => { const i = args.indexOf(name); if (i < 0) return undefined; const value = args[i + 1]; if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}.`); args.splice(i, 2); return value; };
try {
  if (command === 'mcp') {
    if (args.length) throw new Error(usage);
    const { serveStdio } = await import('../src/mcp.js');
    serveStdio();
  } else if (command === 'install-skill') {
    if (args.length > 1 || args.some(a => a.startsWith('--'))) throw new Error(usage);
    const source = new URL('../skills/pbbg-content-schema/SKILL.md', import.meta.url);
    const target = path.resolve(args[0] || path.join('.claude', 'skills'), 'pbbg-content-schema');
    fs.mkdirSync(target, { recursive: true });
    fs.copyFileSync(source, path.join(target, 'SKILL.md'));
    console.log(`Installed skill at ${path.join(target, 'SKILL.md')}`);
  } else {
    const policyPath = option('--policy'), pattern = option('--pattern');
    const json = args.includes('--json'); if (json) args.splice(args.indexOf('--json'), 1);
    const policy = policyPath ? JSON.parse(fs.readFileSync(policyPath, 'utf8')) : basePolicy;
    if (args.length !== 1 || !['check', 'guidance'].includes(command) || args[0].startsWith('--')) throw new Error(usage);
    if (command === 'guidance') console.log(JSON.stringify(guidance(args[0], { pattern, policy }), null, 2));
    else {
      if (pattern) throw new Error('--pattern applies to guidance only.');
      const diagnostics = validateBundle(JSON.parse(fs.readFileSync(args[0], 'utf8')), { policy });
      if (json) console.log(JSON.stringify({ valid: !diagnostics.some(d => d.severity === 'error'), diagnostics }, null, 2));
      else { for (const d of diagnostics) console.log(`${d.severity} ${d.ruleId} ${d.contentId || ''} ${d.path}: ${d.message}\n  ${d.hint}`); if (!diagnostics.length) console.log('Content checks passed.'); }
      if (diagnostics.some(d => d.severity === 'error')) process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(JSON.stringify({ ruleId: 'INPUT', severity: 'error', message: error.message, ...(error.diagnostics ? { diagnostics: error.diagnostics } : {}) }));
  process.exitCode = 2;
}
