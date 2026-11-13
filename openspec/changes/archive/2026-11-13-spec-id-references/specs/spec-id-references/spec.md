# Spec Delta

## Purpose

Lets a reader follow a citation of a permanent requirement or scenario identifier to its target and read the target without leaving the page, including when the target has been retired.

## ADDED Requirements

### Requirement: Identifier declaration
The system SHALL treat a `Requirement:` or `Scenario:` heading whose text begins with an identifier as declaring it. An identifier is an uppercase prefix of letters and digits that starts with a letter, a hyphen and three or more digits, and for a scenario a `.` and two or more digits. The identifier MAY be wrapped in square brackets.

#### Scenario: Bare identifier
- **WHEN** a spec has the heading `### Requirement: BMB-001 Build a hash`
- **THEN** `BMB-001` is declared as a requirement titled "Build a hash"

#### Scenario: Bracketed identifier
- **WHEN** a spec has the heading `#### Scenario: [ACCESS-001.02] Unauthorized query is denied`
- **THEN** `ACCESS-001.02` is declared as a scenario

#### Scenario: Heading without an identifier
- **WHEN** no requirement or scenario heading in the repository begins with an identifier
- **THEN** no citation is linked and rendering is unchanged

### Requirement: Citations resolve to links
The system SHALL turn a citation whose label is exactly a declared identifier — `[ID]` or `[ID](target)` — in requirement or scenario text into a link to that requirement or scenario on its spec page. A citation SHALL NOT be linked in a heading or in code. A label that is not a declared or retired identifier SHALL be left as written.

#### Scenario: Bare citation
- **WHEN** a requirement's text contains `[BMB-003]` and `BMB-003` is declared
- **THEN** the citation is a link to that requirement on its spec page

#### Scenario: Existing relative link
- **WHEN** the text contains `[INGEST-005](../artifact-ingestion/spec.md)` and `INGEST-005` is declared
- **THEN** the link goes to the requirement in the app instead of the relative path

#### Scenario: Unknown label
- **WHEN** the text contains `[TODO-123]` and that identifier is not declared or retired
- **THEN** it renders as the text `[TODO-123]`

#### Scenario: Citation in a heading or code
- **WHEN** a declared identifier appears in square brackets in a heading or in a code span
- **THEN** it is not linked

### Requirement: Citations preview their target
The system SHALL show the target's text, rendered as Markdown, when a resolved citation is hovered or focused: a requirement's statement, or a scenario's WHEN/THEN lines. The preview SHALL be reachable by keyboard, SHALL be dismissible with Escape, and SHALL NOT trap focus.

#### Scenario: Hover shows the requirement
- **WHEN** the reader hovers a citation of a requirement
- **THEN** the requirement's title and statement appear

#### Scenario: Focus shows the scenario
- **WHEN** the reader focuses a citation of a scenario with the keyboard
- **THEN** the scenario's title and its WHEN/THEN lines appear, and Escape hides them

### Requirement: Retired identifiers
The system SHALL treat an identifier recorded as retired as a known identifier that has no target. A citation of it SHALL NOT be a link; its hover SHALL say it is retired and give the recorded reason, and SHALL link the replacement when one is recorded and resolves. Retirement is read from the `retired:` list of `openspec/spec-ids.yaml` and from a `## Relocated and Retired IDs` table in a main spec. A declared identifier SHALL take precedence over a retired record of the same identifier.

#### Scenario: Retired with a replacement
- **WHEN** `MDL-004` is retired with `replaced_by: MDL-013` and a spec cites `[MDL-004]`
- **THEN** the citation is not a link and its hover says retired, gives the reason, and links `MDL-013`

#### Scenario: Retired without a replacement
- **WHEN** a retired identifier records a reason and no replacement
- **THEN** the hover gives the reason and offers no link

#### Scenario: Table convention
- **WHEN** a main spec has a `## Relocated and Retired IDs` table row `| META-006 | relocated | RETAIN-002 |`
- **THEN** `META-006` is retired with status relocated, and `RETAIN-002` is its replacement

#### Scenario: Malformed ledger
- **WHEN** `openspec/spec-ids.yaml` cannot be parsed
- **THEN** no retired records come from it, and declared identifiers still link

### Requirement: Resolution scope
The system SHALL resolve citations against the main specs, and, when a change is being viewed, against that change's delta specs as well. For an identifier declared in both, the delta SHALL be used.

#### Scenario: Identifier introduced by the change
- **WHEN** a change's delta spec declares `PRS-015` that main does not
- **THEN** a citation of `PRS-015` in that change's Specs tab resolves to the delta

#### Scenario: Modified requirement
- **WHEN** a change's delta and main both declare `PRS-004`
- **THEN** the preview in that change's Specs tab shows the delta's text

### Requirement: Hosts without an index
A host whose adapter provides no identifier index SHALL render spec text exactly as it did before this capability.

#### Scenario: No index available
- **WHEN** the adapter has no way to supply an identifier index
- **THEN** citations render as plain text and no error is shown
