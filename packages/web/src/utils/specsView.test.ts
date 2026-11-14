import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_FILTER,
  omittedSentence,
  parseGraphMode,
  parseMinWeight,
  specsViewState,
  unreadableSentence,
} from "./specsView";
import type { SpecRelations } from "@spekjs/core/spec-relations";

const REL: SpecRelations = {
  references: [{ from: "a", to: "b" }],
  changedTogether: [{ a: "c", b: "d", weight: 1 }],
};
const SPECS = ["a", "b", "c", "d", "e"].map((topic) => ({ topic }));

test("mode: only ?mode=specs selects Specs mode", () => {
  assert.equal(parseGraphMode("specs"), "specs");
  for (const v of [null, "", "changes", "Specs", "spec"]) assert.equal(parseGraphMode(v), "changes");
});

test("the default minimum is 2 and an unusable value falls back to it", () => {
  assert.equal(DEFAULT_FILTER.minWeight, 2);
  assert.equal(parseMinWeight("3"), 3);
  for (const v of ["", "0", "-1", "abc"]) assert.equal(parseMinWeight(v), 2);
});

test("default filter hides a weight-1 pair and counts the isolated specs", () => {
  const s = specsViewState(REL, SPECS, DEFAULT_FILTER);
  assert.equal(s.kind, "ready");
  if (s.kind === "ready") {
    assert.deepEqual(s.data.nodes.map((n) => n.id), ["spec:a", "spec:b"]);
    assert.equal(s.omitted, 3);
  }
});

test("lowering the threshold restores the pair", () => {
  const s = specsViewState(REL, SPECS, { ...DEFAULT_FILTER, minWeight: 1 });
  assert.equal(s.kind === "ready" && s.data.nodes.length, 4);
});

test("both kinds off is its own state, not an empty graph", () => {
  assert.deepEqual(
    specsViewState(REL, SPECS, { references: false, changedTogether: false, minWeight: 1 }),
    { kind: "no-kinds" },
  );
});

test("nothing to draw is reported as empty", () => {
  const s = specsViewState({ references: [], changedTogether: [] }, SPECS, DEFAULT_FILTER);
  assert.deepEqual(s, { kind: "empty", omitted: 5 });
});

test("sentences agree with their counts", () => {
  assert.equal(omittedSentence(0), null);
  assert.equal(omittedSentence(1), "1 spec has no visible relationships");
  assert.equal(omittedSentence(12), "12 specs have no visible relationships");
  assert.equal(unreadableSentence(0), null);
  assert.match(unreadableSentence(1)!, /^1 spec could not be read, so references from it are missing$/);
  assert.match(unreadableSentence(3)!, /^3 specs could not be read, so references from them are missing$/);
});
