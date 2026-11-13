// The Node producer of the spec identifier index: reads the spec files and the retirement ledger, and
// hands the text to the browser-safe rule in `spec-ids.ts`.
//
// Everything read is under `openspec/` — spec files discovered by `discoverSpecFiles`, and the fixed path
// `openspec/spec-ids.yaml`. No part of a path comes from a request except a change slug, which is checked.

import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { discoverSpecFiles } from "./spec-files.js";
import { isSafeChangeSlug } from "./spec-topic.js";
import {
  buildSpecIdIndex,
  isSpecId,
  parseRetiredTable,
  parseSpecIdDeclarations,
  type RetiredEntry,
  type SpecIdEntry,
  type SpecIdIndex,
} from "./spec-ids.js";

function readOrNull(file: string): string | null {
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
}

function declarationsUnder(specsRoot: string, source: SpecIdEntry["source"]): {
  declarations: SpecIdEntry[];
  retired: RetiredEntry[];
} {
  const declarations: SpecIdEntry[] = [];
  const retired: RetiredEntry[] = [];
  for (const { topic, file } of discoverSpecFiles(specsRoot)) {
    const content = readOrNull(file);
    if (content === null) continue;
    declarations.push(...parseSpecIdDeclarations(topic, content, source));
    // A retirement table lives in a main spec; a delta's table is not the repository's record.
    if (source === "main") retired.push(...parseRetiredTable(content));
  }
  return { declarations, retired };
}

/**
 * `openspec/spec-ids.yaml`'s `retired:` list (`id`, `reason`, optional `replaced_by`). Anything that is
 * not that shape yields nothing: a ledger this reader does not understand is today's behaviour, not an
 * error on a page that only wanted to decorate a citation.
 */
export function readRetiredLedger(repoDir: string): RetiredEntry[] {
  const text = readOrNull(path.join(repoDir, "openspec", "spec-ids.yaml"));
  if (text === null) return [];
  let doc: unknown;
  try {
    doc = parseYaml(text);
  } catch {
    return [];
  }
  const list = (doc as { retired?: unknown } | null)?.retired;
  if (!Array.isArray(list)) return [];
  const out: RetiredEntry[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const { id, reason, replaced_by: replacedBy } = item as Record<string, unknown>;
    if (typeof id !== "string" || !isSpecId(id)) continue;
    const entry: RetiredEntry = { id };
    if (typeof reason === "string" && reason.trim()) entry.reason = reason.trim();
    if (typeof replacedBy === "string" && isSpecId(replacedBy)) entry.replacedBy = replacedBy;
    out.push(entry);
  }
  return out;
}

/**
 * The identifier index of a repository: its main specs, and — with `changeSlug` — that change's delta
 * specs layered over them. An unsafe slug adds nothing.
 */
export function readSpecIdIndex(repoDir: string, changeSlug?: string): SpecIdIndex {
  const base = path.join(repoDir, "openspec");
  const main = declarationsUnder(path.join(base, "specs"), "main");
  const declarations = [main.declarations];
  if (changeSlug !== undefined && isSafeChangeSlug(changeSlug)) {
    const changes = path.join(base, "changes");
    // Active first, then the archive — the order `readSpecAtChange` uses.
    for (const dir of [path.join(changes, changeSlug), path.join(changes, "archive", changeSlug)]) {
      const specsRoot = path.join(dir, "specs");
      if (!fs.existsSync(specsRoot)) continue;
      declarations.push(declarationsUnder(specsRoot, "change").declarations);
      break;
    }
  }
  return buildSpecIdIndex({ declarations, retired: [main.retired, readRetiredLedger(repoDir)] });
}
