## ADDED Requirements

### Requirement: Spec identifier index endpoint
`GET /api/openspec/spec-ids?dir=…` SHALL return the identifiers declared in the repository's main specs, each with its kind, spec topic, heading anchor, title and text, and the retired identifiers with their reason, status and replacement. With `at=<change slug>` the change's delta specs SHALL be merged in and take precedence. The endpoint SHALL read only spec files and `openspec/spec-ids.yaml` under `openspec/`, and SHALL validate the change slug as it does for other routes.

#### Scenario: Repository with identifiers
- **WHEN** a client requests the index for a repository whose specs carry identifier headings
- **THEN** the response lists each declared identifier with its topic, anchor, title and text

#### Scenario: Repository without identifiers
- **WHEN** no heading carries an identifier and no retired record exists
- **THEN** the response is an empty index, not an error

#### Scenario: Unsafe change slug
- **WHEN** `at` is not a safe change slug
- **THEN** the request is refused as other change routes refuse it
