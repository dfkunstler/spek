import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// The measure is CSS geometry, which jsdom cannot see, so this pins the *shape*: one definition, and
// every spec view reading it rather than holding a copy. The geometry itself is checked in a browser.

const SRC = fileURLToPath(new URL("..", import.meta.url));
const read = (rel: string): string => readFileSync(join(SRC, rel), "utf8");

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sources(full));
    else if (/\.(tsx?|css)$/.test(name) && !name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

test("the measure is defined once, in the theme", () => {
  assert.match(read("styles/global.css"), /--container-spec:\s*120ch;/);
});

test("no source holds its own copy of the measure", () => {
  const offenders = sources(SRC)
    .filter((f) => /\b120ch\b/.test(readFileSync(f, "utf8")))
    .map((f) => f.slice(SRC.length));
  assert.deepEqual(offenders, ["styles/global.css"]);
});

test("the spec detail column and its grid read the token", () => {
  const page = read("pages/SpecDetail.tsx");
  assert.match(page, /xl:grid-cols-\[minmax\(0,var\(--container-spec\)\)_16rem\]/);
  assert.match(page, /className="min-w-0 max-w-spec /);
  // the header row (title + fold controls) is capped too, or the controls sit at the window edge
  assert.match(page, /<div className="max-w-spec">\s*<Link to="\/specs"/);
});

test("the change page's grid and column read the token", () => {
  // The whole page is capped, tab bar included, so switching tabs never changes the width.
  const page = read("pages/ChangeDetail.tsx");
  assert.match(page, /xl:grid-cols-\[minmax\(0,var\(--container-spec\)\)_16rem\]/);
  assert.match(page, /className="min-w-0 max-w-spec"/);
});

test("every other reading page is capped", () => {
  for (const f of ["Dashboard", "SpecList", "ChangeList", "SchemaList", "SchemaDetail"]) {
    assert.match(read(`pages/${f}.tsx`), /className="max-w-spec space-y-/, `${f} is not capped`);
  }
});

test("graph and timeline keep the full viewport", () => {
  // They are spatial views: a width cap would crop the canvas, not improve a measure.
  for (const f of ["GraphView", "TimelinePage"]) {
    assert.ok(!read(`pages/${f}.tsx`).includes("max-w-spec"), `${f} must not be capped`);
  }
});
