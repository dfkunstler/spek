# Proposal

## Why

`/graph` draws specs and changes together, so the only way to see how two specs relate is to find a change
that touches both and read across. The question a reader actually has — "what else does this spec depend on,
and what tends to move with it?" — has no view. Both answers are already in the repository: specs name each
other in prose, and changes modify several specs at once.

## What Changes

- Add a **Specs** mode to the `/graph` page, beside the existing spec ↔ change view. Nodes are specs only;
  edges are relationships between them. The existing view stays the default and is unchanged.
- Two derived edge kinds:
  - **References** (directed): spec A's prose names spec B's topic as a whole token. Nested topics are
    supported, a spec never references itself, and a topic matches only at topic boundaries (`search` does not
    match inside `search-semantics`).
  - **Changed together** (undirected, weighted): the number of changes — active and archived — whose delta
    specs touch both specs. A minimum-weight control filters the result, defaulting to 2, because one shared
    change links nearly everything to something (288 pairs on this repo, against 32 references).
- Each edge kind can be switched off. Specs left with no visible edge are not drawn, and the page says how
  many were left out.
- The two kinds are told apart by **line style and an arrowhead**, never by hue alone: references are solid
  with an arrowhead, changed-together are dashed with stroke width carrying the weight. The legend states both.
- Both relations are derived by one pure, browser-safe rule in `@spekjs/core`, so every surface computes the
  same answer. It reads only what the hosts already serve — the spec list, each spec's content, and the
  existing graph data — so **no new API route, no new adapter method, and no Kotlin mirror** are needed, and
  the static demo works from its embedded payload.
- Spec IDs (`spec-id-references`) are deliberately **not** a source: they are opt-in, and this repository
  declares none. A citation source can be added later as a third edge kind without reshaping this one.

## Capabilities

### New Capabilities
- `spec-relations`: the rule that derives spec-to-spec relationships — which prose counts as a reference,
  how topic boundaries and nesting are handled, how co-change weight is counted, and the shape of the result.

### Modified Capabilities
- `graph-view`: a Specs mode on the `/graph` page, edge-kind and minimum-weight controls, per-kind edge
  rendering and legend, isolated-spec handling, and the contrast obligation for the new edges.
- `ui-package`: `SpecGraph` accepts edges that carry an optional kind and weight, and draws the arrowhead,
  dash and width they ask for from the existing colour contract.

## Impact

- **`@spekjs/core`**: new browser-safe module (own subpath, like `search` / `spec-ids`) holding the rule, and
  optional `kind` / `weight` fields on `GraphEdge`. Additive — a **minor** bump for whoever cuts the release,
  not a patch.
- **`@spekjs/ui`**: `SpecGraph` gains the edge rendering above; no new colour-contract member, no literal
  colours. Also additive and minor.
- **Web**: `GraphView` gains the mode switch and controls, and fetches spec content when Specs mode opens.
- **VS Code / IntelliJ / Demo**: no code change expected — they already serve `getSpecs`, `getSpec` and
  `getGraphData`. They still need checking in the real host (a webview, the browser-hosted VS Code for link
  behaviour is not involved here).
- **Cost to watch**: Specs mode reads every spec (57 here) through `getSpec`, with bounded concurrency. If a
  large repository makes this slow, the follow-up is a server-side batch route — a host change in four places —
  and it is deferred until a measurement asks for it.
- **Not touched, by repo rule**: version bumps, CHANGELOGs, READMEs and `docs/demo.html` belong to release time.
