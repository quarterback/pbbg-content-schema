# Changelog

## 0.6.0

Adds agent access. The content format is unchanged and bundles still declare
schemaVersion 0.5.0.

- Agent skill at skills/pbbg-content-schema/SKILL.md with the editing workflow,
  tool map, common diagnostics and boundaries.
- Local MCP server over stdio (`pbbg-content mcp`, `src/mcp.js`) with read-only
  tools check_bundle, get_guidance, render_text, project_facts and get_schema,
  plus resources for the skill, schemas, base policy, example and docs. It is
  written against the protocol directly and adds no dependencies.
- `pbbg-content install-skill [DIR]` copies the skill into a project, defaulting
  to .claude/skills.
- A repository .mcp.json for agents working on the package itself.

## 0.5.0

Initial experimental architecture release. Includes bundle and policy JSON
Schemas, pattern-scoped guidance, reference validation and text projection,
a CLI, original examples and adoption notes. No external editorial-tool
integration or source-game runtime migration. See docs/architecture.md for limits.

The owner selected EPL-2.0 for this release. LICENSE and package metadata use
Eclipse Public License 2.0; the initial MIT default is superseded.
