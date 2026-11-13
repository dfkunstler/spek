## ADDED Requirements

### Requirement: Optional spec identifier index
`ApiAdapter` SHALL offer an optional `getSpecIds(changeSlug?)` method returning the identifier index. `FetchAdapter` SHALL implement it against the endpoint. An adapter that omits it SHALL leave the UI without identifier links and without error.

#### Scenario: FetchAdapter
- **WHEN** the web app asks `FetchAdapter` for the index
- **THEN** it calls `/api/openspec/spec-ids` with the repository `dir` and, for a change, `at`

#### Scenario: Adapter without the method
- **WHEN** the active adapter does not define `getSpecIds`
- **THEN** spec text renders without links
