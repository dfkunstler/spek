# Tasks

## 1. Core: the relation rule

- [x] 1.1 Add `GraphEdge.kind?: "references" | "changed-together"` and `weight?: number` in `packages/core/src/types.ts`
- [x] 1.2 Add `packages/core/src/spec-relations.ts` (browser-safe): `deriveSpecRelations`, the boundary-aware matcher (one alternation, longest topic first), co-change pair counting over change-node ids, `compareCodeUnits` ordering
- [x] 1.3 Add `visibleRelations(relations, { references, changedTogether, minWeight })` returning `GraphData` plus the omitted-spec count
- [x] 1.4 Export the module at the `@spekjs/core/spec-relations` subpath (`package.json` `exports`, mirroring `search`) and confirm it imports no Node built-in
- [x] 1.5 Unit tests, one per spec scenario: reference direction, self-mention, prefix non-match, punctuation, nested full-path-only, parent-not-in-child, weight counting, three-spec pairs, no-relations, input-order independence, aggregated change counted once
- [x] 1.6 Add a test over this repo's own `openspec/` asserting the derivation runs and is non-empty (pins the 32 / 288 shape loosely, not exactly)

## 2. UI package: draw the edge kinds

- [x] 2.1 `SpecGraph`: branch on `edge.kind`; untyped edges keep today's code path untouched
- [x] 2.2 Solid arcs with an SVG `<marker>` arrowhead (same contract token as the line), curving opposite ways for A→B / B→A, ending at the target's radius
- [x] 2.3 Dashed straight lines with width scaled by weight and capped
- [x] 2.4 Spec nodes without `historyCount` draw at the minimum radius; legend omits change entries when there are no change nodes, and adds an edge-kind sample per kind present
- [x] 2.5 Keep the hover dimming applied to the new edges and to the arrowheads
- [x] 2.6 ui tests: untyped graph renders as before, each kind's attributes, no colour literal introduced, spec-only legend

## 3. Web: the Specs mode

- [x] 3.1 `useSpecRelations` hook: `getSpecs`, then `getSpec` per topic with concurrency 8; one failed spec drops its references, a failed list is the error state; re-runs on the refresh signal
- [x] 3.2 `GraphView`: `?mode=specs` toggle, edge-kind checkboxes, minimum-weight control (default 2), loading / error / empty / both-kinds-off states, isolated-spec count line
- [x] 3.3 Click navigation uses the node's full topic (`specNodeTopic`), never its label
- [x] 3.4 Tests for the hook (concurrency bound, partial failure) and for `GraphView` states

## 4. Contrast and guards

- [x] 4.1 Extend `contrast.test.ts` tables with the new edge marks (line, arrowhead, dashed line) at their declared alphas, measured against the worst surface in both themes
- [x] 4.2 Confirm the no-literal scan in `packages/ui` and the `--spek-border`-not-for-meaning rule pass for the new marks

## 5. Verify

- [x] 5.1 `npm run build:core`, then `npm run type-check`, `npm run lint`, `npm test` all green
- [x] 5.2 Run the Web app against this repo: Specs mode shows references and changed-together edges, controls behave, click navigates
- [x] 5.3 Demo: `NODE_ENV=production npm run build:demo`, open the page, Specs mode draws offline — **then revert `docs/demo.html`** (release-time artifact)
- [x] 5.4 VS Code webview (`verify-vscode` skill): Specs mode draws and navigates; check the light theme
- [ ] 5.5 IntelliJ: `build:intellij`, then `runIde` sandbox; Specs mode draws in JCEF — NOT RUN at archive: needs a first-time Gradle + IDE download; same SPA over FetchAdapter, so expected to work
- [x] 5.6 Time the Specs-mode load on this repo and record the number in the design's Risks if it is above ~1 s

## 6. Archive-time docs (not part of implementation)

- [x] 6.1 On archive, update `CLAUDE.md` (architecture + `Frontend routes`), `docs/prd.md` and the main specs. Do **not** touch CHANGELOGs, versions, READMEs or `docs/demo.html`
