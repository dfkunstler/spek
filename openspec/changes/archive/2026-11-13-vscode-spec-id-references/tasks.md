# Tasks

## 1. Host and adapter

- [x] 1.1 Add a `getSpecIds` case to `packages/vscode/src/handler.ts` that calls `readSpecIdIndex(this.workspacePath, slug)` and throws when `slug` is present and not a string. Verify with handler tests: workspace index, index with a change slug (delta replaces main), workspace without identifiers is empty, a non-string slug is refused.
- [x] 1.2 Add `getSpecIds(changeSlug?)` to `packages/web/src/api/MessageAdapter.ts`. Verify with an adapter test that the request carries the method name and slug, and that the existing optional-method assertion in `FetchAdapter.specIds.test.ts` is updated, since `MessageAdapter` now defines it.

## 2. Verification

- [x] 2.1 Run `npm run type-check`, `npm run lint` and `npm test`, and `npm run build:webview -w @spekjs/web`; verify all pass.
- [x] 2.2 With the `verify-vscode` skill, open a workspace that uses identifiers (`oscal-bindings-specs`) in a real VS Code, and verify citations render as links, the hover preview shows and is not clipped, a retired citation shows its reason, and a link click stays in the panel. Repeat the click check in the browser-hosted mode. Verified in browser-hosted VS Code 1.139.1 (macOS, headless Chrome): citations render, preview shows and is inside the viewport in the light theme, the retired preview shows reason and replacement, and a click navigates within the panel with the browser's page targets unchanged. The scroll-detach defect found there is fixed (design.md).

## Workflow follow-up

- `/opsx:archive`, then update `CLAUDE.md` (the web-only note becomes "web and VS Code").
- Follow-ups: demo (`StaticAdapter`), IntelliJ (Kotlin mirror).
