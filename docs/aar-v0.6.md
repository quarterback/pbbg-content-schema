# Agent Action Record for v0.6

Date: October 30, 2026  
Agent: Claude  
Accountable human: Ron Bronson  
Status: Committed and pushed to main

## 1. Intent

The owner asked for an agent skill and an MCP addition so agents can use the
package directly. This is the owner direction that AGENTS.md requires before
adding an integration.

## 2. Action

Added `skills/pbbg-content-schema/SKILL.md`, a local MCP server in `src/mcp.js`,
two CLI commands (`pbbg-content mcp` and `pbbg-content install-skill [DIR]`), a
repository `.mcp.json`, 13 tests in `test/mcp.test.js`, and documentation in
README.md, docs/architecture.md, AGENTS.md and CHANGELOG.md. Bumped the package
to 0.6.0 and exported the server as `pbbg-content-schema/mcp`. The content
format, schemas, policy and checks in `src/index.js` were not changed.

## 3. Judgment

- The server speaks the protocol directly over newline-delimited JSON on stdio
  instead of depending on the official SDK. The SDK would have added a large
  dependency tree to a package whose only dependency is Ajv.
- All five tools are read only and call the existing functions in
  `src/index.js`. The server adds no rules, so the CLI, library and tools
  cannot disagree.
- Tools accept a bundle or policy either inline or as a file path, resolved
  from the directory the agent host starts the server in.
- The package keeps a single bin so `npx -y github:quarterback/pbbg-content-schema
  mcp` resolves without naming the bin. A second `pbbg-content-mcp` bin was
  drafted and removed for that reason.
- The package version moved to 0.6.0 while bundles still declare
  `schemaVersion` 0.5.0. The README sentence saying the two versions match was
  rewritten to say this.
- The skill was written to the Agent Skills format (name and description
  frontmatter) so Claude Code loads it, and AGENTS.md points other agents to it.

## 4. Deviation

The package is not published on npm, so the setup instructions install from
GitHub. When it is published, `npx -y pbbg-content-schema mcp` will also work.
Resource subscriptions, prompts and batched JSON-RPC requests are not
implemented; the server answers empty prompt lists and rejects batches.

## 5. Consequence

An agent connected to the server can pull guidance before writing, check a
bundle after each edit and confirm rendered text, using the same rules as CI.
A passing check through the server means the same thing as a passing CLI
check and nothing more: it does not prove text quality, full string coverage
or server secrecy. The skill states these limits for agents.

## 6. Verification and follow-up

`npm test` passed 49 of 49 tests (36 existing, 13 new) on Node 22. `npm run
check` passed and `npm pack --dry-run` lists the skill and server. A client built
on the official `@modelcontextprotocol/sdk`, installed outside the repository,
connected over stdio, listed tools and resources, called `check_bundle` and
`get_guidance`, and read the skill resource. The packed tarball ran
`install-skill` and `mcp` through npx. No game repository has connected the
server yet.
