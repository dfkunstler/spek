## MODIFIED Requirements

### Requirement: Citations preview their target
The system SHALL show the target's text, rendered as Markdown, when a resolved citation is hovered or focused: a requirement's statement, or a scenario's WHEN/THEN lines. The preview SHALL be reachable by keyboard, SHALL be dismissible with Escape, and SHALL NOT trap focus. The preview SHALL close when the page scrolls or resizes, because it does not follow its citation; scrolling the preview's own content SHALL NOT close it.

#### Scenario: Hover shows the requirement
- **WHEN** the reader hovers a citation of a requirement
- **THEN** the requirement's title and statement appear

#### Scenario: Focus shows the scenario
- **WHEN** the reader focuses a citation of a scenario with the keyboard
- **THEN** the scenario's title and its WHEN/THEN lines appear, and Escape hides them

#### Scenario: Page scroll closes the preview
- **WHEN** a preview is open and the page scrolls
- **THEN** the preview closes instead of staying where the citation used to be

#### Scenario: Scrolling the preview itself
- **WHEN** a preview is open and the reader scrolls the preview's own content
- **THEN** the preview stays open
