## ADDED Requirements

### Requirement: Spec content has a bounded reading width
The spec detail page SHALL render its content column — the rendered spec and the diff view that replaces it — no wider than about 120 columns, aligned to the start of the content area, however wide the window is. A viewport narrower than that SHALL see the column at its full available width.

#### Scenario: Wide window
- **WHEN** user views a spec on a window wider than the cap
- **THEN** the content column is no wider than about 120 columns and the space beyond it is left empty

#### Scenario: Narrow window
- **WHEN** user views a spec on a window narrower than the cap
- **THEN** the content column occupies the full available width

#### Scenario: Diff view
- **WHEN** user compares a spec against a historical version on a window wider than the cap
- **THEN** the diff view is held to the same width as the rendered spec

## MODIFIED Requirements

### Requirement: Spec detail TOC sidebar
The spec detail page (`/specs/:topic`) SHALL display a sticky table-of-contents (TOC) sidebar listing all `h2` and `h3` headings of the spec content when the heading count is at least 3 and the viewport width is at least 1280px. The sidebar SHALL sit immediately beside the content column, not at the edge of the window. Each TOC entry SHALL be a clickable link that smooth-scrolls the main content to the corresponding heading. `h3` entries SHALL be visually indented relative to `h2` entries.

#### Scenario: TOC visible for long spec
- **WHEN** user views a spec whose content contains 3 or more `h2`/`h3` headings on a viewport at least 1280px wide
- **THEN** a sticky TOC sidebar appears alongside the main content listing every `h2` and `h3` heading in document order

#### Scenario: TOC stays beside the content on a wide window
- **WHEN** the TOC is shown on a window wider than the content column's cap
- **THEN** the TOC sits next to the content column rather than at the far edge of the window

#### Scenario: TOC hidden for short spec
- **WHEN** user views a spec whose content contains fewer than 3 `h2`/`h3` headings
- **THEN** no TOC sidebar is rendered and the main content occupies the full available width, up to its cap

#### Scenario: TOC hidden on narrow viewport
- **WHEN** user views any spec on a viewport narrower than 1280px
- **THEN** the TOC sidebar is not rendered and the main content occupies the full available width, up to its cap

#### Scenario: Click TOC entry
- **WHEN** user clicks a TOC entry
- **THEN** the main content smooth-scrolls to the corresponding heading and the URL hash updates to that heading's slug

#### Scenario: Indented h3 entries
- **WHEN** the TOC contains both `h2` and `h3` entries
- **THEN** each `h3` entry is visually indented relative to its preceding `h2` entry
