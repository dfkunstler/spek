import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSpecIdIndex,
  parseRetiredTable,
  parseSpecIdDeclarations,
  splitCitations,
  isSpecId,
} from "./spec-ids.js";

const decl = (content: string) => parseSpecIdDeclarations("cap", content, "main");

test("a bare identifier in a requirement heading is declared", () => {
  const [e] = decl("### Requirement: BMB-001 Build a hash\nThe system SHALL build.\n");
  assert.equal(e.id, "BMB-001");
  assert.equal(e.kind, "requirement");
  assert.equal(e.title, "Build a hash");
  assert.equal(e.text, "The system SHALL build.");
});

test("a bracketed identifier is declared, in a scenario too", () => {
  const entries = decl(
    "### Requirement: [ACCESS-001] Deny\nBody.\n\n#### Scenario: [ACCESS-001.02] Query denied\n- **WHEN** a\n- **THEN** b\n",
  );
  assert.deepEqual(entries.map((e) => [e.id, e.kind]), [
    ["ACCESS-001", "requirement"],
    ["ACCESS-001.02", "scenario"],
  ]);
  assert.equal(entries[1].title, "Query denied");
  assert.match(entries[1].text, /WHEN.*\n- \*\*THEN/);
});

test("a requirement's text stops at its first scenario", () => {
  const [req] = decl("### Requirement: X-001 T\nStatement.\n\n#### Scenario: X-001.01 S\n- **WHEN** a\n");
  assert.equal(req.text, "Statement.");
});

test("identifier shapes: long prefixes and wide sub-sequences pass, short ones do not", () => {
  assert.deepEqual(
    decl("### Requirement: PCLAIM-001 A\n#### Scenario: INGEST-017.07 B\n### Requirement: TODO-1 C\n").map((e) => e.id),
    ["PCLAIM-001", "INGEST-017.07"],
  );
  assert.equal(isSpecId("lower-001"), false);
  assert.equal(isSpecId("BMB-001.1"), false);
});

test("the kind follows the shape: a scenario heading without a sub-sequence declares nothing", () => {
  assert.deepEqual(decl("#### Scenario: BMB-001 Oops\n### Requirement: BMB-002.01 Oops\n"), []);
});

test("a heading without an identifier, or an identifier fused to text, declares nothing", () => {
  assert.deepEqual(decl("### Requirement: Plain title\n### Requirement: BMB-001x Fused\n"), []);
});

test("a heading inside a code fence declares nothing", () => {
  assert.deepEqual(decl("```md\n### Requirement: BMB-001 Quoted\n```\n"), []);
});

test("the anchor is the one the renderer gives the heading, and a scenario takes its requirement's", () => {
  const entries = decl(
    "## Purpose\n\n### Requirement: [A-001] One\nx\n#### Scenario: [A-001.01] s\ny\n### Requirement: [A-002] Two\n",
  );
  assert.equal(entries[0].anchor, "requirement-a-001-one");
  assert.equal(entries[1].anchor, "requirement-a-001-one");
  assert.equal(entries[2].anchor, "requirement-a-002-two");
});

test("keyword case is not significant, matching the renderer's own rule", () => {
  assert.equal(decl("### requirement: BMB-001 T\n").length, 1);
});

test("the retirement table is read under its heading only", () => {
  const rows = parseRetiredTable(
    "## Other\n| META-009 | x | y |\n\n## Relocated and Retired IDs\n\n| ID | Status | Resolves to |\n|---|---|---|\n| META-006 | relocated | RETAIN-002 |\n| META-007 | withdrawn | |\n\n## After\n| META-010 | x | y |\n",
  );
  assert.deepEqual(rows, [
    { id: "META-006", status: "relocated", replacedBy: "RETAIN-002" },
    { id: "META-007", status: "withdrawn" },
  ]);
});

test("the table accepts brackets, code spans and links around an identifier", () => {
  const [row] = parseRetiredTable(
    "## Relocated and Retired IDs\n| `[META-006]` | relocated | [RETAIN-002](../r/spec.md) |\n",
  );
  assert.deepEqual(row, { id: "META-006", status: "relocated", replacedBy: "RETAIN-002" });
});

test("citations split out of text, and only an exact identifier label counts", () => {
  assert.deepEqual(splitCitations("as in [BMB-003] and [TODO-1], see [A-001.02]."), [
    { type: "text", value: "as in " },
    { type: "citation", value: "[BMB-003]", id: "BMB-003" },
    { type: "text", value: " and [TODO-1], see " },
    { type: "citation", value: "[A-001.02]", id: "A-001.02" },
    { type: "text", value: "." },
  ]);
});

test("a declared identifier wins over a retired record, and a later part wins over an earlier one", () => {
  const main = parseSpecIdDeclarations("a", "### Requirement: X-001 Main\nmain\n", "main");
  const delta = parseSpecIdDeclarations("a", "### Requirement: X-001 Delta\ndelta\n", "change");
  const index = buildSpecIdIndex({
    declarations: [main, delta],
    retired: [[{ id: "X-001", reason: "stale" }, { id: "X-002", reason: "gone" }]],
  });
  assert.equal(index.entries["X-001"].title, "Delta");
  assert.equal(index.entries["X-001"].source, "change");
  assert.equal(index.retired["X-001"], undefined);
  assert.equal(index.retired["X-002"].reason, "gone");
});

test("two sources recording one retirement are merged", () => {
  const index = buildSpecIdIndex({
    declarations: [],
    retired: [[{ id: "X-002", status: "relocated" }], [{ id: "X-002", reason: "moved" }]],
  });
  assert.deepEqual(index.retired["X-002"], { id: "X-002", status: "relocated", reason: "moved" });
});
