// The relations between specs, derived from content every host already serves.
//
// Pure logic with no Node import — it ships as the `@spekjs/core/spec-relations` subpath so the SPA, the
// static demo and a host's main process all compute the same answer (the arrangement `search.ts` and
// `spec-ids.ts` use). No host holds a copy: a second implementation is how issue #51 shipped four answers
// to one query.
//
// Two relations, because the repository states two different things:
//   - `references`       a spec's prose names another spec's topic. Directed; an authored statement.
//   - `changed-together` two specs are modified by the same change. Undirected, weighted; an observation.

import { compareCodeUnits } from "./spec-topic.js";
import type { GraphData, GraphEdge, GraphNode } from "./types.js";

export interface SpecContent {
  topic: string;
  content: string;
}

/** `from` names `to` in its prose. Both are full topic paths. */
export interface SpecReference {
  from: string;
  to: string;
}

/** `a` and `b` (`a` sorts first) were modified together by `weight` distinct changes. */
export interface SpecCoChange {
  a: string;
  b: string;
  weight: number;
}

export interface SpecRelations {
  references: SpecReference[];
  changedTogether: SpecCoChange[];
}

const SPEC_PREFIX = "spec:";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Every other spec whose full topic path appears in `content`, as a whole token.
 *
 * A boundary is a letter, digit, `-` or `_`: `search` is not found inside `search-semantics`. A path
 * separator is deliberately *not* one, so the topic inside `../spec-diff/spec.md` is found. The
 * alternation lists the longest topic first, so where a parent's path and its child's begin at the same
 * place the child wins and the parent is not also matched inside it.
 *
 * Case-sensitive: topics are lowercase kebab, and folding case would match the word "Search" in prose.
 */
function mentionedTopics(content: string, matcher: RegExp): Set<string> {
  const found = new Set<string>();
  for (const match of content.matchAll(matcher)) found.add(match[1]);
  return found;
}

function buildMatcher(topics: readonly string[]): RegExp | null {
  if (topics.length === 0) return null;
  const alternation = [...topics]
    .sort((a, b) => b.length - a.length || compareCodeUnits(a, b))
    .map(escapeRegExp)
    .join("|");
  return new RegExp(`(?<![A-Za-z0-9_-])(${alternation})(?![A-Za-z0-9_-])`, "g");
}

function specTopicOfNode(node: GraphNode): string | null {
  if (node.type !== "spec") return null;
  return node.id.startsWith(SPEC_PREFIX) ? node.id.slice(SPEC_PREFIX.length) : node.id;
}

/**
 * Derive both relations.
 *
 * `specs` is the universe: a topic outside it — a change adding a capability that has no main spec yet —
 * takes part in nothing. `graph` is the existing spec ↔ change data; a change is counted by its node id,
 * so under worktree aggregation, which already holds one node per deduplicated change, a change that
 * lives in two worktrees counts once.
 *
 * The result is ordered by code unit and independent of the order of the inputs.
 */
export function deriveSpecRelations(input: {
  specs: readonly SpecContent[];
  graph: GraphData;
}): SpecRelations {
  const topics = [...new Set(input.specs.map((s) => s.topic))].sort(compareCodeUnits);
  const known = new Set(topics);

  const references: SpecReference[] = [];
  for (const spec of [...input.specs].sort((x, y) => compareCodeUnits(x.topic, y.topic))) {
    const others = topics.filter((t) => t !== spec.topic);
    const matcher = buildMatcher(others);
    if (!matcher) continue;
    for (const to of [...mentionedTopics(spec.content, matcher)].sort(compareCodeUnits)) {
      references.push({ from: spec.topic, to });
    }
  }
  // Specs with the same topic (a caller's duplicate) must not double a reference.
  const seenRefs = new Set<string>();
  const uniqueReferences = references.filter((r) => {
    const key = `${r.from}\0${r.to}`;
    if (seenRefs.has(key)) return false;
    seenRefs.add(key);
    return true;
  });

  const nodeTopic = new Map<string, string>();
  for (const node of input.graph.nodes) {
    const topic = specTopicOfNode(node);
    if (topic !== null) nodeTopic.set(node.id, topic);
  }
  const touched = new Map<string, Set<string>>();
  for (const edge of input.graph.edges) {
    if (edge.kind !== undefined) continue; // only change → spec edges say what a change touched
    const topic = nodeTopic.get(edge.target) ?? (edge.target.startsWith(SPEC_PREFIX) ? edge.target.slice(SPEC_PREFIX.length) : null);
    if (topic === null || !known.has(topic)) continue;
    let set = touched.get(edge.source);
    if (!set) touched.set(edge.source, (set = new Set()));
    set.add(topic);
  }

  const weights = new Map<string, SpecCoChange>();
  for (const set of touched.values()) {
    const list = [...set].sort(compareCodeUnits);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const key = `${list[i]}\0${list[j]}`;
        const entry = weights.get(key);
        if (entry) entry.weight += 1;
        else weights.set(key, { a: list[i], b: list[j], weight: 1 });
      }
    }
  }
  const changedTogether = [...weights.values()].sort(
    (x, y) => compareCodeUnits(x.a, y.a) || compareCodeUnits(x.b, y.b),
  );

  return { references: uniqueReferences, changedTogether };
}

export interface RelationFilter {
  references: boolean;
  changedTogether: boolean;
  /** Changed-together edges lighter than this are dropped. References ignore it. */
  minWeight: number;
}

export interface VisibleRelations {
  /** Spec nodes that have a drawn edge, and those edges — ready for `SpecGraph`. */
  data: GraphData;
  /** Specs left out for having no drawn edge under this filter. */
  omitted: number;
}

/**
 * What the Specs-mode graph draws under a filter. A spec with no drawn edge is removed from the data
 * itself, not hidden in the SVG, so the layout does not make room for nodes nobody sees and the
 * `omitted` figure comes from the same pass that removed them.
 */
export function visibleRelations(
  relations: SpecRelations,
  specs: readonly { topic: string; historyCount?: number }[],
  filter: RelationFilter,
): VisibleRelations {
  const edges: GraphEdge[] = [];
  if (filter.references) {
    for (const r of relations.references) {
      edges.push({ source: SPEC_PREFIX + r.from, target: SPEC_PREFIX + r.to, kind: "references" });
    }
  }
  if (filter.changedTogether) {
    for (const c of relations.changedTogether) {
      if (c.weight < filter.minWeight) continue;
      edges.push({
        source: SPEC_PREFIX + c.a,
        target: SPEC_PREFIX + c.b,
        kind: "changed-together",
        weight: c.weight,
      });
    }
  }

  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  const nodes: GraphNode[] = [];
  let omitted = 0;
  for (const spec of [...specs].sort((x, y) => compareCodeUnits(x.topic, y.topic))) {
    const id = SPEC_PREFIX + spec.topic;
    if (!connected.has(id)) {
      omitted++;
      continue;
    }
    const node: GraphNode = { id, type: "spec", label: spec.topic };
    if (spec.historyCount !== undefined) node.historyCount = spec.historyCount;
    nodes.push(node);
  }
  return { data: { nodes, edges }, omitted };
}
