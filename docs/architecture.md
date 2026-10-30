# Architecture

## Data responsibilities

A bundle declares its exact schema version, roles, phases, public entities,
facts, effect types, actions, content, scenes, events and outcomes. IDs are unique
within each collection. Choice IDs are local to their event. Version 0.5.0 rejects
unknown fields and versions so misspellings do not silently become ignored data.

A fact has a scalar type and explicit audience and phase lists. An action declares
costs, requirements and effects. An effect has a registered type, an optional
target and a typed value. Its execution belongs to the host engine. Registering
an effect does not implement its behavior. The registry permits different games
to define effects without inheriting one game's mechanics.

Conditions support equality, numeric comparison and string containment against a
declared fact. The reference validator checks their shape and type. The host must
evaluate the conditions; it also decides time units, event selection and scheduling.
`after` has meaning in the host's own clock. No code is executed from content.

Text entries declare their domain, pattern, audience, phases and optional speaker.
Bindings use stable IDs rather than arbitrary object paths. Named placeholders
must match bindings exactly. Curly braces are reserved for placeholders in 0.5.0.
Public entity bindings resolve names; fact bindings resolve permitted state;
action-cost bindings resolve a declared cost key.

Scenes declare entry conditions, possible successors and references to content
and actions. Events add scene eligibility, optional time and state conditions,
and choices. Endings reference outcome IDs. These fields make narrative
relationships explicit without prescribing a linear plot, a border crossing,
a resource system or a particular turn structure.

## Authoring and runtime flow

1. The author or agent edits classified records.
2. JSON Schema validates types and required fields.
3. Reference and policy checks produce diagnostics.
4. The game adapter evaluates state, actions and eligibility.
5. A role and phase view supplies allowed facts to text rendering.
6. The game's semantic components display text and mechanical information.

Schema validation is independent of prose policy. Policy selection uses shared
principles, domain guidance and pattern-scoped checks. A project replaces the
base policy as a whole with `--policy`; implicit file merging and policy
inheritance are not implemented. Keep policy changes reviewable separately from
content changes.

`guidance` exposes the same rules used by the checker, plus qualitative guidance
for the agent. It works without a model, MCP server or prompt framework.

## Checks and diagnostics

The CLI reports `ruleId`, severity, a JSON pointer, optional content ID, a message
and a repair hint. Structural and reference findings fail checks. Policy rules
can be warnings or errors. Unknown references never receive a guessed replacement.

| Rule group | Checks |
| --- | --- |
| `SCHEMA`, `POLICY` | Required fields, types, versions and supported policy configuration |
| `DUPLICATE`, `REFERENCE` | IDs and references across scenes, events and definitions |
| `CONDITION`, `EFFECT` | Condition types and declared effect value and target types |
| `BINDING`, `TEMPLATE` | Placeholder coverage, named bindings and cost keys |
| `AUDIENCE`, `PHASE`, `VISIBILITY` | Declared roles, phases and permitted fact bindings |
| `SPEAKER`, `PATTERN` | Dialogue speakers and the use of action labels and endings |
| `TEXT-01` through `TEXT-03` | Base policy checks; see `policies/base.json` |

A project can add literal forbidden-phrase rules through policy. Matches are
case-insensitive substrings, scoped by domain and optional pattern. They are
mechanical diagnostics, not evidence of authorship or semantic quality. Word
counts split on whitespace. These choices are intentionally documented rather
than presented as language analysis.

## Limits of v0.5

No host game has migrated to this package yet. The station example is an
architecture fixture, not a second game or proof of broad portability. The tests
exercise the reference helpers, validation and CLI; they do not establish
unchanged gameplay in the source project.

There is no general simulation, arbitrary expression language, package override
loader, automatic string extraction, save migration or browser integration.
There is no semantic check for spoilers manually written into text, contradictory
story claims, unreachable scenes, or falsely declared public information.

The helper projects direct fact bindings. A host still needs executable tests of
its role views, especially around clocks, pending work and the debrief. Keep
hidden-information tests distinct from editorial review. Serve sensitive shared
world state through a trusted server; downloading schemas cannot protect secrets.

Use the package's stable structures while reviewing these limits as the format
changes. Content and package versions currently match at 0.5.0. A later format
change must include a migration note instead of silently reinterpreting data.
