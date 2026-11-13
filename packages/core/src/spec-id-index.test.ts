import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readSpecIdIndex } from "./spec-id-index.js";

function repo(t: TestContext, files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spek-ids-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const [rel, text] of Object.entries(files)) {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  return dir;
}

const MAIN = "### Requirement: PRS-004 Parse\nMain text.\n\n#### Scenario: PRS-004.01 Bytes\n- **WHEN** a\n- **THEN** b\n";

test("a repository without identifiers has an empty index", (t) => {
  const dir = repo(t, { "openspec/specs/a/spec.md": "### Requirement: Plain\nx\n" });
  assert.deepEqual(readSpecIdIndex(dir), { entries: {}, retired: {} });
});

test("main specs declare, and nested topics keep their full path", (t) => {
  const dir = repo(t, { "openspec/specs/contracts/pagination/spec.md": MAIN });
  const index = readSpecIdIndex(dir);
  assert.equal(index.entries["PRS-004"].topic, "contracts/pagination");
  assert.equal(index.entries["PRS-004"].source, "main");
  assert.equal(index.entries["PRS-004.01"].kind, "scenario");
});

test("a change's delta takes precedence and adds new identifiers", (t) => {
  const dir = repo(t, {
    "openspec/specs/a/spec.md": MAIN,
    "openspec/changes/c1/specs/a/spec.md":
      "### Requirement: PRS-004 Parse\nDelta text.\n\n### Requirement: PRS-015 New\nNew.\n",
  });
  assert.equal(readSpecIdIndex(dir).entries["PRS-015"], undefined);
  const index = readSpecIdIndex(dir, "c1");
  assert.equal(index.entries["PRS-004"].text, "Delta text.");
  assert.equal(index.entries["PRS-004"].source, "change");
  assert.equal(index.entries["PRS-015"].source, "change");
});

test("an unsafe change slug adds nothing", (t) => {
  const dir = repo(t, { "openspec/specs/a/spec.md": MAIN, "openspec/changes/c1/specs/a/spec.md": "### Requirement: Z-001 Z\n" });
  assert.equal(readSpecIdIndex(dir, "../changes/c1").entries["Z-001"], undefined);
});

test("both retirement conventions are read", (t) => {
  const dir = repo(t, {
    "openspec/specs/a/spec.md": `${MAIN}\n## Relocated and Retired IDs\n\n| ID | Status | Resolves to |\n|---|---|---|\n| META-006 | relocated | PRS-004 |\n`,
    "openspec/spec-ids.yaml":
      "prefixes: {}\nretired:\n  - id: MDL-004\n    reason: >-\n      Folded\n      reason.\n    replaced_by: PRS-004\n  - id: FAC-001.02\n    reason: Gone.\n",
  });
  const { retired } = readSpecIdIndex(dir);
  assert.deepEqual(retired["META-006"], { id: "META-006", status: "relocated", replacedBy: "PRS-004" });
  assert.deepEqual(retired["MDL-004"], { id: "MDL-004", reason: "Folded reason.", replacedBy: "PRS-004" });
  assert.deepEqual(retired["FAC-001.02"], { id: "FAC-001.02", reason: "Gone." });
});

test("a ledger that cannot be parsed yields no retirements and does not hide declarations", (t) => {
  const dir = repo(t, { "openspec/specs/a/spec.md": MAIN, "openspec/spec-ids.yaml": "retired: [unclosed\n  - : :\n" });
  const index = readSpecIdIndex(dir);
  assert.deepEqual(index.retired, {});
  assert.ok(index.entries["PRS-004"]);
});

test("a ledger entry that is not an identifier is ignored", (t) => {
  const dir = repo(t, { "openspec/spec-ids.yaml": "retired:\n  - id: nope\n    reason: x\n  - 7\n" });
  assert.deepEqual(readSpecIdIndex(dir).retired, {});
});
