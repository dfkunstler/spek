## ADDED Requirements

### Requirement: Spec-shaped content is held to a bounded measure
Spec-shaped content SHALL be laid out in a column no wider than about 120 columns wherever it is rendered, including the Specs tab of a change. Content that does not fit the column — a wide table, a code block, a long unbroken token — SHALL scroll horizontally within its own block and SHALL NOT widen the column, overlap the TOC, or be clipped.

#### Scenario: Change Specs tab
- **WHEN** the Specs tab of a change is shown on a window wider than the cap
- **THEN** each delta spec is rendered in a column no wider than about 120 columns

#### Scenario: Wide table
- **WHEN** a spec contains a table wider than the column
- **THEN** the table scrolls horizontally within the column and the rest of the page does not

#### Scenario: Wide code block
- **WHEN** a spec contains a code block with a line longer than the column
- **THEN** the block scrolls horizontally and the column keeps its width
