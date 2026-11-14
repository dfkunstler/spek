# Spec Delta

## ADDED Requirements

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
