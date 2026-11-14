import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  deriveSpecRelations,
  visibleRelations,
  type SpecContent,
  type SpecRelations,
} from "./spec-relations.js";
import { buildGraphData } from "./scanner.js";
import { discoverSpecFiles } from "./spec-files.js";
import type { GraphData } from "./types.js";

const NO_GRAPH: GraphData = { nodes: [], edges: [] };

function specs(...pairs: [string, string][]): SpecContent[] {
  return pairs.map(([topic, content]) => ({ topic, content }));
}

function specNode(topic: string) {
  return { id: `spec:${topic}`, type: "spec" as const, label: topic };
}

/** A graph where each named change modified the given topics. */
function graphOf(changes: Record<string, string[]>, topics: string[]): GraphData {
  return {
    nodes: topics.map(specNode),
    edges: Object.entries(changes).flatMap(([id, ts]) =>
      ts.map((t) => ({ source: `change:${id}`, target: `spec:${t}` })),
    ),
  };
}

function refs(r: SpecRelations): string[] {
  return r.references.map((x) => `${x.from}>${x.to}`);
}

test("a topic named in prose is a reference, directed from the naming spec", () => {
  const r = deriveSpecRelations({
    specs: specs(["live-reload", "Works with worktree-aggregation."], ["worktree-aggregation", "No mention."]),
    graph: NO_GRAPH,
  });
  assert.deepEqual(refs(r), ["live-reload>worktree-aggregation"]);
});

test("a spec naming itself is not a reference", () => {
  const r = deriveSpecRelations({ specs: specs(["search-ui", "search-ui is the UI."]), graph: NO_GRAPH });
  assert.deepEqual(r.references, []);
});

test("a prefix of a longer topic does not match", () => {
  const r = deriveSpecRelations({
    specs: specs(["a", "see search-semantics"], ["search", ""], ["search-semantics", ""]),
    graph: NO_GRAPH,
  });
  assert.deepEqual(refs(r), ["a>search-semantics"]);
});

test("surrounding punctuation and link targets do not hide a topic", () => {
  for (const text of ["`spec-diff`", "(spec-diff)", "spec-diff.", "[x](../spec-diff/spec.md)"]) {
    const r = deriveSpecRelations({ specs: specs(["a", text], ["spec-diff", ""]), graph: NO_GRAPH });
    assert.deepEqual(refs(r), ["a>spec-diff"], text);
  }
});

test("a nested topic matches by its full path only", () => {
  const r = deriveSpecRelations({
    specs: specs(["a", "uses streaming-search"], ["contracts/pagination/streaming-search", ""]),
    graph: NO_GRAPH,
  });
  assert.deepEqual(r.references, []);
  const full = deriveSpecRelations({
    specs: specs(["a", "uses contracts/pagination/streaming-search"], ["contracts/pagination/streaming-search", ""]),
    graph: NO_GRAPH,
  });
  assert.deepEqual(refs(full), ["a>contracts/pagination/streaming-search"]);
});

test("a parent is not matched inside its child's path", () => {
  const r = deriveSpecRelations({
    specs: specs(
      ["a", "see contracts/pagination/streaming-search"],
      ["contracts/pagination", ""],
      ["contracts/pagination/streaming-search", ""],
    ),
    graph: NO_GRAPH,
  });
  assert.deepEqual(refs(r), ["a>contracts/pagination/streaming-search"]);
});

test("regex metacharacters in a topic are literal", () => {
  const r = deriveSpecRelations({ specs: specs(["a", "see x.y"], ["x.y", ""], ["xzy", ""]), graph: NO_GRAPH });
  assert.deepEqual(refs(r), ["a>x.y"]);
});

test("a reference is directed", () => {
  const r = deriveSpecRelations({
    specs: specs(["ui-package", "built on core-module"], ["core-module", "standalone"]),
    graph: NO_GRAPH,
  });
  assert.deepEqual(refs(r), ["ui-package>core-module"]);
});

test("weight counts the changes that modified both specs", () => {
  const topics = ["change-browsing", "openspec-scanner"];
  const g = graphOf(
    { c1: topics, c2: topics, c3: topics },
    topics,
  );
  const r = deriveSpecRelations({ specs: specs(...topics.map((t): [string, string] => [t, ""])), graph: g });
  assert.deepEqual(r.changedTogether, [{ a: "change-browsing", b: "openspec-scanner", weight: 3 }]);
});

test("a change touching one spec relates nothing; three specs relate every pair", () => {
  const topics = ["a", "b", "c"];
  const sp = specs(...topics.map((t): [string, string] => [t, ""]));
  assert.deepEqual(
    deriveSpecRelations({ specs: sp, graph: graphOf({ one: ["a"] }, topics) }).changedTogether,
    [],
  );
  const r = deriveSpecRelations({ specs: sp, graph: graphOf({ all: topics }, topics) });
  assert.deepEqual(
    r.changedTogether.map((c) => `${c.a}-${c.b}:${c.weight}`),
    ["a-b:1", "a-c:1", "b-c:1"],
  );
});

test("the same change listing a spec twice counts once", () => {
  const g = graphOf({ c: ["a", "b", "a"] }, ["a", "b"]);
  const r = deriveSpecRelations({ specs: specs(["a", ""], ["b", ""]), graph: g });
  assert.equal(r.changedTogether[0].weight, 1);
});

test("a topic outside the supplied specs takes part in no relation", () => {
  const g = graphOf({ c: ["a", "ghost"] }, ["a"]);
  const r = deriveSpecRelations({ specs: specs(["a", ""]), graph: g });
  assert.deepEqual(r.changedTogether, []);
});

test("an aggregated change counts once however many worktrees hold it", () => {
  // One node per deduplicated change, whatever its namespace.
  const g = graphOf({ "wt1:add-foo": ["a", "b"] }, ["a", "b"]);
  const r = deriveSpecRelations({ specs: specs(["a", ""], ["b", ""]), graph: g });
  assert.equal(r.changedTogether[0].weight, 1);
});

test("typed edges are not read as a change touching a spec", () => {
  const g: GraphData = {
    nodes: [specNode("a"), specNode("b")],
    edges: [{ source: "spec:a", target: "spec:b", kind: "references" }],
  };
  const r = deriveSpecRelations({ specs: specs(["a", ""], ["b", ""]), graph: g });
  assert.deepEqual(r.changedTogether, []);
});

test("order of input does not change the result", () => {
  const sp = specs(["a", "b c"], ["b", "a"], ["c", "a b"]);
  const g = graphOf({ x: ["a", "b", "c"], y: ["b", "c"] }, ["a", "b", "c"]);
  const forward = deriveSpecRelations({ specs: sp, graph: g });
  const reversed = deriveSpecRelations({
    specs: [...sp].reverse(),
    graph: { nodes: [...g.nodes].reverse(), edges: [...g.edges].reverse() },
  });
  assert.deepEqual(reversed, forward);
});

test("a repository with no relationships yields none and does not fail", () => {
  const r = deriveSpecRelations({ specs: specs(["a", "x"], ["b", "y"]), graph: NO_GRAPH });
  assert.deepEqual(r, { references: [], changedTogether: [] });
  assert.deepEqual(deriveSpecRelations({ specs: [], graph: NO_GRAPH }), { references: [], changedTogether: [] });
});

const REL: SpecRelations = {
  references: [{ from: "a", to: "b" }],
  changedTogether: [
    { a: "a", b: "c", weight: 1 },
    { a: "c", b: "d", weight: 3 },
  ],
};
const ALL = [{ topic: "a" }, { topic: "b" }, { topic: "c" }, { topic: "d" }, { topic: "e" }];

test("visibleRelations: the default threshold drops weight-1 edges and omits the isolated", () => {
  const v = visibleRelations(REL, ALL, { references: true, changedTogether: true, minWeight: 2 });
  assert.deepEqual(v.data.edges.map((e) => `${e.kind}:${e.source}>${e.target}`), [
    "references:spec:a>spec:b",
    "changed-together:spec:c>spec:d",
  ]);
  assert.deepEqual(v.data.nodes.map((n) => n.id), ["spec:a", "spec:b", "spec:c", "spec:d"]);
  assert.equal(v.omitted, 1);
});

test("visibleRelations: lowering the threshold brings a spec back", () => {
  const v = visibleRelations(REL, ALL.slice(0, 4), { references: false, changedTogether: true, minWeight: 1 });
  assert.deepEqual(v.data.nodes.map((n) => n.id), ["spec:a", "spec:c", "spec:d"]);
  assert.equal(v.omitted, 1);
});

test("visibleRelations: references ignore the threshold, and a hidden kind keeps no spec visible", () => {
  const v = visibleRelations(REL, ALL, { references: true, changedTogether: false, minWeight: 99 });
  assert.deepEqual(v.data.nodes.map((n) => n.id), ["spec:a", "spec:b"]);
  assert.equal(v.omitted, 3);
  const none = visibleRelations(REL, ALL, { references: false, changedTogether: false, minWeight: 1 });
  assert.deepEqual(none.data, { nodes: [], edges: [] });
  assert.equal(none.omitted, 5);
});

test("visibleRelations: historyCount is carried when given, absent when not", () => {
  const v = visibleRelations(REL, [{ topic: "a", historyCount: 4 }, { topic: "b" }], {
    references: true, changedTogether: false, minWeight: 1,
  });
  assert.equal(v.data.nodes[0].historyCount, 4);
  assert.equal("historyCount" in v.data.nodes[1], false);
});

test("this repository: the derivation runs over real specs and finds both kinds", () => {
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  const specsDir = path.join(repo, "openspec", "specs");
  const list = discoverSpecFiles(specsDir).map(({ topic, file }) => ({
    topic,
    content: readFileSync(file, "utf-8"),
  }));
  const r = deriveSpecRelations({ specs: list, graph: buildGraphData(repo) });
  assert.ok(list.length > 10);
  assert.ok(r.references.length > 0, "references");
  assert.ok(r.changedTogether.length > 0, "changed together");
});
