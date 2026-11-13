# Proposal

## Why

Spec content renders at the full width of the window. On a wide monitor a requirement's prose runs far past a comfortable line length (about 120 characters), which makes the text hard to scan and leaves the TOC stranded at the far right edge, away from the text it indexes.

## What Changes

- Cap the content column of every reading page at about 120 columns (`120ch`), left-aligned beside the sidebar, instead of letting it fill the window:
  - the spec detail page (`/specs/*`) and its diff view, with the TOC staying adjacent to the capped column rather than at the viewport edge
  - the change detail page, all tabs, so a change's width never shifts between tabs (its TOC likewise sits beside the column)
  - Overview, the spec and change lists, and the schema list and details
- **Graph and Timeline are exempt** and keep the full viewport: they draw spatial views that a cap would crop.
- The cap is one shared definition, so no page can drift from the others.
- Content wider than the cap (tables, code blocks, diff lines) scrolls horizontally inside the column; it never widens the column or is clipped.
- Content narrower than the cap, and narrow viewports, are unaffected.

## Capabilities

### New Capabilities
<!-- None: the width is a property of how spec content is laid out, which existing capabilities already own. -->

### Modified Capabilities
- `spec-browsing`: the spec detail page's content column is capped at about 120 columns, and the TOC sidebar sits beside that column instead of at the viewport edge.
- `markdown-renderer`: spec-shaped content has a bounded measure, and content wider than it scrolls inside the column rather than widening it.
- `shared-layout`: reading pages are bounded to the measure; Graph and Timeline are not.

## Impact

- Code: `packages/web/src/pages/` (`SpecDetail`, `ChangeDetail`, `Dashboard`, `SpecList`, `ChangeList`, `SchemaList`, `SchemaDetail`) and the one shared definition in `packages/web/src/styles/global.css`. The diff view sits inside the spec detail column and inherits its cap. `GraphView` and `TimelinePage` are untouched. Capping per page, not in `Layout`, keeps the exemption a fact about the page and covers every host entry point.
- Hosts: the VS Code and IntelliJ webviews load the same SPA, so they pick the change up on their next webview build; no host code changes.
- Release: no CHANGELOG, version, README or `docs/demo.html` edits here. Those happen at release time (see CLAUDE.md).
- No API, core or `@spekjs/*` package changes.
