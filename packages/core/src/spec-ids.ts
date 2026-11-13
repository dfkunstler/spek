// Spec identifiers: what a heading declares, what a citation of one means, and which ones are retired.
//
// Some projects give every requirement and scenario a permanent identifier (`BMB-001`, `ACCESS-001.02`)
// and cite them in text as `[BMB-001]`. This module is the one rule for that, with no runtime import
// beyond `headings` — it ships as the `@spekjs/core/spec-ids` subpath so a browser bundle can use it. Reading
// the files that hold the text is the Node side's job (`spec-id-index.ts`).
//
// Two conventions exist in the projects this was written against, and both are accepted without
// configuration: `### Requirement: BMB-001 Title` and `### Requirement: [ACCESS-001] Title`.

import { extractHeadings } from "./headings.js";

/** An identifier: an uppercase prefix that starts with a letter, three or more digits, and for a scenario `.NN`. */
const ID_SOURCE = "[A-Z][A-Z0-9]*-\\d{3,}(?:\\.\\d{2,})?";
const ID_RE = new RegExp(`^${ID_SOURCE}$`);

export interface SpecIdEntry {
  id: string;
  kind: "requirement" | "scenario";
  /** The spec the heading is in. */
  topic: string;
  /** `main` for `openspec/specs/`, `change` for a delta spec of the change being viewed. */
  source: "main" | "change";
  /**
   * The heading anchor the page gives the requirement — for a scenario, its requirement's: the renderer
   * assigns ids to `h2` / `h3` only, and giving `h4` ids would shift the dedup counter and with it every
   * existing anchor. Null when the heading has no anchor.
   */
  anchor: string | null;
  /** The heading without its keyword and identifier. */
  title: string;
  /** Markdown source: a requirement's statement, or a scenario's lines. */
  text: string;
}

export interface RetiredEntry {
  id: string;
  reason?: string;
  status?: string;
  replacedBy?: string;
}

export interface SpecIdIndex {
  entries: Record<string, SpecIdEntry>;
  retired: Record<string, RetiredEntry>;
}

export const EMPTY_SPEC_ID_INDEX: SpecIdIndex = { entries: {}, retired: {} };

export function isSpecId(label: string): boolean {
  return ID_RE.test(label);
}

const FENCE_RE = /^(`{3,}|~{3,})/;
const ANY_HEADING_RE = /^(#{1,6})[ \t]+(.+?)[ \t]*$/;
const H23_RE = /^(#{2,3})\s+(.+?)\s*$/;
// `Requirement: ` / `Scenario: `, then the identifier — bracketed or bare — then the rest. A bare
// identifier must end at whitespace or the end of the line, so `BMB-001x` is not one.
const DECLARATION_RE = new RegExp(
  `^(Requirement|Scenario):[ \\t]*(?:\\[(${ID_SOURCE})\\]|(${ID_SOURCE})(?=\\s|$))[ \\t]*(.*)$`,
  "i",
);

function splitLines(content: string): string[] {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

/**
 * Every identifier the headings of one spec declare, with the text that follows each heading.
 * A heading inside a code fence declares nothing.
 */
export function parseSpecIdDeclarations(
  topic: string,
  content: string,
  source: SpecIdEntry["source"],
): SpecIdEntry[] {
  const lines = splitLines(content);
  // Walk the h2/h3 headings in step with `extractHeadings`, so an anchor is the one the TOC and the
  // renderer give — not a second slug computation that could disagree on a duplicate.
  const anchored = extractHeadings(content);
  let anchoredAt = 0;

  interface Open {
    entry: SpecIdEntry;
    body: string[];
  }
  const out: SpecIdEntry[] = [];
  let open: Open | null = null;
  let fence: string | null = null;
  let requirementAnchor: string | null = null;

  const close = () => {
    if (open) {
      open.entry.text = open.body.join("\n").trim();
      out.push(open.entry);
      open = null;
    }
  };

  for (const line of lines) {
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      const marker = fenceMatch[1][0].repeat(3);
      if (fence === null) fence = marker;
      else if (line.trimStart().startsWith(fence)) fence = null;
      if (open) open.body.push(line);
      continue;
    }
    if (fence !== null) {
      if (open) open.body.push(line);
      continue;
    }

    const heading = line.match(ANY_HEADING_RE);
    if (!heading) {
      if (open) open.body.push(line);
      continue;
    }

    // A heading ends whatever the previous one was collecting.
    close();

    let anchor: string | null = null;
    const h23 = line.match(H23_RE);
    if (h23) {
      const text = h23[2].trim();
      // `extractHeadings` skips a heading whose slug is empty; so does this walk.
      if (anchored[anchoredAt] && anchored[anchoredAt].text === text) {
        anchor = anchored[anchoredAt].slug;
        anchoredAt += 1;
      }
    }

    const declaration = DECLARATION_RE.exec(heading[2]);
    if (!declaration) continue;
    const id = declaration[2] ?? declaration[3];
    const isScenario = declaration[1].toLowerCase() === "scenario";
    // The shape carries the kind: a scenario's identifier has a sub-sequence, a requirement's has none.
    if (isScenario !== id.includes(".")) continue;

    if (!isScenario) requirementAnchor = anchor;
    open = {
      entry: {
        id,
        kind: isScenario ? "scenario" : "requirement",
        topic,
        source,
        anchor: isScenario ? requirementAnchor : anchor,
        title: declaration[4].trim(),
        text: "",
      },
      body: [],
    };
  }
  close();
  return out;
}

const RETIRED_HEADING_RE = /^#{1,6}[ \t]+Relocated and Retired IDs[ \t]*$/i;

function cellId(cell: string): string | undefined {
  // `[ID]`, `` `ID` ``, `[ID](link)` and bare all name an identifier.
  const m = new RegExp(`(${ID_SOURCE})`).exec(cell);
  return m ? m[1] : undefined;
}

/**
 * The rows of a `## Relocated and Retired IDs` table: `| ID | Status | Resolves to |`.
 * A table is only read under that heading, and only until the next heading.
 */
export function parseRetiredTable(content: string): RetiredEntry[] {
  const lines = splitLines(content);
  const out: RetiredEntry[] = [];
  let inSection = false;
  let fence: string | null = null;
  for (const line of lines) {
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      const marker = fenceMatch[1][0].repeat(3);
      if (fence === null) fence = marker;
      else if (line.trimStart().startsWith(fence)) fence = null;
      continue;
    }
    if (fence !== null) continue;
    if (ANY_HEADING_RE.test(line)) {
      inSection = RETIRED_HEADING_RE.test(line);
      continue;
    }
    if (!inSection) continue;
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    const id = cellId(cells[0] ?? "");
    // The header row (`ID`) and the separator (`---`) name no identifier.
    if (!id) continue;
    const entry: RetiredEntry = { id };
    if (cells[1]) entry.status = cells[1];
    const replacedBy = cells[2] ? cellId(cells[2]) : undefined;
    if (replacedBy) entry.replacedBy = replacedBy;
    out.push(entry);
  }
  return out;
}

/**
 * Fold declarations and retired records into one index. A later part's entry replaces an earlier one's
 * (the change's delta over main), and a retired record for an identifier something declares is dropped:
 * a stale ledger must not hide a live requirement.
 */
export function buildSpecIdIndex(parts: {
  declarations: readonly SpecIdEntry[][];
  retired: readonly RetiredEntry[][];
}): SpecIdIndex {
  const entries: Record<string, SpecIdEntry> = {};
  for (const part of parts.declarations) for (const e of part) entries[e.id] = e;
  const retired: Record<string, RetiredEntry> = {};
  for (const part of parts.retired) {
    for (const r of part) {
      if (entries[r.id]) continue;
      // Both sources may record one identifier; keep what each says.
      retired[r.id] = { ...retired[r.id], ...r };
    }
  }
  return { entries, retired };
}

export interface CitationPart {
  type: "text" | "citation";
  value: string;
  /** The identifier, for a citation. */
  id?: string;
}

const CITATION_RE = new RegExp(`\\[(${ID_SOURCE})\\]`, "g");

/** Split a text run into plain text and `[ID]` citations. The caller decides which citations resolve. */
export function splitCitations(text: string): CitationPart[] {
  const parts: CitationPart[] = [];
  let last = 0;
  for (const m of text.matchAll(CITATION_RE)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ type: "text", value: text.slice(last, at) });
    parts.push({ type: "citation", value: m[0], id: m[1] });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}
