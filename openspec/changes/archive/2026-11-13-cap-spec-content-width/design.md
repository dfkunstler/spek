# Design

## Context

Nothing in the app bounds content width. `Layout.tsx`'s `<main>` fills the viewport minus the sidebar, and spec views add no cap of their own. Three places lay out spec-shaped content:

- `SpecDetail.tsx` — an `xl:grid` of `minmax(0,1fr)` plus a 16rem TOC column, holding either the rendered spec or `DiffView`.
- `SpecsTabContent.tsx` — the Specs tab of a change, rendered inside `ChangeDetail`'s own grid, which wraps the whole `TabView` (tab bar included) and puts the TOC at the right edge.
- `SpecDiffViewer.tsx` — already scrolls its own rows in an `overflow-x-auto` wrapper.

`MarkdownRenderer` already gives tables and fenced code blocks their own `overflow-x-auto`, and sets `overflow-wrap: anywhere` on the body for long tokens. So wide content already scrolls inside its block; the cap only makes that happen at a narrower width.

## Goals / Non-Goals

**Goals:**
- One definition of the measure, read by every call site.
- The TOC next to the capped column on the spec detail page.

**Non-Goals:**
- Making the measure a user setting.
- Capping Graph, Timeline or the repo picker.
- Re-centring the column. It stays left-aligned beside the sidebar.

## Decisions

**The measure is a theme token, `--container-spec: 120ch`, in `global.css`'s `@theme` block.** Tailwind v4 turns a `--container-*` variable into a `max-w-spec` utility, and the same variable can be named inside an arbitrary grid template: `xl:grid-cols-[minmax(0,var(--container-spec))_16rem]`. One value serves both the class and the grid. Alternatives: a TypeScript constant holding a class string (cannot be used inside the grid template without a second literal, and Tailwind only sees complete class strings), or a literal `120ch` at each site (three copies that drift — the exact failure `CLAUDE.md` records for the search rule).

**`ch`, not a pixel width.** The cap follows the font size, so it stays a reading measure rather than a pixel box. Plus Jakarta Sans is proportional and `ch` is the width of `0`, so 120ch holds somewhat more than 120 average characters of prose. This is deliberate; "about 120 columns" is the requirement, and the single token makes it a one-line change if it reads too loose.

**Spec detail page: cap the grid column, and the wrapper.** The grid's first column becomes `minmax(0,var(--container-spec))`, which pulls the TOC in next to the text. The `xl` grid only applies when the TOC shows, so the content `div` also takes `max-w-spec` to cover the no-TOC and below-`xl` cases. Alternative: leave the `1fr` column and cap only the inner wrapper — that leaves the TOC at the window edge, which is part of the problem.

**Every reading page caps its own root, and `ChangeDetail` caps its grid.** Capping in `Layout` would squeeze the spec and change pages' TOC grid into 120ch total and would need a route list to exempt Graph and Timeline. Per page, the exemption is simply that those two do not carry `max-w-spec`, and all four host entry points inherit it. `ChangeDetail`'s grid wraps the tab bar, so capping it caps every tab alike — the width no longer jumps between tabs, which was the reason the first version left it alone. `SpecsTabContent` needs no cap of its own.

**Diff view: cap with the rest of the spec detail column.** It sits inside the same content `div`, so it inherits the cap with no change of its own. Its rows keep their own horizontal scroll.

**No new overflow code.** Tables, code blocks and long tokens already scroll or wrap inside their own blocks (see Context). The work is verifying that holds at the capped width, not adding rules.

## Risks / Trade-offs

- [Mermaid diagrams drawn for a wide column now sit in a narrower one] → They scale to their container (`max-w-full`); check one wide diagram.
- [The cap is CSS geometry, which jsdom cannot see] → Tests assert the shape as text, as `CLAUDE.md` records for the folding rules: the token exists, and each call site references it. Layout itself is checked by rendering the real build in a browser.
- [Lists and cards that were designed for a wide window now sit in a narrower one] → Check each for awkward empty space; the Dashboard's stat-card grid is the likeliest.
- [VS Code and IntelliJ webviews narrower than the cap] → Unaffected: the cap only bites above 120ch.
