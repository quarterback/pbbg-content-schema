# PBBG Content Schema

Version 0.5.0 • Experimental Architecture Release

A standalone content architecture package for separating interface language, narrative structure, and game definitions in browser games developed with agents. It provides JSON Schemas, scoped writing policies, a neutral fictional example, reference projection tooling, and a local linter CLI.

---

## Background & Origin

This package was extracted from work on *Coalition* (`quarterback/escape-game`), Ron Bronson's turn-based browser game set in the Nelosphere world. The architecture was prepared on October 30, 2026, using commit `26aab93` from the source game as an extraction reference.

Working with agents during game development exposed a fundamental content architecture problem:

1. **Domain conflation:** Unconstrained agents frequently blur diegetic narrative (world descriptions, dialogue) with non-diegetic system copy (buttons, navigation, error logs). This results in bloated, "AI-sounding" interface copy or overly mechanical narrative prose.
2. **Context reconstruction:** When an agent adds a scene or edits an option, it has to infer state transitions, action costs, and prerequisites from scattered code and prose. Without an explicit schema, agents fill knowledge gaps with plausible-sounding hallucinations.
3. **Safety & coupling:** Changing character dialogue or scene flavor should never accidentally mutate dice rolls, state transitions, or action costs.

Rather than waiting for a second playable game, the architecture was sanitized and published as a standalone v0.5.0 package under the Eclipse Public License to establish a reusable Agent Experience (AX) primitive. The package is intentionally independent of game fiction, particular mechanics, and external editorial systems.

---

## Package Structure

| Part | Purpose |
| :--- | :--- |
| `schemas/bundle.schema.json` | Content entries, scenes, events, choices, facts, actions, effects, and outcomes |
| `schemas/policy.schema.json` | Scoped editorial guidance and deterministic writing checks |
| `policies/base.json` | Editable base policy with separate interface and narrative guidance |
| `examples/station.json` | Original fictional example with no dependency on the source game's setting |
| `src/index.js` | Reference validation, role/phase projection, text rendering, and task guidance |
| `bin/pbbg-content.js` | Local CLI for validation and machine-readable agent guidance |
| `docs/architecture.md` | Data responsibilities, data flow, and architectural limits |
| `docs/adoption.md` | Incremental integration guide for existing game engines |
| `docs/sources.md` | Attributions for design and plain-language guidance sources |

The package uses Ajv for JSON Schema validation. It has zero external editorial-tool integrations, model API calls, telemetry, or runtime network calls.

---

## Separation of Concerns

The schema divides content by four explicit responsibilities:

* **Game definitions:** Own costs, requirements, conditions, and typed effects. Executing effects belongs to the host game engine.
* **Narrative:** Own story text, scene descriptions, dialogue, and speaker identities.
* **Interface:** Own button labels, navigation headings, status displays, and application errors.
* **Content policy:** Supplies scoped writing rules, such as terminal punctuation, word counts, and forbidden phrases, by domain and pattern.

Dynamic values bind to declared facts, public entity names, or evaluated action costs. For instance, a sentence template can bind `{turns}` to an action cost key. Updating the underlying cost in game definitions updates the rendered text without editing prose.

```text
  ┌─────────────────────────────────────────────────────────┐
  │                   Scene / Interaction                   │
  └────────────────────────────┬────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  Narrative   │        │  Interface   │        │  Game Defs   │
│  (Story/Voice)│       │ (Labels/UI)  │        │ (Costs/State)│
└──────┬───────┘        └──────┬───────┘        └──────┬───────┘
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               ▼
                ┌──────────────────────────────┐
                │        Content Policy        │
                │ (Validation Rules & Guidance)│
                └──────────────────────────────┘
```

---

## Data Responsibilities

A bundle declares its exact schema version, roles, phases, public entities, facts, effect types, actions, content, scenes, events, and outcomes. IDs are unique within each collection. Choice IDs are local to their event. Version 0.5.0 rejects unknown fields and versions so misspellings do not silently become ignored data.

A fact has a scalar type and explicit audience and phase lists. An action declares costs, requirements, and effects. An effect has a registered type, an optional target, and a typed value. Its execution belongs to the host engine. Registering an effect does not implement its behavior. The registry permits different games to define effects without inheriting one game's mechanics.

Conditions support equality, numeric comparison, and string containment against a declared fact. The reference validator checks their shape and type. The host must evaluate the conditions; it also decides time units, event selection, and scheduling. `after` has meaning in the host's own clock. No code is executed from content.

Text entries declare their domain, pattern, audience, phases, and optional speaker. Bindings use stable IDs rather than arbitrary object paths. Named placeholders must match bindings exactly. Curly braces are reserved for placeholders in 0.5.0. Public entity bindings resolve names; fact bindings resolve permitted state; action-cost bindings resolve a declared cost key.

Scenes declare entry conditions, possible successors, and references to content and actions. Events add scene eligibility, optional time and state conditions, and choices. Endings reference outcome IDs. These fields make narrative relationships explicit without prescribing a linear plot, a border crossing, a resource system, or a particular turn structure.

---

## Authoring and Runtime Flow

1. The author or agent edits classified records.
2. JSON Schema validates types and required fields.
3. Reference and policy checks produce diagnostics.
4. The game adapter evaluates state, actions, and eligibility.
5. A role and phase view supplies allowed facts to text rendering.
6. The game's semantic components display text and mechanical information.

Schema validation is independent of prose policy. Policy selection uses shared principles, domain guidance, and pattern-scoped checks. A project replaces the base policy as a whole with `--policy`; implicit file merging and policy inheritance are not implemented. Keep policy changes reviewable separately from content changes.

`guidance` exposes the same rules used by the checker, plus qualitative guidance for the agent. It works without a model, MCP server, or prompt framework.

---

## Content Patterns

The schema defines 14 content patterns across the `interface` and `narrative` domains:

1. Action label
2. Navigation or heading
3. Action preview
4. Blocked action
5. Arrangement status
6. Report
7. Dialogue
8. Scene
9. Card
10. Action result
11. Technical error
12. Empty state
13. Tutorial
14. Ending

Every text entry declares one pattern and a domain. The default policy (`policies/base.json`) enforces domain-specific rules, such as checking terminal punctuation on interface labels, flagging action labels over six words, and rejecting raw HTML.

---

## Checks and Diagnostics

The CLI reports `ruleId`, severity, a JSON pointer, optional content ID, a message, and a repair hint. Structural and reference findings fail checks. Policy rules can be warnings or errors. Unknown references never receive a guessed replacement.

| Rule group | Checks |
| --- | --- |
| `SCHEMA`, `POLICY` | Required fields, types, versions, and supported policy configuration |
| `DUPLICATE`, `REFERENCE` | IDs and references across scenes, events, and definitions |
| `CONDITION`, `EFFECT` | Condition types and declared effect value and target types |
| `BINDING`, `TEMPLATE` | Placeholder coverage, named bindings, and cost keys |
| `AUDIENCE`, `PHASE`, `VISIBILITY` | Declared roles, phases, and permitted fact bindings |
| `SPEAKER`, `PATTERN` | Dialogue speakers and the use of action labels and endings |
| `TEXT-01` through `TEXT-03` | Base policy checks; see `policies/base.json` |

A project can add literal forbidden-phrase rules through policy. Matches are case-insensitive substrings, scoped by domain and optional pattern. They are mechanical diagnostics, not evidence of authorship or semantic quality. Word counts split on whitespace. These choices are intentionally documented rather than presented as language analysis.

---

## Validation Boundaries & Adoption Limits

* **Source game status:** *Coalition* served as the extraction source, but the game itself has not yet migrated its inline content to this CLI.
* **Host engine responsibilities:** The host engine retains actual simulation state, clock scheduling, and disclosure controls. Fact bindings passed to `renderText` must be pre-evaluated values.
* **Exclusions:** The package does not include a browser loader, save state migrator, general simulation engine, or automatic string extraction tool.
* **Security note:** Audience declarations in JSON bundles are not server security. Secret game state should be managed by a trusted server.
* **Limits of v0.5:** There is no general simulation, arbitrary expression language, package override loader, automatic string extraction, save migration, or browser integration.
* **No semantic guarantee:** There is no semantic check for spoilers manually written into text, contradictory story claims, unreachable scenes, or falsely declared public information.

Use the package's stable structures while reviewing these limits as the format changes. Content and package versions currently match at 0.5.0. A later format change must include a migration note instead of silently reinterpreting data.

---

## Local Usage & Commands

Requires **Node.js 20 or later**. Tested on Node 20, 22, and 24.

### 1. Run checks

```sh
npm ci
npm test

# Check a content bundle against schemas and policy
node bin/pbbg-content.js check examples/station.json

# Output machine-readable JSON for agent tool calls or CI
node bin/pbbg-content.js check examples/station.json --json
```

`check` returns exit code `0` for valid bundles, `1` for content validation errors, and `2` for input errors.

### 2. Machine-readable agent guidance

An agent host can run `guidance` to retrieve pattern-specific policy, text-entry schemas, and shared principles to inject directly into an LLM prompt before an editing task:

```sh
node bin/pbbg-content.js guidance interface --pattern action-label
node bin/pbbg-content.js guidance narrative --pattern dialogue
```

### 3. Programmatic usage in Node.js

```js
import fs from 'node:fs';
import { validateBundle, renderText } from './src/index.js';

const bundle = JSON.parse(fs.readFileSync('examples/station.json', 'utf8'));

// Validate bundle structure, references, and policy rules
const diagnostics = validateBundle(bundle);
console.log(diagnostics);

// Safely render text with fact projection and role/phase filtering
const text = renderText(bundle, 'service.preview', {
  role: 'traveler',
  phase: 'planning'
});
console.log(text);
```

---

## License & Attribution

Original package code, schemas, policies, and examples are released under the **Eclipse Public License 2.0 (EPL-2.0)**. See [Source Notes](docs/sources.md) for design and content guidance attributions, and explore [agentexperience.ax](https://agentexperience.ax) for surrounding Agent Experience concepts.
