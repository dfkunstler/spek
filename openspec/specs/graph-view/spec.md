## Purpose

提供 spec-change 關聯的力導向圖視覺化，讓使用者探索 specs 與 changes 之間的關係。
## Requirements
### Requirement: Graph page route
The system SHALL provide a `/graph` route that renders the Graph View page within the shared Layout. The page SHALL be accessible from all three modes (Web, VS Code Webview, Demo).

#### Scenario: Navigate to graph page
- **WHEN** user navigates to `/graph`
- **THEN** the Graph View page is rendered within the Layout with sidebar and header visible

#### Scenario: Graph page in demo mode
- **WHEN** the demo build is loaded
- **AND** user navigates to `/graph`
- **THEN** the Graph View page renders using static graph data from `window.__DEMO_DATA__`

### Requirement: Graph data fetching
The system SHALL fetch graph data (nodes and edges) from the API adapter when the Graph View page loads. While loading, the page SHALL display a loading indicator. If the fetch fails, an error message SHALL be displayed.

#### Scenario: Successful data load
- **WHEN** the Graph View page mounts
- **THEN** the system calls `getGraphData()` on the API adapter
- **AND** renders the force-directed graph with the returned nodes and edges

#### Scenario: Loading state
- **WHEN** graph data is being fetched
- **THEN** a loading indicator is displayed in the graph container

#### Scenario: Error state
- **WHEN** graph data fetch fails
- **THEN** an error message is displayed with the failure reason

### Requirement: Force-directed graph layout
The system SHALL render an interactive force-directed graph using D3 force simulation. Spec nodes and change nodes SHALL be positioned by the simulation with forces: center force, link force (connecting edges), many-body repulsion force, and collision force to prevent overlap.

#### Scenario: Initial layout
- **WHEN** graph data is loaded with specs and changes
- **THEN** a force-directed simulation positions all nodes within the SVG viewport
- **AND** the simulation runs until convergence (alpha < 0.001)

#### Scenario: Empty graph
- **WHEN** graph data contains no nodes with edges (no changes have specs)
- **THEN** the page displays a message indicating no relationships to visualize

### Requirement: Node visual encoding
The system SHALL render spec nodes as circles and change nodes as rounded rectangles. Spec node radius SHALL scale with `historyCount` (minimum 20px, maximum 45px). Change node size SHALL scale with `specCount` (number of specs modified). Spec nodes SHALL use the accent color (amber). Change nodes SHALL use green for active status and blue-gray for archived status.

Each of those colours SHALL come from the package's colour contract rather than from a literal, so that a
host's theme reaches them: the spec node from the accent property, the archived change node from the muted
text property, and the active change node from a property of its own, since no existing one expresses it.
A node's colour states its kind and its status with no text beside it, so it SHALL meet at least 3:1
against the least favourable of the host's surfaces in every theme the host offers.

Where a node is drawn with both a fill and a stroke, the stroke SHALL be the same contract colour as the
fill rather than a separate value. A rim one step lighter than its fill is a dark-theme assumption — on a
light background the rim has to darken instead — and the package cannot know which way to move.

#### Scenario: Spec node sizing
- **WHEN** a spec has `historyCount` of 5 (highest in the dataset)
- **THEN** its circle radius is at or near the maximum (45px)

#### Scenario: Spec node with no history
- **WHEN** a spec has `historyCount` of 0
- **THEN** its circle radius is at the minimum (20px)

#### Scenario: Change node coloring
- **WHEN** a change has `status: "active"`
- **THEN** its rectangle uses a green color scheme
- **WHEN** a change has `status: "archived"`
- **THEN** its rectangle uses a blue-gray color scheme

#### Scenario: Node colours follow the host's theme
- **WHEN** a host renders the graph with a light theme
- **THEN** every node's fill and stroke resolve from the contract to that theme's values
- **AND** each meets at least 3:1 against the least favourable of the host's surfaces

### Requirement: Node labels
The system SHALL display text labels next to each node. Spec labels SHALL show the topic name. Change labels SHALL show the description (derived from slug). Labels longer than 25 characters SHALL be truncated with ellipsis.

#### Scenario: Spec label display
- **WHEN** a spec node with topic "markdown-renderer" is rendered
- **THEN** a text label "markdown-renderer" is displayed adjacent to the node

#### Scenario: Long change label truncation
- **WHEN** a change with description "phase3 markdown and search improvements" is rendered
- **THEN** the label is truncated to 25 characters with "..." appended

### Requirement: Edge rendering
The system SHALL render edges as lines connecting change nodes to the spec nodes they modified. Edges SHALL use a muted color by default. When a node is hovered, its connected edges SHALL be highlighted.

An edge is the only thing stating that a change touched a spec, so it SHALL meet at least 3:1 against the
least favourable of the host's surfaces in every theme. It SHALL NOT be drawn in the contract's border
colour: that value is a panel hairline — 1.22:1 dark and 1.13:1 light **at full strength** — so no opacity
of it can satisfy the floor.

#### Scenario: Edge display
- **WHEN** change "phase3-markdown-and-search" modified specs "markdown-renderer" and "search-ui"
- **THEN** two edges are drawn from the change node to each respective spec node

#### Scenario: Edges are visible in every theme
- **WHEN** the graph is rendered in either theme
- **THEN** each edge meets at least 3:1 against the least favourable of the host's surfaces

### Requirement: Drag interaction
The system SHALL support dragging nodes to reposition them. During drag, the dragged node's position SHALL be fixed. After releasing, the node SHALL remain at its dragged position until the simulation is restarted.

#### Scenario: Drag a node
- **WHEN** user clicks and drags a spec node
- **THEN** the node follows the cursor
- **AND** connected edges update in real-time
- **AND** the force simulation reheats to adjust surrounding nodes

### Requirement: Hover highlight interaction
The system SHALL highlight a node and its connected neighbors when the user hovers over it. All non-connected nodes and edges SHALL reduce opacity to 0.1. The hovered node, its neighbors, and their connecting edges SHALL remain at full opacity.

This dimming is a **stated exemption** from the contrast floor, not a satisfaction of it. It is permitted
because it is a pointer-driven emphasis state that reverts when the pointer leaves, and nothing is
available only while it is active — every dimmed node is fully legible in the graph's resting state. The
exemption is limited to that shape: a de-emphasis that the reader causes, that ends when they stop causing
it, and that hides nothing.

The exemption is claimed against a measurement, and the measurement is stated exactly. A node label in the
light theme holds 2.82:1 at 0.6 opacity and 4.41:1 at 0.8, and clears the 4.5:1 floor from **α ≈ 0.81**
(dark, α ≈ 0.73). So a conforming dimming does exist — at a strength no reader would perceive as dimming.
The choice was therefore this exemption, dimming the graphics while leaving every label at full strength,
or hiding the non-connected labels outright; it is a judgement about what de-emphasis means, not a claim
that no value passes.

#### Scenario: Hover on spec node
- **WHEN** user hovers over spec node "markdown-renderer"
- **THEN** the "markdown-renderer" node, all change nodes connected to it, and their edges are highlighted at full opacity
- **AND** all other nodes and edges reduce to 0.1 opacity

#### Scenario: Hover off
- **WHEN** user moves the cursor away from all nodes
- **THEN** all nodes and edges return to full opacity

#### Scenario: The dimmed state ends on its own
- **WHEN** the pointer leaves the graph without any further action
- **THEN** every dimmed node and edge returns to full strength
- **AND** no information was reachable only while they were dimmed

### Requirement: Click navigation
The system SHALL navigate to the detail page when a node is clicked (without dragging). Clicking a spec node SHALL navigate to `/specs/:topic`. Clicking a change node SHALL navigate to `/changes/:slug`; when the graph is showing aggregated worktree data, the navigation SHALL include the change's source worktree as a `wt` query parameter (`/changes/:slug?wt=<key>`).

#### Scenario: Click spec node
- **WHEN** user clicks (without dragging) on spec node "api-adapter"
- **THEN** the app navigates to `/specs/api-adapter`

#### Scenario: Click change node
- **WHEN** user clicks (without dragging) on change node "2026-02-13-initial-implementation"
- **THEN** the app navigates to `/changes/2026-02-13-initial-implementation`

#### Scenario: Click aggregated change node
- **WHEN** the graph shows aggregated worktree data and the user clicks a change node
- **THEN** the app navigates to `/changes/<slug>?wt=<key>` for that change's source worktree

### Requirement: Zoom and pan
The system SHALL support zooming (scroll wheel or pinch) and panning (click-and-drag on empty space) of the graph viewport. Zoom SHALL be constrained between 0.3x and 3x. The graph SHALL initially be centered and scaled to fit all nodes within the viewport.

#### Scenario: Zoom in
- **WHEN** user scrolls up (or pinch-zooms in) on the graph
- **THEN** the graph zooms in, up to a maximum of 3x

#### Scenario: Zoom out
- **WHEN** user scrolls down (or pinch-zooms out) on the graph
- **THEN** the graph zooms out, down to a minimum of 0.3x

#### Scenario: Pan
- **WHEN** user clicks and drags on empty space (not on a node)
- **THEN** the entire graph viewport pans in the drag direction

#### Scenario: Initial fit
- **WHEN** the graph first renders
- **THEN** the viewport is scaled and centered to show all nodes within the visible area

### Requirement: Graph legend
The system SHALL display a legend overlay in a corner of the graph container, showing the meaning of node shapes and colors: amber circle = Spec, green rectangle = Active Change, blue-gray rectangle = Archived Change.

Each swatch SHALL take the same contract colour as the node kind it explains. A legend drawn from its own
literals states the key in colours the graph may not be using.

#### Scenario: Legend display
- **WHEN** the graph is rendered
- **THEN** a legend is visible showing node type indicators with labels

#### Scenario: Swatch matches the node it explains
- **WHEN** the graph is rendered in either theme
- **THEN** each legend swatch is the same colour as the nodes of that kind

### Requirement: Aggregated change nodes from worktrees
When the graph is built from aggregated worktree data, change nodes SHALL include one node per active change slug (deduplicated using the **same divergence-based election as the aggregated active changes list**: a non-main worktree wins a slug only when it has diverged from main's `HEAD` for that change, otherwise the slug stays on main; most-recently-modified-mtime breaks ties among diverging worktrees) plus the slug-deduplicated archived changes. Change node ids SHALL be namespaced by the winning worktree (`change:<worktreeKey>:<slug>`). Spec nodes SHALL come only from the main worktree.

#### Scenario: Same-slug active changes deduplicate to one node

- **WHEN** the main worktree and worktree A both have an active change with slug `add-foo`, and worktree A has diverged (advanced its copy beyond main's `HEAD`)
- **THEN** the graph contains exactly one change node for `add-foo`
- **AND** its id is namespaced by worktree A's key, not main's

#### Scenario: Inherited-but-untouched fork does not own the node

- **WHEN** the main worktree has active change `add-foo` and a worktree B created afterwards inherits it without diverging
- **THEN** the graph contains exactly one change node for `add-foo`
- **AND** its id is namespaced by main's key, not B's

#### Scenario: Distinct active changes stay distinct

- **WHEN** worktree A has active change `add-foo` and worktree B has active change `add-bar`
- **THEN** the graph contains two distinct change nodes, one per slug
- **AND** each connects to the spec nodes its own delta specs reference

#### Scenario: Spec nodes from main worktree
- **WHEN** the graph is built from aggregated worktree data
- **THEN** spec nodes are taken only from the main worktree

#### Scenario: Deduplication removes duplicate edges from spec fan-in

- **WHEN** an active change `add-foo` with a delta spec exists in both main and worktree A, and worktree A has diverged so it wins the slug
- **THEN** the graph contains exactly one `change:...:add-foo` → spec edge
- **AND** the spec node's `historyCount` counts that edge once, not once per worktree

### Requirement: Worktree source on change nodes
When the graph shows aggregated data from more than one worktree, each change node SHALL convey its source worktree, for example through its label or a tooltip. When the graph shows a single worktree, no source information SHALL be added.

#### Scenario: Change node conveys source under aggregation
- **WHEN** the graph shows aggregated data from multiple worktrees
- **THEN** each change node conveys which worktree or branch it belongs to

#### Scenario: No source on single-worktree graph
- **WHEN** the graph shows data from a single worktree
- **THEN** change nodes carry no worktree source information

### Requirement: Graph covers jj workspaces

The relationship graph SHALL include change nodes from jj workspaces when jj inclusion is enabled,
using the same `change:<workspaceKey>:<slug>` namespacing as git worktrees so same-slug changes from
different workspaces do not collide. Because jj workspaces materialise the full trunk, the graph SHALL
apply the same content-identity deduplication as the scanner (per `jj-workspace-aggregation`) to jj
change nodes: a jj change whose content is byte-identical to one already added SHALL NOT produce a
duplicate node, and its edges SHALL be skipped so referenced specs' history counts are not inflated.
jj workspaces SHALL NOT be fed into the git divergence election that resolves git-worktree nodes.
Divergent jj copies remain distinct nodes via their differing workspace keys.

#### Scenario: jj workspace change appears as a node

- **WHEN** the aggregated graph is built on a repo with an added jj workspace whose active change has a
  spec delta
- **THEN** that change appears as a node with id `change:<workspaceKey>:<slug>` and a `source` whose
  `vcs === "jj"`

#### Scenario: Identical jj copies do not duplicate nodes

- **WHEN** a trunk change with a spec delta is materialised identically across multiple jj workspaces
- **THEN** the graph contains a single node for that change and the referenced spec's history count is
  not inflated

### Requirement: Graph uses full nested topic identity
The graph SHALL create one spec node per full topic path and connect a change to a spec only when its delta has that exact topic. A spec node's visible label SHALL be the topic's final path segment, and the full topic path SHALL be available as the node's tooltip; click navigation SHALL use the full topic path taken from the node's identity, never from its displayed label. Under worktree aggregation, spec nodes SHALL continue to come only from the main worktree.

#### Scenario: Parent and child have separate nodes
- **WHEN** main specs contain `contracts/pagination` and `contracts/pagination/streaming-search`
- **THEN** the graph contains distinct nodes for both topics
- **AND** a change delta for the child creates an edge only to the child node

#### Scenario: Nested node label
- **WHEN** the graph shows the spec node for `contracts/pagination/streaming-search`
- **THEN** its label reads `streaming-search`
- **AND** hovering it shows `contracts/pagination/streaming-search`

#### Scenario: Nested node navigation
- **WHEN** a user clicks the `contracts/pagination/streaming-search` spec node
- **THEN** the app opens `/specs/contracts/pagination/streaming-search`

#### Scenario: Same-named nodes navigate to their own topics
- **WHEN** main specs contain `contracts/streaming-search` and `guides/streaming-search`, both labelled `streaming-search`
- **THEN** clicking each node opens its own full topic, not the other's

### Requirement: Specs mode shows relationships between specs
The Graph page SHALL offer a Specs mode beside the existing spec ↔ change view, switchable on the page. In Specs mode the nodes SHALL be specs only and the edges SHALL be the relations defined by `spec-relations`. The existing spec ↔ change view SHALL remain the default and SHALL behave as before. The mode SHALL be available in Web, the VS Code webview, IntelliJ and the Demo.

#### Scenario: Default mode is unchanged
- **WHEN** a user opens `/graph`
- **THEN** the spec ↔ change graph is shown as before

#### Scenario: Switch to Specs mode
- **WHEN** the user selects Specs mode
- **THEN** the graph shows spec nodes only, connected by reference and changed-together edges

#### Scenario: Specs mode in the demo
- **WHEN** the demo build is loaded and the user selects Specs mode
- **THEN** the graph is drawn from the embedded payload with no network request

#### Scenario: Specs mode while spec content loads
- **WHEN** the user selects Specs mode and spec contents are still being read
- **THEN** a loading indicator is shown
- **AND** if reading fails, an error message states the failure and the mode can be left

### Requirement: The two relations are told apart without relying on colour
A reference edge SHALL be drawn solid with an arrowhead at the referenced spec. A changed-together edge SHALL be drawn dashed with no arrowhead, with its stroke width increasing with its weight. Neither kind SHALL be distinguished by hue alone, and both SHALL draw from the package's existing colour contract.

#### Scenario: Reference edge
- **WHEN** `ui-package` references `core-module`
- **THEN** a solid line with an arrowhead at `core-module` joins them

#### Scenario: Changed-together edge
- **WHEN** two specs have changed together in four changes
- **THEN** a dashed line with no arrowhead joins them
- **AND** it is drawn thicker than a changed-together edge of weight 2

#### Scenario: A pair with both relations
- **WHEN** spec A references spec B and the two have also changed together
- **THEN** both edges are drawn and remain distinguishable

### Requirement: Each edge kind can be switched off
Specs mode SHALL provide a control for each edge kind that shows or hides it. With a kind hidden, its edges SHALL NOT be drawn and SHALL NOT keep any spec visible.

#### Scenario: Hide changed-together edges
- **WHEN** the user turns off changed-together edges
- **THEN** only reference edges remain

#### Scenario: Both kinds off
- **WHEN** the user turns off both kinds
- **THEN** the page states that no edge kind is selected rather than drawing an empty graph

### Requirement: Changed-together edges are filtered by a minimum weight
Specs mode SHALL provide a minimum-weight control for changed-together edges, defaulting to 2, and SHALL draw only edges whose weight is at least that value. The control SHALL NOT affect reference edges.

#### Scenario: Default threshold
- **WHEN** Specs mode opens
- **THEN** changed-together edges of weight 1 are not drawn
- **AND** the control shows the minimum of 2

#### Scenario: Lower the threshold
- **WHEN** the user sets the minimum weight to 1
- **THEN** every changed-together edge is drawn

#### Scenario: Reference edges ignore the threshold
- **WHEN** the user raises the minimum weight
- **THEN** reference edges are unchanged

### Requirement: Specs with no visible edge are not drawn, and are accounted for
In Specs mode a spec that has no drawn edge under the current controls SHALL NOT be drawn, and the page SHALL state how many specs are left out. Changing a control SHALL bring a spec back when it gains an edge.

#### Scenario: Isolated specs are omitted and counted
- **WHEN** 12 of 57 specs have no visible edge under the current controls
- **THEN** 45 are drawn
- **AND** the page states that 12 specs have no visible relationships

#### Scenario: Lowering the threshold restores a spec
- **WHEN** a spec's only relation is a changed-together edge of weight 1 and the user sets the minimum to 1
- **THEN** that spec is drawn

#### Scenario: Nothing to draw
- **WHEN** no spec has a visible edge
- **THEN** the page states there are no relationships to visualize

### Requirement: Specs mode interactions follow the graph's existing behaviour
In Specs mode, zoom, pan, drag and hover emphasis SHALL behave as in the spec ↔ change view, and clicking a spec node SHALL navigate to that spec by its full topic path, never by its label. Node identity SHALL follow `Graph uses full nested topic identity`.

#### Scenario: Click a spec
- **WHEN** the user clicks the node for `contracts/pagination/streaming-search` in Specs mode
- **THEN** the app opens `/specs/contracts/pagination/streaming-search`

#### Scenario: Hover a spec
- **WHEN** the user hovers a spec node in Specs mode
- **THEN** that node, its neighbours and the edges between them stay at full strength and the rest are dimmed as in the existing view

### Requirement: Specs mode edges meet the contrast floor and the legend explains them
Each reference and changed-together edge SHALL meet at least 3:1 against the least favourable of the host's surfaces in every theme, because the edge is the only thing stating the relationship; it SHALL NOT be drawn in the contract's border colour. In Specs mode the legend SHALL show a sample of each edge kind — its line style and, for references, the arrowhead — and SHALL show no change-node entries.

#### Scenario: Edges legible in both themes
- **WHEN** Specs mode is rendered in either theme
- **THEN** every edge kind meets at least 3:1 against the least favourable surface

#### Scenario: Legend in Specs mode
- **WHEN** Specs mode is shown
- **THEN** the legend shows a solid arrow labelled as a reference and a dashed line labelled as changed together
- **AND** it carries no active-change or archived-change entry
