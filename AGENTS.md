# Instructions for agents

This is a standalone content architecture package for browser games. Preserve the
separation between interface text, narrative, game definitions and presentation.
Read README.md and docs/architecture.md before changing schemas or tooling.

The owner selected Eclipse Public License 2.0 (EPL-2.0). Keep LICENSE and package
metadata consistent with that decision. Third-party dependencies retain their
own licenses. Earlier records of an MIT default do not override this choice.

Keep the core independent of game fiction, particular mechanics and external
editorial systems. Do not add cross-product integrations without owner direction.
The owner chose to publish this architecture now. Do not impose a second-game
requirement or rewrite the release as a product announcement.

Do not copy game assets, fonts or narrative into examples. Use original, neutral
examples. Effect types belong to adopting games; do not encode one game's
mechanics as universal types. The engine owns rule execution.

Update schemas, docs, diagnostics and tests together. Do not weaken checks to
accept an invalid fixture. Separate mechanical validation from editorial judgment.
Never claim complete string coverage or role security from schema checks alone.

Use familiar words, active voice, sentence case and American spelling. Avoid em
dashes, staged claims, invented terminology and formulaic contrasts. Preserve
useful detail and character voice in adopter policies.

Run npm test, npm run check and npm pack --dry-run. No model API calls or telemetry.
