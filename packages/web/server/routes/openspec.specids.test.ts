import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { openspecRouter } from "./openspec.js";

let server: Server;
let base: string;
const tempRepos: string[] = [];

before(async () => {
  const app = express();
  app.use("/api/openspec", openspecRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  for (const repo of tempRepos) fs.rmSync(repo, { recursive: true, force: true });
});

function tempRepo(files: Record<string, string>): string {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "spek-specids-test-"));
  tempRepos.push(repo);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(repo, "openspec", rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return repo;
}

const get = (repo: string, extra = "") =>
  fetch(`${base}/api/openspec/spec-ids?dir=${encodeURIComponent(repo)}${extra}`);

test("a repository with identifiers returns each declaration with topic, anchor, title and text", async () => {
  const repo = tempRepo({
    "specs/a/spec.md": "### Requirement: PRS-004 Parse\nThe system SHALL parse.\n",
    "spec-ids.yaml": "retired:\n  - id: MDL-004\n    reason: Moved.\n    replaced_by: PRS-004\n",
  });
  const res = await get(repo);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { entries: Record<string, Record<string, unknown>>; retired: Record<string, unknown> };
  assert.equal(body.entries["PRS-004"].topic, "a");
  assert.equal(body.entries["PRS-004"].anchor, "requirement-prs-004-parse");
  assert.equal(body.entries["PRS-004"].title, "Parse");
  assert.equal(body.entries["PRS-004"].text, "The system SHALL parse.");
  assert.deepEqual(body.retired["MDL-004"], { id: "MDL-004", reason: "Moved.", replacedBy: "PRS-004" });
});

test("a repository without identifiers is an empty index, not an error", async () => {
  const repo = tempRepo({ "specs/a/spec.md": "### Requirement: Plain\nx\n" });
  const res = await get(repo);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { entries: {}, retired: {} });
});

test("at layers a change's delta over main", async () => {
  const repo = tempRepo({
    "specs/a/spec.md": "### Requirement: PRS-004 Parse\nMain.\n",
    "changes/c1/specs/a/spec.md": "### Requirement: PRS-004 Parse\nDelta.\n",
  });
  const body = (await (await get(repo, "&at=c1")).json()) as { entries: Record<string, { text: string; source: string }> };
  assert.equal(body.entries["PRS-004"].text, "Delta.");
  assert.equal(body.entries["PRS-004"].source, "change");
});

test("an unsafe at is refused as other change routes refuse it", async () => {
  const repo = tempRepo({ "specs/a/spec.md": "x" });
  assert.equal((await get(repo, "&at=..%2Fx")).status, 400);
  assert.equal((await get(repo, "&at=a&at=b")).status, 400);
});

test("a missing dir is refused like every other openspec route", async () => {
  const res = await fetch(`${base}/api/openspec/spec-ids`);
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: "dir parameter is required" });
});
