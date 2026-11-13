# Tasks

## 1. The shared measure

- [x] 1.1 Add `--container-spec: 120ch` to the `@theme static` block in `packages/web/src/styles/global.css`, with a comment saying why it is `ch` and that it is the one definition. Verify `max-w-spec` appears in a built stylesheet (`npm run build -w @spekjs/web`, then grep the CSS in `dist`).

## 2. Spec detail page and diff view

- [x] 2.1 In `packages/web/src/pages/SpecDetail.tsx`, change the TOC grid to `xl:grid-cols-[minmax(0,var(--container-spec))_16rem]` and add `max-w-spec` to the content column. Verify in a browser on a window wider than 120ch: the text stops at the cap, the TOC sits beside it, and a spec with fewer than 3 headings (no TOC) is capped too.
- [ ] 2.2 Verify the diff view (compare a spec against a history entry) holds the same width, and a long diff line scrolls inside its own block.
- [x] 2.3 Add a text-shape test beside the existing `contrast.test.ts` pattern asserting `global.css` defines `--container-spec` and that `SpecDetail.tsx` and `SpecsTabContent.tsx` reference it, with no bare `120ch` literal elsewhere in `packages/web/src`. Verify with `npm test -w @spekjs/web`.

## 3. Change page and the other reading pages

- [x] 3.1 Cap `ChangeDetail.tsx`'s grid and column with the token (all tabs), and cap the root of `Dashboard`, `SpecList`, `ChangeList`, `SchemaList` and `SchemaDetail` with `max-w-spec`. Leave `GraphView` and `TimelinePage` alone. Verify with `specMeasure.test.ts`, which asserts both lists.
- [ ] 3.2 Verify in a browser on a wide window that each of those pages is capped, switching a change's tabs does not shift the width, Graph and Timeline still fill the viewport, and the Dashboard cards look right at the cap.

## 4. Wide content at the capped width

- [ ] 4.1 Check, on a spec that has a table and a fenced code block wider than 120ch plus a Mermaid diagram, that the table and code block scroll within their own blocks, the diagram scales down, and nothing overlaps the TOC. Fix with `overflow-x-auto` / `max-w-full` only if one of them fails; verify by re-running the same check.

## 5. Integration

- [x] 5.1 Run `npm run type-check`, `npm run lint` and `npm test`, and verify all pass. Run `npm run build:webview -w @spekjs/web` and confirm the VS Code webview build still succeeds (the host loads this CSS unchanged).
- [x] 5.2 Verify below the cap: at a viewport under 120ch and under 1280px wide, the spec content fills the width and the TOC is hidden, as before.

## Workflow follow-up

- Run `/opsx:verify` then `/opsx:archive` once implemented. On archive, update the docs that describe master's implementation (`CLAUDE.md`, `docs/prd.md`, `openspec/specs/`).
- CHANGELOG, version bumps, READMEs and `docs/demo.html` are release-time; do not touch them in this change.
