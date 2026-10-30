import fs from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';

const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
export const bundleSchema = read('../schemas/bundle.schema.json');
export const policySchema = read('../schemas/policy.schema.json');
export const basePolicy = read('../policies/base.json');
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
const checkBundle = ajv.compile(bundleSchema);
const checkPolicy = ajv.compile(policySchema);
const own = (o, k) => Object.hasOwn(o, k);
const slots = text => [...text.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/g)].map(m => m[1]);
const pointer = value => String(value).replace(/~/g, '~0').replace(/\//g, '~1');
function diagnostic(ruleId, path, message, hint, contentId, severity = 'error') {
  return { ruleId, severity, path, ...(contentId ? { contentId } : {}), message, hint };
}
function schemaErrors(validate, value, kind) {
  if (validate(value)) return [];
  return validate.errors.map(e => diagnostic(kind, e.instancePath || '/', e.message,
    `Check the ${kind === 'SCHEMA' ? 'bundle' : 'policy'} schema at ${e.schemaPath}.`));
}
export function validatePolicy(policy) {
  const errors = schemaErrors(checkPolicy, policy, 'POLICY');
  if (errors.length) return errors;
  const ids = new Set();
  for (const [i, rule] of policy.rules.entries()) {
    if (ids.has(rule.id)) errors.push(diagnostic('DUPLICATE', `/rules/${i}/id`, 'Duplicate policy rule ID.', 'Give each rule a distinct ID.'));
    ids.add(rule.id);
    if (rule.check === 'max-words' && (!Number.isInteger(rule.value) || rule.value < 1)) errors.push(diagnostic('POLICY', `/rules/${i}/value`, 'Word budget must be a positive integer.', 'Set a positive word budget.'));
    if (rule.check === 'forbidden-phrase' && (typeof rule.value !== 'string' || !rule.value.trim())) errors.push(diagnostic('POLICY', `/rules/${i}/value`, 'Phrase must be a nonempty string.', 'Declare a literal phrase.'));
  }
  return errors;
}
export function validateBundle(bundle, { policy = basePolicy } = {}) {
  const diagnostics = [...schemaErrors(checkBundle, bundle, 'SCHEMA'), ...validatePolicy(policy)];
  if (diagnostics.length) return diagnostics;
  const add = (rule, path, message, hint, id, severity) => diagnostics.push(diagnostic(rule, path, message, hint, id, severity));
  const indexes = {};
  for (const collection of ['entities', 'facts', 'effectTypes', 'actions', 'content', 'scenes', 'events', 'outcomes']) {
    indexes[collection] = new Map();
    bundle[collection].forEach((item, i) => {
      if (indexes[collection].has(item.id)) add('DUPLICATE', `/${collection}/${i}/id`, `Duplicate ${collection} ID: ${item.id}.`, 'Use a stable ID unique within this collection.', item.id);
      indexes[collection].set(item.id, item);
    });
  }
  const link = (collection, id, path, owner) => {
    const value = indexes[collection].get(id);
    if (!value) add('REFERENCE', path, `Unknown ${collection} reference: ${id}.`, `Declare the ID in ${collection} or correct this reference.`, owner);
    return value;
  };
  const checkScope = (item, path) => {
    for (const role of item.audience) if (!bundle.roles.includes(role)) add('AUDIENCE', path + '/audience', `Unknown role: ${role}.`, 'Use a declared role.', item.id);
    for (const phase of item.phases) if (!bundle.phases.includes(phase)) add('PHASE', path + '/phases', `Unknown phase: ${phase}.`, 'Use a declared phase.', item.id);
  };
  bundle.facts.forEach((fact, i) => checkScope(fact, `/facts/${i}`));
  const conditions = (items, path, id) => (items || []).forEach((condition, i) => {
    const fact = link('facts', condition.ref, `${path}/${i}/ref`, id);
    if (fact && (typeof condition.value !== fact.type || (condition.op === 'gte' && fact.type !== 'number') || (condition.op === 'contains' && fact.type !== 'string'))) add('CONDITION', `${path}/${i}`, 'Condition value or operator does not match the fact type.', 'Use eq for matching types, gte for numbers or contains for strings.', id);
  });
  bundle.actions.forEach((action, i) => {
    conditions(action.requires, `/actions/${i}/requires`, action.id);
    action.effects.forEach((effect, n) => {
      const path = `/actions/${i}/effects/${n}`, type = link('effectTypes', effect.type, path + '/type', action.id);
      if (!type) return;
      const actual = effect.value === null ? 'null' : typeof effect.value;
      if (actual !== type.valueType) add('EFFECT', path + '/value', 'Effect value has the wrong type.', `Supply ${type.valueType}.`, action.id);
      if (type.targetKind === 'none') { if (effect.target) add('EFFECT', path + '/target', 'This effect has no target.', 'Remove the target field.', action.id); }
      else if (!effect.target) add('EFFECT', path, 'Effect target is missing.', 'Supply a declared target.', action.id);
      else link(type.targetKind === 'fact' ? 'facts' : 'entities', effect.target, path + '/target', action.id);
    });
  });
  bundle.content.forEach((content, i) => {
    const path = `/content/${i}`;
    checkScope(content, path);
    if (content.speakerRef) link('entities', content.speakerRef, path + '/speakerRef', content.id);
    if (content.pattern === 'dialogue' && !content.speakerRef) add('SPEAKER', path, 'Dialogue requires a speaker.', 'Set speakerRef to a declared entity.', content.id);
    const bindings = content.bindings || {}, names = new Set(slots(content.text));
    if (/[{}]/.test(content.text.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, ''))) add('TEMPLATE', path + '/text', 'Unsupported template braces.', 'Use only named placeholders such as {name}.', content.id);
    for (const name of names) if (!own(bindings, name)) add('BINDING', path + '/text', `Missing binding for {${name}}.`, 'Declare the placeholder in bindings.', content.id);
    for (const [name, binding] of Object.entries(bindings)) {
      const bp = path + '/bindings/' + pointer(name);
      if (!names.has(name)) add('BINDING', bp, 'Binding is not used in the text.', 'Remove it or use its named placeholder.', content.id);
      if (binding.source === 'fact') {
        const fact = link('facts', binding.ref, bp + '/ref', content.id);
        if (binding.key) add('BINDING', bp, 'Fact bindings refer to one declared fact.', 'Remove key; do not traverse arbitrary state paths.', content.id);
        if (fact && (content.audience.some(role => !fact.audience.includes(role)) || content.phases.some(phase => !fact.phases.includes(phase)))) add('VISIBILITY', bp, 'Content can expose a fact outside its audience or phase.', 'Narrow content visibility or bind an appropriate public fact.', content.id);
      } else if (binding.source === 'entity') {
        link('entities', binding.ref, bp + '/ref', content.id);
        if (binding.key) add('BINDING', bp, 'Entity bindings resolve the public name.', 'Remove key.', content.id);
      } else {
        const action = link('actions', binding.ref, bp + '/ref', content.id);
        if (!binding.key || (action && !own(action.cost, binding.key))) add('BINDING', bp, 'Action cost key is missing or unknown.', 'Bind a key declared in the referenced action cost.', content.id);
      }
    }
    for (const rule of policy.rules) {
      if (!rule.domains.includes(content.domain) || (rule.patterns && !rule.patterns.includes(content.pattern))) continue;
      const text = content.text;
      const failed = rule.check === 'terminal-punctuation' ? /[.!?]$/.test(text.trim()) : rule.check === 'max-words' ? text.trim().split(/\s+/u).length > rule.value : rule.check === 'forbidden-phrase' ? text.toLocaleLowerCase('en-US').includes(rule.value.toLocaleLowerCase('en-US')) : /<[^>]*>/.test(text);
      if (failed) add(rule.id, path + '/text', rule.guidance, 'Revise this content or make an explicit, reviewed policy change.', content.id, rule.severity);
    }
  });
  bundle.scenes.forEach((scene, i) => {
    conditions(scene.entry, `/scenes/${i}/entry`, scene.id);
    for (const next of scene.next) link('scenes', next, `/scenes/${i}/next`, scene.id);
    for (const ref of scene.contentRefs) link('content', ref, `/scenes/${i}/contentRefs`, scene.id);
    for (const ref of scene.actionRefs) link('actions', ref, `/scenes/${i}/actionRefs`, scene.id);
  });
  bundle.events.forEach((event, i) => {
    conditions(event.when, `/events/${i}/when`, event.id);
    event.sceneRefs.forEach(ref => link('scenes', ref, `/events/${i}/sceneRefs`, event.id));
    link('content', event.titleRef, `/events/${i}/titleRef`, event.id);
    link('content', event.bodyRef, `/events/${i}/bodyRef`, event.id);
    const ids = new Set();
    event.choices.forEach((choice, n) => {
      if (ids.has(choice.id)) add('DUPLICATE', `/events/${i}/choices/${n}/id`, 'Duplicate choice ID within the event.', 'Use a local ID unique in this event.', event.id);
      ids.add(choice.id);
      const label = link('content', choice.labelRef, `/events/${i}/choices/${n}/labelRef`, event.id);
      if (label && (label.pattern !== 'action-label' || label.domain !== 'interface')) add('PATTERN', `/events/${i}/choices/${n}/labelRef`, 'Choice label must use the interface action-label pattern.', 'Reference an interface action label.', event.id);
      link('actions', choice.actionRef, `/events/${i}/choices/${n}/actionRef`, event.id);
    });
  });
  bundle.outcomes.forEach((outcome, i) => {
    const text = link('content', outcome.textRef, `/outcomes/${i}/textRef`, outcome.id);
    if (text && text.pattern !== 'ending') add('PATTERN', `/outcomes/${i}/textRef`, 'Outcome must reference ending content.', 'Reference the ending pattern.', outcome.id);
  });
  return diagnostics;
}
function assertValid(bundle, policy) {
  const errors = validateBundle(bundle, { policy }).filter(d => d.severity === 'error');
  if (errors.length) throw Object.assign(new Error('Invalid content bundle.'), { diagnostics: errors });
}
export function projectFacts(bundle, state, role, phase) {
  if (!bundle.roles.includes(role) || !bundle.phases.includes(phase)) throw new Error('Unknown role or phase.');
  const values = Object.create(null);
  for (const fact of bundle.facts) {
    if (!fact.audience.includes(role) || !fact.phases.includes(phase) || !own(state, fact.id)) continue;
    if (typeof state[fact.id] !== fact.type || (fact.type === 'number' && !Number.isFinite(state[fact.id]))) throw new Error(`Invalid state value: ${fact.id}.`);
    values[fact.id] = state[fact.id];
  }
  return values;
}
export function renderText(bundle, contentId, { state = {}, role, phase, policy = basePolicy } = {}) {
  assertValid(bundle, policy);
  const content = bundle.content.find(item => item.id === contentId);
  if (!content) throw new Error('Unknown content ID.');
  if (!content.audience.includes(role) || !content.phases.includes(phase)) throw new Error('Content is not visible to this role and phase.');
  const values = projectFacts(bundle, state, role, phase);
  return content.text.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, name) => {
    const b = content.bindings[name];
    if (b.source === 'entity') return bundle.entities.find(e => e.id === b.ref).name;
    if (b.source === 'action-cost') return String(bundle.actions.find(a => a.id === b.ref).cost[b.key]);
    if (!own(values, b.ref)) throw new Error(`Visible fact is unavailable: ${b.ref}.`);
    return String(values[b.ref]);
  });
}
export function guidance(domain, { pattern, policy = basePolicy } = {}) {
  const errors = validatePolicy(policy);
  if (errors.length) throw Object.assign(new Error('Invalid policy.'), { diagnostics: errors });
  if (!['interface', 'narrative'].includes(domain)) throw new Error('Domain must be interface or narrative.');
  if (pattern && !bundleSchema.$defs.content.properties.pattern.enum.includes(pattern)) throw new Error('Unknown content pattern.');
  return {
    schemaVersion: '0.5.0', domain, ...(pattern ? { pattern } : {}),
    principles: policy.principles, guidance: policy.domainGuidance[domain],
    rules: policy.rules.filter(r => r.domains.includes(domain) && (!pattern || !r.patterns || r.patterns.includes(pattern))),
    schema: { $schema: bundleSchema.$schema, ...bundleSchema.$defs.content,
      $defs: { binding: bundleSchema.$defs.binding } }
  };
}
