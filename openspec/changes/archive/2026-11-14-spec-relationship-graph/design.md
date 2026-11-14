# Design

## Context

`/graph` renders `GraphData` (spec and change nodes, change → spec edges) through `SpecGraph` in `@spekjs/ui`.
Every host already serves `getGraphData`, `getSpecs` and `getSpec(topic)`; the Demo answers them from its
embedded payload. See `proposal.md` for motivation.

Constraints that shape the approach:
- `@spekjs/ui` is purely presentational, with a closed colour contract (nine `--spek-*` variables) and a
  contrast test that scans for literals, SVG alphas and the border colour on meaningful marks.
- IntelliJ re-implements core logic in Kotlin, but loads the same SPA. A Kotlin mirror is only needed if the
  rule runs on the host side.
- A core change needs `npm run build:core` before the web tests exercise it.

## Goals / Non-Goals

**Goals:**
- One rule, in one language, that every surface computes the same answer from.
- No new route, adapter method or host code in VS Code / IntelliJ / Demo.
- A graph readable at this repo's size (57 specs, 32 references, 288 co-change pairs).

**Non-Goals:**
- Spec-ID citations as an edge source (opt-in; none declared in this repo). The edge `kind` is a string union
  so a third kind can be added without reshaping the others.
- Reference detection beyond whole-topic-token prose matches — no link parsing, no fuzzy or label-only match.
- A server-side batch route for spec contents (see Risks).
- Persisting the controls across sessions.

## Decisions

**1. The rule runs in the client, on a browser-safe core module.** `deriveSpecRelations({ specs, graph })`
takes `{topic, content}[]` and the existing `GraphData`, and returns `{ references, changedTogether }`. It
lives at its own subpath (`@spekjs/core/spec-relations`) so the SPA does not pull `child_process`, as
`search` / `spec-ids` / `schema-flow` already do.
- *Alternative — compute server-side and add a route:* five places (Express, VS Code handler, IntelliJ Kotlin,
  Demo builder, adapters) and a Kotlin mirror, each a place for the rule to drift (issue #51 is the precedent).
  Rejected for v1.
- *Alternative — extend `GraphData` with spec edges:* makes every payload carry both views and forces the
  Demo payload to be rebuilt. Rejected.

**2. Changed-together is derived from the graph's existing edges.** Group `change:… → spec:…` edges by change
node id; every unordered pair inside a group gains 1. The aggregated graph already holds one node per
deduplicated change, so counting node ids counts changes, not worktree copies. Pairs are keyed on the sorted
topic pair; output is sorted by `compareCodeUnits` (not `localeCompare`) for a deterministic order.

**3. References are a boundary-aware token match, built once per run.** For each spec, scan its content for
each *other* topic. Boundary = not directly preceded or followed by `[A-Za-z0-9_-]`; `/` is deliberately *not*
one, so a link target (`../spec-diff/spec.md`) matches. That makes `search` not match in `search-semantics`.
A nested topic matches only by its full path, and because the alternation lists the longest topic first, a
parent's path is not matched inside its child's. Matching is case-sensitive: topics are lowercase kebab by convention and a case-insensitive
match would hit prose ("Search" the word). To avoid O(specs² × length), build one alternation regex of all
topics, longest first, scan each content once, and collect distinct hits.
- *Alternative — parse markdown links (`../x/spec.md`):* misses the prose mentions that make up the real
  signal here. Rejected as the sole source; a link target still contains the topic and matches anyway.
- *Known imprecision, accepted and stated:* a topic that is also an ordinary word (`search`, `routing`) can
  match prose that is not about the spec. The boundary rule bounds it, as the derived-edge rule in
  `schema-flow` is bounded; it is a reading of the text, not a declaration, and the legend says "references".

**4. `GraphEdge` gains optional `kind` and `weight`.** Both optional, so the existing payload and every
existing host's data are valid unchanged. `SpecGraph` branches on `kind`; with none, the path is today's code.
Spec-mode data is `GraphData` with spec nodes only — no second component.
- *Alternative — a separate `SpecRelationGraph` component:* duplicates the simulation, drag, zoom, halo labels
  and the hover-dim semantics that the contrast notes depend on. Rejected.

**5. Edge kinds are told apart by geometry, not hue.** `references`: solid, arrowhead via an SVG `<marker>`
whose fill is the same contract colour as the line. `changed-together`: `stroke-dasharray`, width
`min(1 + weight, 6)`-ish scale. Reference edges are drawn as slight arcs, curving opposite ways for A→B and
B→A, so a pair with a reference *and* a co-change edge, or a mutual reference, stays two readable lines
instead of one overlapping one. The arrowhead stops at the target node's radius, so it is not hidden under
the fill. Colour stays `--spek-text-muted` at the existing 0.85 edge opacity — the contract has no member to
add, and adding one is the change existing hosts do not inherit.

**6. Fetching spec contents.** A hook in web (`useSpecRelations`) calls `getSpecs`, then `getSpec` for each
topic with bounded concurrency (8), only once Specs mode is opened, and caches the derived relations per
`(graph, specs)` for the page's life. The existing refresh/watch signal re-runs it. A failed read of one spec
drops that spec's references rather than failing the mode; a failure of `getSpecs` is the error state.

**7. Controls and state.** Mode is `?mode=specs` in the URL (works under `BrowserRouter` and the webview's
`MemoryRouter`, and is linkable). Edge-kind toggles and minimum weight are component state, not persisted.
Filtering and the isolated-spec count are a pure function (`visibleRelations`) beside the derivation so they
are unit-tested without React; the page only renders what it returns.

**8. Isolated specs are removed from the data, not hidden in the SVG.** Filtering happens before the data
reaches `SpecGraph`, so the simulation does not lay out nodes nobody sees, and the "N specs have no visible
relationships" figure comes from the same function that removed them.

## Risks / Trade-offs

- [Reading every spec costs N requests] → bounded concurrency; Demo and VS Code are in-process. If a large
  repository makes it slow, add a batch route as a follow-up, measured first.
- [Prose-match false positives on word-like topics] → boundary rule, case-sensitive, stated as "references" in
  the legend; the match is a reading of text, not a declaration.
- [A 288-pair co-change set is a hairball] → default minimum weight 2, user-adjustable, isolated specs removed.
- [Arrowhead / dash are SVG attributes the contrast scan treats specially] → the arrow's fill and the line use
  the same contract token; the alpha is a named constant so `contrast.test.ts` imports and measures it rather
  than finding an unaccounted literal. The scan is extended with the new marks, not exempted.
- [Mutual references draw two arcs] → intended; it is the honest picture and the arcs stay distinguishable.
- [`GraphEdge` shape grows] → optional fields, additive; `@spekjs/core` and `@spekjs/ui` need a **minor** bump
  at release (recorded in the proposal's Impact, done at release time).

## Migration Plan

No data migration. Ship behind no flag: the default view is unchanged, Specs mode is opt-in per visit.
Rollback is reverting the change; nothing persists. Hosts verify in real environments (webview, IntelliJ
`runIde`, demo build) before archive.

## Open Questions

- Whether the minimum-weight control should be a stepper or a small slider — a visual choice only.
