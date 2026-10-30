---
name: pbbg-content-schema
description: Use when adding, editing or reviewing text, scenes, events, choices, actions or policies in a browser game that keeps its content in a PBBG Content Schema bundle (JSON with schemaVersion, roles, phases, facts, content, scenes, events). Keeps interface copy, narrative and game definitions separate and checks every change.
---

# PBBG Content Schema

A content bundle splits a browser game's text into three kinds of record, plus
a policy that governs the writing:

- **Game definitions** hold costs, requirements, conditions and typed effects.
  The host game engine runs the effects. The bundle only declares them.
- **Narrative** holds story text, scene descriptions, dialogue and speakers.
- **Interface** holds button labels, headings, status displays and errors.
- **Policy** holds the writing rules and guidance for each domain and pattern.

Your job when you touch a bundle is to keep those four apart, write text that
fits its declared pattern, and leave the bundle passing `check`.

## Tools

Use the MCP tools when the `pbbg-content-schema` server is connected. Otherwise
use the CLI from the project root. Both run the same code.

| Task | MCP tool | CLI |
| --- | --- | --- |
| Rules and schema for a pattern | `get_guidance` | `pbbg-content guidance DOMAIN --pattern NAME [--policy FILE]` |
| Validate a bundle | `check_bundle` | `pbbg-content check BUNDLE --json [--policy FILE]` |
| Confirm a rendered sentence | `render_text` | Use `renderText` from the package in Node |
| See what a role may know | `project_facts` | Use `projectFacts` from the package in Node |
| Schemas, base policy, pattern list | `get_schema` | Read `schemas/` and `policies/base.json` |

If the project has its own policy file, pass it every time (`policyPath` or
`--policy`). A project policy replaces the base policy as a whole.

## Workflow

1. **Classify before writing.** Decide the domain (`interface` or `narrative`)
   and one of the 14 patterns for each piece of text: `action-label`,
   `navigation-heading`, `action-preview`, `blocked-action`,
   `arrangement-status`, `report`, `dialogue`, `scene`, `card`,
   `action-result`, `technical-error`, `empty-state`, `tutorial`, `ending`.
2. **Get guidance for that pattern.** Call `get_guidance` with the domain and
   pattern. Follow the returned principles, guidance and rules while drafting.
   Do not apply label rules to dialogue or narrative rules to buttons.
3. **Edit the records.** Give each new record a stable ID unique within its
   collection. Choice IDs only need to be unique within their event.
4. **Bind values instead of typing them.** A number that comes from an action
   cost goes in as `{name}` with an `action-cost` binding to that action and
   cost key. A fact goes in with a `fact` binding. A character or place name
   goes in with an `entity` binding. Every placeholder needs exactly one
   binding, and every binding must be used. Curly braces are reserved for
   placeholders.
5. **Check.** Call `check_bundle`. Fix every `error`. Read each `warning` and
   either revise the text or leave it with a reason the owner can review.
6. **Render to confirm.** For text with bindings, call `render_text` with a
   role, phase and sample state to see the sentence a player would see.

## Rules that catch agents most often

- `VISIBILITY`: text bound a fact its audience or phase may not see. Narrow
  the content's `audience` or `phases`, or bind a public fact. Never widen a
  fact's audience just to make text pass.
- `PATTERN`: event choices must point at `interface` `action-label` entries,
  and outcomes must point at `ending` entries.
- `SPEAKER`: dialogue needs a `speakerRef` to a declared entity.
- `BINDING` and `TEMPLATE`: placeholder and binding names must match, and
  action-cost bindings need a `key` declared in that action's `cost`.
- `REFERENCE`: an ID does not exist. Declare it or fix the reference. The
  checker never guesses a replacement, so do not guess one either.
- `SCHEMA`: unknown fields and versions are rejected. Check spelling against
  the schema rather than adding fields.
- `TEXT-01` to `TEXT-03` in the base policy: no closing punctuation on labels
  and headings, action labels over six words get a warning, and no HTML in
  any text.

## Boundaries

- Do not edit the policy to make content pass. Policy changes are a separate,
  reviewable change for the owner.
- Do not weaken a check, delete a failing record or change a fixture to hide
  an error.
- Do not invent effect types that encode one game's mechanics as universal.
  Effect types belong to the adopting game. Registering an effect does not
  implement it; the engine does.
- Do not change costs, conditions or effects while editing wording. A wording
  change must leave state changes and outcomes the same.
- A passing check shows structure and declared visibility only. It does not
  prove the text is good, that every UI string is in the bundle, that no
  spoiler was typed into prose by hand, or that hidden state is secure. Say so
  when you report results.
- Audience declarations are not server security. Secret state belongs on a
  trusted server.

## Reporting

When you finish, report what records you added or changed by ID, the final
`check_bundle` result, and any warnings you left in place with the reason.
