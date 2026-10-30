# Sources and extraction notes

Reviewed October 30, 2026.

The architecture was developed from content-pattern work in
[Coalition](https://github.com/quarterback/escape-game), including the published
specification and implementation at commit
[26aab93](https://github.com/quarterback/escape-game/commit/26aab93c5ddade126653d450a320bd7958a8b92d).
The source game demonstrates event definitions, effect-derived markers, role
views and coded outcomes. This package does not claim that the game has migrated
to these schemas or that the new validator has checked all its strings.

The package implementation and station example are original. Game names, plot,
locations, dialogue, balance, sprites, audio and purchased fonts were excluded.
No excluded or archived source material was read or reused.

| Guidance | Application here |
| --- | --- |
| [Atlassian button guidance](https://atlassian.design/components/button/usage) | Scoped rules for labels and visible explanations |
| [Atlassian message guidance](https://atlassian.design/foundations/content/designing-messages) | Separate expected outcomes, statuses and technical errors |
| [GitLab Pajamas UI text](https://design.gitlab.com/content/ui-text/) | Consistent terminology and component-specific guidance |
| [Mailchimp structured content](https://styleguide.mailchimp.com/creating-structured-content/) | Content types derived from purpose and reusable parts |
| [Microsoft Fluent content design](https://fluent2.microsoft.design/content-design) | Task context and direct interface explanations |
| [Digital.gov plain language](https://digital.gov/guides/plain-language) | Audience, clear responsibilities and comprehension testing |
| [Humanizer](https://github.com/blader/humanizer) | Editorial review of repetition and inflated language |
| [Atlassian structured content](https://www.atlassian.com/blog/ai-at-work/teaching-ai-to-speak-our-design-language) | Machine-readable design guidance feeding agent tools |
| [JSON Schema](https://json-schema.org/) and [Ajv](https://ajv.js.org/) | Schema format and reference validation |

These sources retain their own licenses and authority. Original summaries and
examples are used here. The package does not copy vendor schemas, brand voice or
assets, claim official compliance, or claim to be the first such architecture.
