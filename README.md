# PBBG content schema

Version 0.5.0. Experimental architecture release.

Separate interface language, narrative structure and game definitions in browser
games developed with agents. This package provides JSON Schemas, a small content
policy, neutral examples and Node.js reference tooling. Adopt the schemas in an
existing engine without adopting a particular setting, renderer or game mechanic.

The architecture grew from work on a browser game. It is being published now so
others can inspect, adapt and test it. Portability across game engines has not
been demonstrated. A second game is not a release requirement.

## What is included

| Part | Purpose |
| --- | --- |
| `schemas/bundle.schema.json` | Content entries, scenes, events, choices, facts, actions, effects and outcomes |
| `schemas/policy.schema.json` | Scoped editorial guidance and deterministic writing checks |
| `policies/base.json` | Small, editable policy with separate interface and narrative guidance |
| `examples/station.json` | Original fictional example with no dependency on the source game's setting |
| `src/index.js` | Reference validation, role and phase projection, text rendering and task guidance |
| `bin/pbbg-content.js` | Local validation and machine-readable guidance |
| `docs/architecture.md` | Responsibilities, data flow and limitations |
| `docs/adoption.md` | Incremental integration into an existing game |

The code has no external editorial-tool integration, model API, telemetry or
runtime network calls. Ajv is the JSON Schema validation dependency. Install it
from npm with the commands below. This repository is an architecture package,
not a game engine or an autonomous writing agent.

## Run locally

Use Node.js 20 or later from a checkout:

```sh
npm ci
npm test
node bin/pbbg-content.js check examples/station.json
node bin/pbbg-content.js check examples/station.json --json
node bin/pbbg-content.js guidance interface --pattern action-label
node bin/pbbg-content.js guidance narrative --pattern dialogue
```

`check` returns exit code 0 for a valid bundle, 1 for content errors and 2 for
input errors. Warnings do not fail validation. Add `--policy path/to/policy.json`
to use a complete replacement policy. No npm publication is claimed; these are
checkout commands.

`guidance` returns relevant policy, a text-entry schema and shared principles.
An agent host can include that JSON in its prompt for the current task. This
command does not call a model or automatically inject prompts.

## Separation of concerns

Game definitions own costs, requirements and effects. Narrative entries own story
text and speaker identity. Interface entries own labels and explanations.
Presentation belongs to the host game's components.

Content binds to a declared fact, public entity name or evaluated action cost.
For example, the station preview uses `{turns}` bound to `request.service`'s cost.
Changing the cost updates that rendered value without editing the sentence.

Scenes reference content and actions. Events reference scenes and choices.
Outcomes have stable IDs and reference ending text. No operation depends on
finding a particular word in prose.

```js
import fs from 'node:fs';
import { validateBundle, renderText } from './src/index.js';

const bundle = JSON.parse(fs.readFileSync('examples/station.json', 'utf8'));
console.log(validateBundle(bundle));
console.log(renderText(bundle, 'service.preview', {
  role: 'traveler', phase: 'planning'
}));
```

The reference implementation runs in Node. The schemas and JSON can be consumed
by other languages and browser runtimes. The package does not include a browser
loader, save migration, simulation or renderer integration.

## Content patterns

The 14 patterns are action label, navigation or heading, action preview, blocked
action, arrangement status, report, dialogue, scene, card, action result,
technical error, empty state, tutorial and ending. Each text entry declares one
pattern and either the `interface` or `narrative` domain. Classify individual fields
of an object: a card's story and its usage instructions can be separate entries.

The base policy checks terminal punctuation on interface labels, warns on action
labels longer than six words and rejects HTML in text fields. Six words is an
advisory example budget, not an industry standard. Voice, sentence case with
proper names, useful detail and comprehension require review.

## Validation boundaries

Validation checks shape, duplicate IDs, cross references, bindings, typed effects,
placeholder coverage and declared audience and phase compatibility. The effect
registry is game-defined; it contains no universal list of game mechanics.

`renderText` checks the content's visibility and reads fact bindings only through
`projectFacts`. Render the returned string through `textContent` or the equivalent
safe text component. Treat interpolated values as text, not HTML.

The host owns actual state, rules evaluation and disclosure. Facts passed to the
reference helper must be evaluated values. An audience declaration is not server
security; a downloaded single-player bundle can be inspected. The tooling cannot
detect a hidden fact manually written into prose or prove that an engine's view
code obeys the declarations. Test those boundaries in the host game.

Full coverage of inline strings in an existing UI is migration work. This CLI
checks supplied JSON, not arbitrary JavaScript, HTML or generated screens.

## License and sources

Original package code, schemas, policies and examples are available under the
[MIT license](LICENSE). [Source notes](docs/sources.md) identify the design and
content guidance. Third-party guidance retains its own terms. This repository
does not redistribute game assets, purchased fonts or copied publisher examples.
