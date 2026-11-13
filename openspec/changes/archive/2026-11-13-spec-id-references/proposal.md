# Proposal

## Why

Some projects give every requirement and scenario a permanent identifier and cite them across specs (`[BMB-003]`, `[ACCESS-001.02]`). In spek those citations are inert text. A reader must search for the target to learn what a citation means, and the citations that already are links (`[INGEST-005](../artifact-ingestion/spec.md)`) are relative file paths that do not resolve in the app.

## What Changes

1. A requirement or scenario heading that begins with an identifier — bare (`BMB-001 Title`) or bracketed (`[ACCESS-001] Title`) — declares that identifier. No configuration; a repository without such headings sees no change.
2. In spec text, a citation whose label is exactly a declared identifier (`[ID]` or `[ID](…)`) becomes an in-app link to that requirement or scenario.
3. Hovering or focusing a resolved citation shows the target's text: the requirement's statement, or the scenario's WHEN/THEN lines.
4. A citation to a retired identifier is not a link. Its hover says it is retired, gives the reason, and links the replacement when one exists and resolves. Two recording conventions are read: the `retired:` list in `openspec/spec-ids.yaml`, and a `## Relocated and Retired IDs` table in a main spec.
5. A citation resolves against the main specs; when a change is being viewed, that change's delta specs resolve too and take precedence, because a new change's identifiers are not yet in main.
6. A token that is not a declared or retired identifier stays plain text, so ordinary bracketed text is never linked.
7. Web app only. The other hosts have no index and behave as today.

## Capabilities

### New Capabilities
- `spec-id-references`: declaring, resolving, linking and previewing spec identifiers, including retired ones.

### Modified Capabilities
- `openspec-api`: a spec-identifier index endpoint.
- `api-adapter`: an optional adapter method for the index; hosts without it show no links.

## Impact

- `@spekjs/core`: a new browser-safe subpath `@spekjs/core/spec-ids` (declaration and retired-table parsing, citation matching) and a Node-side index builder. Additive, so a minor bump for the core package line; recorded here for whoever cuts the release.
- `@spekjs/web`: `GET /api/openspec/spec-ids`, `FetchAdapter.getSpecIds`, an index context, a citation component and its hover in `MarkdownRenderer` under `specShaped`.
- Reads `openspec/spec-ids.yaml`, a fixed path under `openspec/`. No path comes from a request.
- No new colour tokens: the link and hover reuse existing ones.
- Follow-up, not here: VS Code and demo adapters, and a Kotlin mirror (`SpecIds.kt`) for IntelliJ. Until then those hosts degrade to today's behaviour.
- Out of scope: identifiers in proposal, design or tasks; searching by identifier; validating the projects' identifier rules, which their own gates do.
