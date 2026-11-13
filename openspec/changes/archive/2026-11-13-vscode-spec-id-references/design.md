# Design

## Context

The web app resolves spec identifier citations through `ApiAdapter.getSpecIds`, an optional method; `FetchAdapter` implements it against `/api/openspec/spec-ids`. The VS Code extension host calls `@spekjs/core` directly and answers webview requests in `handler.ts`; `MessageAdapter` is the webview side. `readSpecIdIndex(repoDir, changeSlug?)` already lives in core and is exported from the package index. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Parity with the web app for citations in the webview, through the existing optional method.

**Non-Goals:**
- The demo and IntelliJ.
- Resolving a change that lives only in another worktree.

## Decisions

**A new handler case that calls core, not a route.** The host has no HTTP server; each request is a message. `handle("getSpecIds")` calls `readSpecIdIndex(this.workspacePath, slug)` as `search` calls `searchRepository`. No second implementation: the rule, the parser and the ledger reader stay in core.

**The handler checks the slug's type, core checks its safety.** `readSpecIdIndex` already treats an unsafe slug as adding nothing, so a path-like slug cannot reach the filesystem. The handler only refuses a non-string, matching how other cases coerce params, so a malformed message fails loudly instead of being read as "no change".

**`MessageAdapter.getSpecIds` is a plain method.** Unlike `FetchAdapter`, which leaves the method undefined for a host whose server lacks the route, this host always has it, so no option is needed.

**No timeout override.** The index is a pass over spec files (under 10 ms on 700+ identifiers) and does not call the OpenSpec CLI, so the default request budget applies, not the CLI-backed one.

**No CSP change.** The preview is a portalled element appended to the webview's own document and styled by existing classes. It adds no script, style or network source.

**The preview closes on page scroll and resize.** It is `position: fixed` at the viewport position its citation had when it opened, so a scroll left it floating: measured in a real VS Code, the citation moved 240px up and the preview stayed. Following the citation would need a scroll-linked position; closing is simpler and matches how a tooltip behaves. A scroll event from inside the preview is ignored, so a long preview can still be scrolled. This is shared code, so it applies to the web app as well.

## Risks / Trade-offs

- [The preview's fixed positioning behaves differently inside a webview than in a browser] → Checked in a real VS Code with the `verify-vscode` skill: popover not clipped, visible in the light theme, link clicks stay in the app.
- [Link clicks inside the webview reach the VS Code host (issue #59)] → Citations are React Router links, which `webviewLinkGuard` already blocks from the host; the browser-hosted mode is the one that reproduces the class, so it is the one to check.
- [A change only in another worktree] → Its delta citations do not resolve; main ones do. Same as the web app.
