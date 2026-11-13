# Design

## Context

`MarkdownRenderer` already resolves one kind of reference — a code span naming a spec topic becomes a `Link` (`specTopics`) — and already post-processes text runs for BDD keywords. Headings get stable slug ids (`slugifyHeading`), prefixed `<topic>--` on a change's Specs tab. The adapter layer (`ApiAdapter`) carries data to the SPA; `FetchAdapter` is the web implementation. `@spekjs/core` keeps browser-safe rules on subpaths (`search`, `headings`). See proposal.md for motivation.

Two real conventions exist (`oscal-bindings-specs`: `### Requirement: BMB-001 Title`; `cairn-proofs`: `### Requirement: [ACCESS-001] Title`), both citing as `[ID]`.

## Goals / Non-Goals

**Goals:**
- One rule for "what is an identifier, what does a citation resolve to", in core.
- No configuration, and no change for repositories without identifiers.

**Non-Goals:**
- Validating the projects' identifier rules (ordering, reuse, ledger upkeep). Their gates own that.
- Resolving identifiers in proposal, design or tasks text.
- Other hosts. VS Code, demo and IntelliJ degrade; a Kotlin mirror is a follow-up.

## Decisions

**Declaration is read from headings only.** A `Requirement:` / `Scenario:` heading whose text starts with `ID` or `[ID]`. The pattern is `[A-Z][A-Z0-9]*-\d{3,}(\.\d{2,})?`: it admits `PCLAIM-001` and `INGEST-017.07` and rejects `TODO-1`. Alternative: a per-project regex in config — rejected, since both known conventions are one shape and config is a second place to be wrong.

**Citations are bracketed only.** `[ID]` or `[ID](…)`, label exactly an identifier. A bare `BMB-003` in prose is not linked: prose holds PR numbers, versions and error codes that match the shape, and both projects already cite in brackets. Alternative considered: link bare identifiers that are declared. Rejected for false positives in code-like prose.

**The rule is `@spekjs/core/spec-ids` (browser-safe) plus a Node builder.** The subpath holds the declaration parser, the `## Relocated and Retired IDs` table parser, the citation matcher and the index types, with no `fs`, as `search` does. The Node side (`buildSpecIdIndex(basePath, changeSlug?)`) walks main specs through the existing `discoverSpecFiles`, applies the parser, merges delta specs, and reads the ledger. Parsing is shared so a future static or Kotlin host differs only in where its text comes from.

**Anchors come from `extractHeadings`, and a scenario links to its requirement.** The index stores the slug the TOC and renderer give the declaring heading, so a link lands where they do. The renderer assigns ids to `h2` and `h3` only; giving `h4` (scenarios) ids would share and shift the dedup counter and so change existing anchors, so a scenario's anchor is its requirement's, and its text is in the hover. On a change's Specs tab the page uses `idPrefix`, so a link to a delta target carries `<topic>--<slug>` and a link to a main target goes to `/specs/<topic>#<slug>`.

**Retired records come from two sources, merged.** `openspec/spec-ids.yaml`'s `retired:` list (`id`, `reason`, `replaced_by`), parsed with the `yaml` package core already depends on, and any `## Relocated and Retired IDs` table (`ID | Status | Resolves to`) in a main spec. A parse failure yields no records from that source and never an error. A declared identifier wins over a retired record of the same name, so a stale ledger cannot hide a live requirement. The ledger path is fixed (`openspec/spec-ids.yaml`) and no part of it comes from a request, so the containment rule that limits reads to `openspec/` holds.

**Delta wins over main when a change is viewed.** The endpoint takes `at=<slug>`; the delta's text is what the change will make true, and the Specs tab is showing that text.

**Linking lives in the renderer, under `specShaped`.** Citations are literal text (`[ID]` with no reference definition renders as text) or an `a` element. Handling them beside the BDD keyword text-run pass keeps one place that decides which runs are requirement prose; a heading context and code are already excluded there. An `a` whose text is an identifier is rewritten the same way. The index is provided through a React context, so `MarkdownRenderer` takes no new prop and non-spec renders cannot link by accident. Alternative: a remark plugin over the mdast — rejected because the plugin has no router and no index at parse time, and the rest of the renderer's reference handling is component-level.

**The preview is a small custom popover, not `title`.** `title` is not keyboard reachable and cannot hold a statement with structure. The trigger is the link; the popup shows on hover and focus, hides on blur, leave and Escape, is wired with `aria-describedby`, and takes no focus. Content is the target's text rendered as Markdown by `MarkdownRenderer`, so lists, code spans and BDD keyword highlighting read as they do on the page. The nested render is mounted only while the popover is open, is not `specShaped` (so a citation inside a preview stays text and previews cannot nest), and sits in a height-capped, scrollable box. A retired citation is a non-link element (`tabindex=0`, `role` text) so the hover is still reachable by keyboard.

**No new colour tokens.** The link reuses the spec-reference style (`text-code-text`, dotted underline); the popover uses `bg-bg-secondary`, `border-border`, `text-text-primary`; "retired" uses `text-text-muted` with no opacity. Existing rows in `contrast.test.ts` already measure these, and the scan for bypasses (hard-coded palette classes, bare opacity) must still pass.

**The hook degrades silently.** `getSpecIds` is optional on `ApiAdapter`. Absent, or a failed fetch, yields an empty index: no links, no message. A decoration must not turn a spec page into an error page.

## Risks / Trade-offs

- [Index is repo-wide, so each spec page triggers a read of every spec] → Measured at under 10 ms on both reference repositories (748 and 385 identifiers), so there is no cache: one needs invalidation on every edit the watcher reports, and this costs less than that machinery would.
- [Two conventions for retirement may not cover a third] → The parser is small and isolated; a third source is one function. Unrecognised ledgers yield nothing, which is today's behaviour.
- [A bracketed non-identifier in prose that happens to match the shape and is declared elsewhere gets linked] → Acceptable: it resolves to a real declared identifier, which is what such a token means in these projects.
- [A nested renderer inside a popover could draw diagrams or re-render heavily] → It mounts only while open, and a requirement body rarely holds a diagram; the height cap bounds the layout.
- [Popover geometry and focus cannot be tested in jsdom] → Tests assert markup and attributes (`aria-describedby`, `tabindex`, hidden by default); the behaviour is checked in a real browser.
- [A change that lives only in another worktree is not found by slug under the repository's own `openspec/changes/`] → Its delta citations do not resolve there, and main ones still do. Passing the worktree (`wt`) as the change routes do is the follow-up if that shows up.
- [IntelliJ and VS Code show no links until the follow-up] → Stated in the proposal; `CLAUDE.md` records the web-only state at archive.
