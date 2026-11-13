# Tasks

## 1. Core rule

- [x] 1.1 Add `packages/core/src/spec-ids.ts` and export it at `@spekjs/core/spec-ids` (package `exports`): the identifier pattern, `parseDeclarations(content)` for bare and bracketed headings (requirement body or scenario WHEN/THEN as `text`, heading `slug`), `parseRetiredTable(content)`, `findCitations(text)`, and the index types. Verify with `spec-ids.test.ts` covering bare and bracketed headings, `PCLAIM-001`, `INGEST-017.07`, `TODO-1` rejected, scenario text, the table form, and an identifier inside a code fence not being declared.
- [x] 1.2 Add the Node builder `buildSpecIdIndex(basePath, changeSlug?)`: walk main specs via `discoverSpecFiles`, merge a change's deltas with precedence, read `openspec/spec-ids.yaml`'s `retired:` with `yaml`, merge both retired sources, and drop a retired record for a declared identifier. Verify with a fixture-based test: both conventions, delta precedence, malformed YAML yielding no records and no throw, an empty repository yielding an empty index.
- [x] 1.3 Measure the index build on both reference repositories (`cairn-proofs`, `oscal-bindings-specs`) and decide on caching. Verified: under 10 ms each, every identifier anchored; no cache, per the design.

## 2. Web API and adapter

- [x] 2.1 Add `GET /api/openspec/spec-ids` (`dir`, optional `at`, validated by `isSafeChangeSlug`). Verify with a route test: populated, empty, unsafe `at` refused, missing `dir` handled like other routes.
- [x] 2.2 Add optional `getSpecIds(changeSlug?)` to `ApiAdapter` and implement it in `FetchAdapter`. Verify with a test that `FetchAdapter` builds the URL with `dir` and `at`, and that `MessageAdapter` and `StaticAdapter` still type-check without it.

## 3. Rendering

- [x] 3.1 Add a `SpecIdIndexContext` and a provider that fetches the index for the current repo (and change slug on a change page), yielding an empty index when the adapter lacks the method or the fetch fails. Verify with a test of both degrade paths.
- [x] 3.2 In `MarkdownRenderer`, under `specShaped`, turn `[ID]` text runs and `a` elements labelled with an identifier into links, skipping headings and code. Resolved links go to `specRoute(topic)` with the heading slug (`<topic>--<slug>` for a delta target on the Specs tab). Verify with renderer tests: bare citation, existing relative link rewritten, unknown label untouched, heading and code untouched, and a non-`specShaped` render never linking.
- [x] 3.3 Add the preview popover, with the target's text rendered as Markdown by a nested `MarkdownRenderer` mounted only while open and not `specShaped`: shown on hover and focus, hidden on blur, leave and Escape, `aria-describedby`, no focus capture, capped height. Retired citations render as a focusable non-link with reason and a replacement link when it resolves. Verify with markup tests (attributes, hidden by default and nothing rendered until opened, a list or code span in the target rendered as markup, a nested citation left as text, retired has no `href`) and by hovering and tabbing in a real browser against `oscal-bindings-specs` and `cairn-proofs`.
- [x] 3.4 Confirm no colour token is added and `contrast.test.ts` passes; if a new class trips its scan, fix the class rather than the test. Verify with `npm test -w @spekjs/web`.

## 4. Integration

- [x] 4.1 Run `npm run build:core`, then `npm run type-check`, `npm run lint` and `npm test`; verify all pass. Verify spek's own repo, which has no identifiers, renders spec pages unchanged.
- [x] 4.2 Check a change's Specs tab in a real browser against a repository with identifiers: a citation introduced by a delta resolves to the delta, and the VS Code webview build (`npm run build:webview -w @spekjs/web`) still succeeds with the adapter lacking the method.

## Workflow follow-up

- `/opsx:verify`, then `/opsx:archive`. On archive, update `CLAUDE.md` (the `spec-ids` subpath, the web-only state and the two retirement sources) and `docs/prd.md`.
- Follow-up change: VS Code and demo adapters, then a Kotlin mirror for IntelliJ.
- Release time, not here: a minor bump of `@spekjs/core` (new subpath), CHANGELOG entries, READMEs, `docs/demo.html`.
