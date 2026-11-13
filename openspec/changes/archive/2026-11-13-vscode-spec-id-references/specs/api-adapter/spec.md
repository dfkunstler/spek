## ADDED Requirements

### Requirement: MessageAdapter supplies the spec identifier index
`MessageAdapter` SHALL implement the optional `getSpecIds(changeSlug?)` method by requesting `getSpecIds` from the extension host, so the VS Code webview resolves spec identifier citations.

#### Scenario: Request without a change
- **WHEN** the webview asks `MessageAdapter` for the index with no slug
- **THEN** it sends `getSpecIds` to the host with no slug and resolves with the reply

#### Scenario: Request with a change
- **WHEN** the webview asks for the index with a change slug
- **THEN** the slug is sent in the request
