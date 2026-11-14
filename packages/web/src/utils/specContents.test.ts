import { test } from "node:test";
import assert from "node:assert/strict";
import { readSpecContents } from "./specContents";
import type { SpecInfo, SpecDetail } from "@spekjs/core";

function info(topic: string): SpecInfo {
  return { topic, path: `openspec/specs/${topic}/spec.md`, historyCount: 0 };
}
function detail(topic: string): SpecDetail {
  return { topic, content: `# ${topic}`, relatedChanges: [], history: [] };
}

test("reads every spec and keeps the list's order whatever order the reads finish in", async () => {
  const topics = ["a", "b", "c", "d"];
  const delays: Record<string, number> = { a: 30, b: 1, c: 20, d: 5 };
  const adapter = {
    getSpecs: async () => topics.map(info),
    getSpec: (t: string) => new Promise<SpecDetail>((r) => setTimeout(() => r(detail(t)), delays[t])),
  };
  const out = await readSpecContents(adapter);
  assert.deepEqual(out.contents.map((c) => c.topic), topics);
  assert.equal(out.unreadable, 0);
});

test("never has more reads in flight than the bound", async () => {
  let inFlight = 0;
  let peak = 0;
  const topics = Array.from({ length: 30 }, (_, i) => `s${i}`);
  const adapter = {
    getSpecs: async () => topics.map(info),
    getSpec: async (t: string) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 2));
      inFlight--;
      return detail(t);
    },
  };
  await readSpecContents(adapter, 4);
  assert.ok(peak <= 4, `peak ${peak}`);
  assert.ok(peak > 1, "should actually overlap");
});

test("one unreadable spec is counted and the rest survive", async () => {
  const adapter = {
    getSpecs: async () => ["a", "b", "c"].map(info),
    getSpec: async (t: string) => {
      if (t === "b") throw new Error("boom");
      return detail(t);
    },
  };
  const out = await readSpecContents(adapter);
  assert.deepEqual(out.contents.map((c) => c.topic), ["a", "c"]);
  assert.equal(out.unreadable, 1);
  assert.equal(out.specs.length, 3);
});

test("a failed list rejects the whole read", async () => {
  const adapter = {
    getSpecs: async (): Promise<SpecInfo[]> => {
      throw new Error("no list");
    },
    getSpec: async (t: string) => detail(t),
  };
  await assert.rejects(readSpecContents(adapter), /no list/);
});

test("an empty repository reads nothing without hanging", async () => {
  const out = await readSpecContents({ getSpecs: async () => [], getSpec: async (t) => detail(t) });
  assert.deepEqual(out, { specs: [], contents: [], unreadable: 0 });
});
