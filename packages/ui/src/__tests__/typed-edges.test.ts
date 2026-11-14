import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * How `SpecGraph` draws an edge of a stated kind, asserted against the source — the suite has no DOM, and
 * what matters here is which attribute each kind is given, not where a simulation puts it. The geometry
 * itself (arc, end point, width) is asserted on the pure functions in `edge-geometry.test.ts`.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, "..", "SpecGraph.tsx"), "utf-8");
const css = readFileSync(path.join(here, "..", "styles.css"), "utf-8");

const edges = src.slice(src.indexOf('.attr("class", "links")'), src.indexOf("// Node groups"));

test("an untyped edge keeps its solid 1.5px line", () => {
  assert.match(edges, /\.attr\("stroke-width", \(l\) => \(l\.kind === "changed-together" \? weightWidth\(l\.weight\) : 1\.5\)\)/);
  assert.match(edges, /stroke-dasharray", \(l\) => \(l\.kind === "changed-together"/);
  assert.match(src, /l\.kind === "references" \? `url\(#\$\{markerId\(state\)\}\)` : null/);
});

test("only a references edge gets an arrowhead and an arc", () => {
  assert.match(src, /l\.kind === "references"\s*\?\s*arcPath\(l\.source, l\.target, nodeRadius\(l\.target\)\)\s*:\s*straightPath/);
});

test("the arrowhead has a state for rest, hover-lit and dimmed, and hover swaps them", () => {
  assert.match(src, /\["rest", "lit", "dim"\] as const/);
  const enter = src.slice(src.indexOf('.on("mouseenter"'), src.indexOf('.on("mouseleave"'));
  const leave = src.slice(src.indexOf('.on("mouseleave"'), src.indexOf("// Click"));
  assert.match(enter, /marker-end", \(l\) => markerEnd\(l, touches\(l\) \? "lit" : "dim"\)/);
  assert.match(leave, /marker-end", \(l\) => markerEnd\(l, "rest"\)/);
});

test("marker ids are unique per graph instance", () => {
  assert.match(src, /useId\(\)/);
  assert.match(src, /spekui-arrow-\$\{uid\}-\$\{state\}/);
});

test("arrowheads and legend samples take their colour from the contract", () => {
  assert.match(src, /rest: \[edgeColor, EDGE_OPACITY\]/);
  assert.match(src, /lit: \[edgeHighlight, 0\.9\]/);
  const legend = css.slice(css.indexOf(".spekui-legend-edge-line"));
  assert.match(legend, /stroke: var\(--spek-text-muted\)/);
  assert.match(legend, /fill: var\(--spek-text-muted\)/);
});

test("the legend lists change entries only when there are change nodes", () => {
  assert.match(src, /const hasChange = data\.nodes\.some\(\(n\) => n\.type === "change"\)/);
  assert.match(src, /\{hasChange && \(/);
});

test("the legend samples each edge kind the data holds, with the edge's own style", () => {
  assert.match(src, /kinds\.has\("references"\)/);
  assert.match(src, /kinds\.has\("changed-together"\)/);
  const dashed = src.slice(src.indexOf('kinds.has("changed-together")'));
  assert.match(dashed, /strokeDasharray=\{CHANGED_TOGETHER_DASH\}/);
});
