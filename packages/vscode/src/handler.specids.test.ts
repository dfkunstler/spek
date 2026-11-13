import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Module from "node:module";

// Same stub as handler.nested.test.ts: the handler imports `vscode`, which exists only in the extension host.
const VSCODE_STUB = {
  workspace: {
    getConfiguration: () => ({ get: (key: string, fallback: unknown) => (key === "aggregateWorktrees" ? false : fallback) }),
  },
};
const moduleInternals = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
const load = moduleInternals._load;
moduleInternals._load = function (request: string, ...rest: unknown[]) {
  return request === "vscode" ? VSCODE_STUB : load.call(this, request, ...rest);
};

function repo(t: TestContext, files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spek-vscode-ids-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const [rel, text] of Object.entries(files)) {
    const file = path.join(dir, "openspec", rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  return dir;
}

async function handler(dir: string) {
  const { MessageHandler } = await import("./handler");
  return new MessageHandler(dir);
}

type Index = { entries: Record<string, { text: string; source: string }>; retired: Record<string, unknown> };

test("the host answers getSpecIds with the workspace's declared and retired identifiers", async (t) => {
  const dir = repo(t, {
    "specs/a/spec.md": "### Requirement: PRS-004 Parse\nMain.\n",
    "spec-ids.yaml": "retired:\n  - id: MDL-004\n    reason: Moved.\n",
  });
  const index = (await (await handler(dir)).handle("getSpecIds")) as Index;
  assert.equal(index.entries["PRS-004"].text, "Main.");
  assert.deepEqual(index.retired["MDL-004"], { id: "MDL-004", reason: "Moved." });
});

test("a change slug layers the change's delta over main", async (t) => {
  const dir = repo(t, {
    "specs/a/spec.md": "### Requirement: PRS-004 Parse\nMain.\n",
    "changes/c1/specs/a/spec.md": "### Requirement: PRS-004 Parse\nDelta.\n",
  });
  const index = (await (await handler(dir)).handle("getSpecIds", { changeSlug: "c1" })) as Index;
  assert.equal(index.entries["PRS-004"].text, "Delta.");
  assert.equal(index.entries["PRS-004"].source, "change");
});

test("a workspace without identifiers is an empty index, not an error", async (t) => {
  const dir = repo(t, { "specs/a/spec.md": "### Requirement: Plain\nx\n" });
  assert.deepEqual(await (await handler(dir)).handle("getSpecIds"), { entries: {}, retired: {} });
});

test("a slug that is not a string is refused, and a path-like one adds nothing", async (t) => {
  const dir = repo(t, { "specs/a/spec.md": "### Requirement: PRS-004 Parse\nMain.\n" });
  const h = await handler(dir);
  await assert.rejects(h.handle("getSpecIds", { changeSlug: 7 }), /changeSlug must be a string/);
  const index = (await h.handle("getSpecIds", { changeSlug: "../x" })) as Index;
  assert.equal(Object.keys(index.entries).length, 1);
});
