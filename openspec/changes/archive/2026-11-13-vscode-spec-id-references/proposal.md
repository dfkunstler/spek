# Proposal

## Why

Spec identifier citations link and preview on the web app (`spec-id-references`), but the VS Code webview shows them as plain text. The webview runs the same SPA, and its adapter has no way to ask the extension host for the identifier index, so the feature stays off in the host where specs are most often read.

## What Changes

1. The extension host answers a `getSpecIds` request with the identifier index of the workspace, optionally layered with one change's delta specs, using the same rule and builder as the web server.
2. `MessageAdapter` implements the optional `getSpecIds` method, so the webview shows citation links and hover previews exactly as the web app does.
3. Found while verifying in a real VS Code: the hover preview, fixed to the viewport, stayed where it opened after a page scroll and floated away from its citation. It now closes on scroll or resize, and not when its own content scrolls. The component is shared, so the web app gets the fix too.
4. A change slug the host cannot treat as one safe slug is refused, as other host requests refuse it.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `vscode-extension-host`: the message handler answers the identifier index request.
- `api-adapter`: `MessageAdapter` implements the optional identifier index method.
- `spec-id-references`: the preview closes on page scroll or resize.

## Impact

- `packages/vscode/src/handler.ts` and `packages/web/src/api/MessageAdapter.ts`, plus their tests. No change to `@spekjs/core`, the SPA, or colour tokens.
- Same limitation as the web app: a change that exists only in another worktree is not found by slug, so its delta citations do not resolve; main citations still do.
- The webview's Content-Security-Policy is unchanged: the preview is a portalled element in the same document, with no new script, style or network source.
- Out of scope, each its own follow-up: the demo (`StaticAdapter`) and IntelliJ (a Kotlin mirror).
- Release time, not here: CHANGELOGs and version bumps.
