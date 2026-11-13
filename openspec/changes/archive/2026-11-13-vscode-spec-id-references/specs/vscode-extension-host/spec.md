## ADDED Requirements

### Requirement: Spec identifier index request
The message handler SHALL answer a `getSpecIds` request with the identifier index of the workspace, as the web server's `/api/openspec/spec-ids` route does. When the request carries a change slug, the change's delta specs SHALL be layered over the main specs. A slug that is not a single string SHALL be refused with an error.

#### Scenario: Index for the workspace
- **WHEN** the webview sends `getSpecIds` with no slug
- **THEN** the host replies with the identifiers declared in the workspace's main specs and its retired identifiers

#### Scenario: Index with a change
- **WHEN** the webview sends `getSpecIds` with the slug of a change whose delta declares an identifier
- **THEN** the reply includes that identifier, and a delta declaration replaces a main one of the same identifier

#### Scenario: Workspace without identifiers
- **WHEN** no heading in the workspace carries an identifier
- **THEN** the reply is an empty index and not an error

#### Scenario: Invalid slug
- **WHEN** the request carries a slug that is not a string
- **THEN** the host replies with an error
