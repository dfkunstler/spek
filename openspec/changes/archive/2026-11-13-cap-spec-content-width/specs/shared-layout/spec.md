## ADDED Requirements

### Requirement: Reading pages have a bounded width
Pages that present text for reading — Overview, the spec and change lists and details, and the schema list and details — SHALL render their content no wider than about 120 columns, aligned to the start of the content area. The Graph and Timeline pages SHALL keep the full available width, because they draw spatial views that a width cap would crop.

#### Scenario: Reading page on a wide window
- **WHEN** a reading page is shown on a window wider than the cap
- **THEN** its content is no wider than about 120 columns and the space beyond is left empty

#### Scenario: Reading page on a narrow window
- **WHEN** a reading page is shown on a window narrower than the cap
- **THEN** its content occupies the full available width

#### Scenario: Graph and Timeline
- **WHEN** the Graph or Timeline page is shown on a wide window
- **THEN** it uses the full width of the content area

#### Scenario: Width is the same across a change's tabs
- **WHEN** the reader switches between the tabs of a change on a wide window
- **THEN** the content width does not change
