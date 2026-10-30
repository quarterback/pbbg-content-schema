# Adopt the architecture in an existing game

## Begin with a bounded set of content

Inventory events, dialogue choices and status displays in active game files.
Assign stable IDs and classify text fields individually. Keep a coverage record
of classified, exempt technical and unmigrated strings. Do not claim full coverage
while the interface still creates player-facing text outside the catalog.

Map the existing data into the bundle schema. Leave effects in the engine while
a small adapter produces the declared action costs and public fact values.
Represent promises and completed work as distinct facts or values. Preserve
existing outcomes as IDs rather than deriving them from text.

Replace simple string-producing functions with named placeholders. Replace
simple eligibility functions with declarative conditions. Retain complex engine
behavior in the adapter; the schema has no function or eval escape hatch.

## Apply policy and agent guidance

Copy `policies/base.json` into the project and edit it for the project's content
standards. Review terminology, voice and component behavior by pattern. Do not
apply a label's punctuation or word budget to dialogue.

Run `pbbg-content guidance interface --pattern action-label --policy POLICY` for
interface work, or select narrative and the appropriate pattern for story work.
The agent host consumes the returned JSON. No prompt framework is required.

## Verify the migration

- Capture the same seed and action sequence before and after changing content.
  Compare state changes, random draws and outcome IDs, excluding text payloads.
- Compare old and new markers for both ordinary and failed choices. A wording
  change must not alter the values being displayed or the effects being applied.
- Test role views with two states that differ only in hidden information.
  Before disclosure, permitted outputs must stay the same. Compare structured
  reports as well as rendered sentences.
- Change an action cost and check that the preview changes without editing prose.
- Test phone and desktop layouts, semantic headings, focus, wrapping and visible
  explanations for unavailable actions.

Run JSON checks before the game build and require those checks in CI. Integrate
new patterns gradually. These steps are adoption guidance, not work already done
in the source game.

## Extend without encoding one game's assumptions

Add game-owned effect types and adapters. Keep generic text types and references
independent of particular locations, political roles, resources or win conditions.
Additional mechanics do not require changing shared prose rules.

Publishing the architecture does not depend on a second game. Further adopters
can report where the format needs to change. Document incompatible changes,
include an original minimal example and bump the schema version.
