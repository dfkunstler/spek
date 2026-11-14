import type { GraphData } from "@spekjs/core";
import {
  visibleRelations,
  type RelationFilter,
  type SpecRelations,
} from "@spekjs/core/spec-relations";
import { plural } from "./plural";

export type GraphMode = "changes" | "specs";

/** `?mode=specs` selects Specs mode; anything else — absent, misspelt — is the default view. */
export function parseGraphMode(value: string | null): GraphMode {
  return value === "specs" ? "specs" : "changes";
}

/** Changed-together edges lighter than this are not drawn until the reader lowers it. */
export const DEFAULT_MIN_WEIGHT = 2;

export const DEFAULT_FILTER: RelationFilter = {
  references: true,
  changedTogether: true,
  minWeight: DEFAULT_MIN_WEIGHT,
};

/** A minimum weight from a form control: a whole number of at least 1, else the default. */
export function parseMinWeight(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_MIN_WEIGHT;
}

export type SpecsViewState =
  | { kind: "no-kinds" }
  | { kind: "empty"; omitted: number }
  | { kind: "ready"; data: GraphData; omitted: number };

/**
 * What the Specs-mode page shows: nothing selected, nothing to draw, or a graph. The omitted count comes
 * from the pass that removed those specs, so the sentence under the graph cannot disagree with it.
 */
export function specsViewState(
  relations: SpecRelations,
  specs: readonly { topic: string; historyCount?: number }[],
  filter: RelationFilter,
): SpecsViewState {
  if (!filter.references && !filter.changedTogether) return { kind: "no-kinds" };
  const { data, omitted } = visibleRelations(relations, specs, filter);
  if (data.edges.length === 0) return { kind: "empty", omitted };
  return { kind: "ready", data, omitted };
}

/** "12 specs have no visible relationships", or null when none were left out. */
export function omittedSentence(omitted: number): string | null {
  if (omitted <= 0) return null;
  return `${omitted} ${plural(omitted, "spec has", "specs have")} no visible relationships`;
}

/** The note for specs that could not be read, or null. */
export function unreadableSentence(unreadable: number): string | null {
  if (unreadable <= 0) return null;
  return `${unreadable} ${plural(unreadable, "spec")} could not be read, so references from ${plural(unreadable, "it", "them")} are missing`;
}
