# PBBG Content Schema

Version 0.5.0 • Experimental Architecture Release

A standalone content architecture package for separating interface language, narrative structure, and game definitions in browser games developed with agents. It provides JSON Schemas, scoped writing policies, a neutral fictional example, reference projection tooling, and a local linter CLI.

## Background & Origin

This package was extracted from work on *Coalition* (`quarterback/escape-game`), Ron Bronson's turn-based browser game set in his personal Nelosphere world. The architecture was prepared on October 30, 2026, using commit `26aab93` from the source game as an extraction reference.

Working with agents during game development exposed a fundamental content architecture problem:

1. **Domain Conflation:** Unconstrained agents frequently blur diegetic narrative (world descriptions, dialogue) with non-diegetic system copy (buttons, navigation, error logs). This results in bloated, "AI-sounding" interface copy or overly mechanical narrative prose.


2. **Context Reconstruction:** When an agent adds a scene or edits an option, it has to infer state transitions, action costs, and prerequisites from scattered code and prose. Without an explicit schema, agents fill knowledge gaps with plausible-sounding hallucinations.


3. **Safety & Coupling:** Changing character dialogue or scene flavor should never accidentally mutate dice rolls, state transitions, or action costs.

Rather than waiting for a second playable game, the architecture was sanitized and published as a standalone v0.5.0 package under the Eclipse Public License to establish a reusable **Agent Experience (AX)[agentexperience.ax] primitive**.

## Package Structure

| Part | Purpose |
| --- | --- |
| `schemas/bundle.schema.json` | Content entries, scenes, events, choices, facts, actions, effects, and outcomes

 |
| `schemas/policy.schema.json` | Scoped editorial guidance and deterministic writing checks

 |
| `policies/base.json` | Editable base policy with separate interface and narrative guidance

 |
| `examples/station.json` | Original fictional example with no dependency on the source game's setting

 |
| `src/index.js` | Reference validation, role/phase projection, text rendering, and task guidance

 |
| `bin/pbbg-content.js` | Local CLI for validation and machine-readable agent guidance

 |
| `docs/architecture.md` | Data responsibilities, data flow, and architectural limits

 |
| `docs/adoption.md` | Incremental integration guide for existing game engines

 |
| `docs/sources.md` | Attributions for design and plain-language guidance sources

 |

The package uses **Ajv** for JSON Schema validation. It has zero external editorial-tool integrations, model API calls, telemetry, or runtime network calls.

## Separation of Concerns

The schema divides content by four explicit responsibilities:

* **Game Definitions:** Own costs, requirements, conditions, and typed effects. Executing effects belongs to the host game engine.


* **Narrative:** Own story text, scene descriptions, dialogue, and speaker identities.


* **Interface:** Own button labels, navigation headings, status displays, and application errors.


* **Content Policy:** Supplies scoped writing rules (e.g., terminal punctuation, word counts, forbidden phrases) by domain and pattern.


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

## Content Patterns

The schema defines **14 content patterns** across the `interface` and `narrative` domains:

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



Every text entry declares one pattern and a domain. The default policy (`policies/base.json`) enforces domain-specific rules (e.g., checking terminal punctuation on interface labels, flagging action labels over six words, and rejecting raw HTML).

## Local Usage & Commands

Requires **Node.js 20 or later**. Tested on Node 20, 22, and 24.

### 1. Run Checks

```sh
npm ci[cite: 1]
npm test[cite: 1]

# Check a content bundle against schemas and policy
node bin/pbbg-content.js check examples/station.json[cite: 1]

# Output machine-readable JSON for agent tool calls or CI
node bin/pbbg-content.js check examples/station.json --json[cite: 1]

```

`check` returns exit code `0` for valid bundles, `1` for content validation errors, and `2` for input errors.

### 2. Machine-Readable Agent Guidance

An agent host can run `guidance` to retrieve pattern-specific policy, text-entry schemas, and shared principles to inject directly into an LLM prompt before an editing task:

```sh
node bin/pbbg-content.js guidance interface --pattern action-label[cite: 1]
node bin/pbbg-content.js guidance narrative --pattern dialogue[cite: 1]

```

### 3. Programmatic Usage in Node.js

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

## Validation Boundaries & Adoption Limits

* **Source Game Status:** *Coalition* served as the extraction source, but the game itself has not yet migrated its inline content to this CLI.


* **Host Engine Responsibilities:** The host engine retains actual simulation state, clock scheduling, and disclosure controls. Fact bindings passed to `renderText` must be pre-evaluated values.


* **Exclusions:** The package does not include a browser loader, save state migrator, general simulation engine, or automatic string extraction tool.


* **Security Note:** Audience declarations in JSON bundles are not server security. Secret game state should be managed by a trusted server.


## License & Attribution

Original package code, schemas, policies, and examples are released under the **Eclipse Public License 2.0 (EPL-2.0)**. See [Source Notes](https://www.google.com/search?q=docs/sources.md) for design and content guidance attribution.
