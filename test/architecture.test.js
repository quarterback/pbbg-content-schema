import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import { validateBundle, validatePolicy, renderText, projectFacts, guidance, basePolicy } from '../src/index.js';
const source = JSON.parse(fs.readFileSync(new URL('../examples/station.json', import.meta.url)));
const copy = () => structuredClone(source);
const errors = b => validateBundle(b).filter(d => d.severity === 'error');
const has = (b, rule) => assert.ok(errors(b).some(d => d.ruleId === rule), `expected ${rule}`);

test('neutral bundle is valid', () => assert.deepEqual(validateBundle(copy()), []));
for (const [name, mutate, rule] of [
  ['unknown schema version', b => b.schemaVersion = '1.0.0', 'SCHEMA'],
  ['unknown property', b => b.content[0].typo = true, 'SCHEMA'],
  ['duplicate content ID', b => b.content.push(structuredClone(b.content[0])), 'DUPLICATE'],
  ['unknown action', b => b.events[0].choices[0].actionRef = 'missing', 'REFERENCE'],
  ['duplicate local choice ID', b => b.events[0].choices.push(structuredClone(b.events[0].choices[0])), 'DUPLICATE'],
  ['unknown scene successor', b => b.scenes[0].next.push('missing'), 'REFERENCE'],
  ['unknown effect type', b => b.actions[0].effects[0].type = 'unknown', 'REFERENCE'],
  ['wrong effect value type', b => b.actions[0].effects[0].value = 12, 'EFFECT'],
  ['missing effect target', b => delete b.actions[0].effects[0].target, 'EFFECT'],
  ['unknown fact role', b => b.facts[0].audience.push('unknown'), 'AUDIENCE'],
  ['wrong condition type', b => b.actions[0].requires[0].value = 42, 'CONDITION'],
  ['missing template binding', b => b.content[1].text += ' {missing}', 'BINDING'],
  ['unused template binding', b => b.content[1].bindings.extra = {source: 'fact', ref:'service.status'}, 'BINDING'],
  ['unknown cost key', b => b.content[1].bindings.turns.key = 'missing', 'BINDING'],
  ['hidden fact binding', b => b.content[4].bindings.status.ref = 'parcel.location', 'VISIBILITY'],
  ['phase leak', b => b.facts[0].phases = ['debrief'], 'VISIBILITY'],
  ['missing dialogue speaker', b => { b.content[3].pattern = 'dialogue'; delete b.content[3].speakerRef; }, 'SPEAKER'],
  ['unknown speaker', b => b.content[3].speakerRef = 'missing', 'REFERENCE'],
  ['wrong choice content pattern', b => b.events[0].choices[0].labelRef = 'service.preview', 'PATTERN'],
  ['wrong outcome content pattern', b => b.outcomes[0].textRef = 'service.preview', 'PATTERN'],
  ['bad placeholder syntax', b => b.content[1].text += ' {{nested}}', 'TEMPLATE'],
  ['HTML in text', b => b.content[3].text = '<script>unsafe</script>', 'TEXT-03'],
  ['label period', b => b.content[0].text += '.', 'TEXT-01'],
]) test(name, () => { const b = copy(); mutate(b); has(b, rule); });

test('cost binding follows action data', () => {
  const b = copy(); b.actions[0].cost.turns = 3;
  assert.match(renderText(b, 'service.preview', {role:'traveler', phase:'planning'}), /^Turns required: 3/);
});
test('role projection excludes actual location and unrelated state', () => {
  const state = {'service.status':'available', 'parcel.location':'room-a', secret:'hidden'};
  const output = projectFacts(copy(), state, 'dispatcher', 'planning');
  assert.deepEqual(Object.keys(output), ['service.status']);
  const changed = {...state, 'parcel.location':'room-b'};
  assert.deepEqual(output, projectFacts(copy(), changed, 'dispatcher', 'planning'));
});
test('rendered report does not change with hidden state', () => {
  const b = copy(), options = {role:'dispatcher', phase:'planning'};
  const a = renderText(b, 'service.report', {...options, state:{'service.status':'requested','parcel.location':'a'}});
  const c = renderText(b, 'service.report', {...options, state:{'service.status':'requested','parcel.location':'b'}});
  assert.equal(a, c);
});
test('wrong audience and phase cannot render text', () => {
  assert.throws(() => renderText(copy(), 'station.arrival', {role:'dispatcher',phase:'planning'}));
  assert.throws(() => renderText(copy(), 'service.ending', {role:'traveler',phase:'planning'}));
});
test('missing or mistyped fact does not render a guessed value', () => {
  assert.throws(() => renderText(copy(), 'service.report', {role:'dispatcher',phase:'planning'}));
  assert.throws(() => renderText(copy(), 'service.report', {role:'dispatcher',phase:'planning',state:{'service.status':12}}));
});
test('render output remains plain text; host must use textContent', () => {
  assert.equal(renderText(copy(), 'service.report', {role:'dispatcher',phase:'planning',state:{'service.status':'<b>late</b>'}}), 'Service status: <b>late</b>');
});
test('editorial warning does not fail a bundle', () => {
  const b = copy(); b.content[0].text = 'Ask the station manager to request the service';
  const ds = validateBundle(b);
  assert.ok(ds.some(d => d.ruleId === 'TEXT-02' && d.severity === 'warning'));
  assert.equal(errors(b).length, 0);
});
test('policy remains independent by domain and pattern', () => {
  const policy = structuredClone(basePolicy);
  policy.rules.push({id:'LOCAL-01',domains:['interface'],patterns:['action-label'],check:'forbidden-phrase',value:'request',severity:'error',guidance:'Use the chosen project term.'});
  const ds = validateBundle(copy(), {policy});
  assert.equal(ds.filter(d => d.ruleId === 'LOCAL-01').length, 1);
  assert.equal(ds.find(d => d.ruleId === 'LOCAL-01').contentId, 'service.label');
});
test('invalid policies are reported', () => {
  const p = structuredClone(basePolicy); p.rules[1].value = 0;
  assert.ok(validatePolicy(p).length);
});
test('task guidance selects matching rules and a compilable schema', () => {
  const g = guidance('narrative', {pattern:'dialogue'});
  assert.ok(!g.rules.some(r => r.id === 'TEXT-01'));
  const validate = new Ajv2020({strict:true, allowUnionTypes:true}).compile(g.schema);
  assert.ok(validate(copy().content[3]));
  assert.throws(() => guidance('unknown'));
});
test('mechanics can vary without changing core effect types', () => {
  const b = copy(); b.effectTypes[0].id = 'garden.water'; b.actions[0].effects[0].type = 'garden.water';
  assert.equal(errors(b).length, 0);
});
test('CLI checks real fixture and returns machine-readable diagnostics', () => {
  const ok = spawnSync(process.execPath, ['bin/pbbg-content.js','check','examples/station.json','--json'],{encoding:'utf8'});
  assert.equal(ok.status, 0); assert.equal(JSON.parse(ok.stdout).valid, true);
  const bad = spawnSync(process.execPath, ['bin/pbbg-content.js','check','test/fixtures/hidden-binding.json','--json'],{encoding:'utf8'});
  assert.equal(bad.status, 1); assert.ok(JSON.parse(bad.stdout).diagnostics.some(d => d.ruleId === 'VISIBILITY'));
  const input = spawnSync(process.execPath,['bin/pbbg-content.js','check','missing.json'],{encoding:'utf8'});
  assert.equal(input.status, 2); assert.equal(JSON.parse(input.stderr).ruleId,'INPUT');
});
