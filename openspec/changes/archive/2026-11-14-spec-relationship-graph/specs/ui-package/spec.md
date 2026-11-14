# Spec Delta

## ADDED Requirements

### Requirement: SpecGraph draws edges of a stated kind and weight
`SpecGraph` SHALL accept graph edges that carry an optional `kind` and an optional `weight`. An edge of kind `references` SHALL be drawn solid with an arrowhead at its target; an edge of kind `changed-together` SHALL be drawn dashed with no arrowhead and a stroke width that grows with its weight. An edge with no kind SHALL be drawn exactly as before, so existing hosts and data are unaffected. Every colour used SHALL come from the colour contract, with no new contract member and no literal.

#### Scenario: Untyped edges are unchanged
- **WHEN** a host passes graph data whose edges have no `kind`
- **THEN** the graph renders as it did before this requirement

#### Scenario: Referencing edge has an arrowhead
- **WHEN** an edge has kind `references`
- **THEN** it is drawn solid with an arrowhead at its target

#### Scenario: Weight sets the stroke width
- **WHEN** two `changed-together` edges have weights 2 and 6
- **THEN** the second is drawn with the greater stroke width, up to a stated maximum

#### Scenario: Colours come from the contract
- **WHEN** the package's sources are scanned for colour literals
- **THEN** the arrowhead and the dashed edge introduce none outside the contract's defaults and fallbacks

### Requirement: A spec-only graph is drawn without change entries
When the data holds no change nodes, `SpecGraph` SHALL draw it without change-node legend entries and SHALL draw a spec node that has no `historyCount` at the minimum radius.

#### Scenario: Spec-only data
- **WHEN** a host passes nodes that are all specs
- **THEN** the graph is drawn and the legend lists no change entries

#### Scenario: Spec node without a history count
- **WHEN** a spec node has no `historyCount`
- **THEN** it is drawn at the minimum radius, not at an undefined size
