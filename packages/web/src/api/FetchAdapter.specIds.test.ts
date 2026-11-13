import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { FetchAdapter } from "./FetchAdapter";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function capture(): { urls: string[] } {
  const seen = { urls: [] as string[] };
  globalThis.fetch = (async (url: string) => {
    seen.urls.push(url);
    return new Response(JSON.stringify({ entries: {}, retired: {} }), { status: 200 });
  }) as typeof fetch;
  return seen;
}

test("getSpecIds asks the spec-ids route with the repository", async () => {
  const seen = capture();
  const adapter = new FetchAdapter("/repo/x");
  assert.ok(adapter.getSpecIds);
  await adapter.getSpecIds();
  assert.equal(seen.urls[0], "/api/openspec/spec-ids?dir=%2Frepo%2Fx");
});

test("a change slug is sent as `at`", async () => {
  const seen = capture();
  await new FetchAdapter("/repo/x").getSpecIds?.("add-thing");
  assert.equal(seen.urls[0], "/api/openspec/spec-ids?dir=%2Frepo%2Fx&at=add-thing");
});

test("a host that cannot supply the index leaves the method undefined", () => {
  const adapter = new FetchAdapter("/repo/x", { baseUrl: "/api/spek", dirParam: "projectPath", specIds: false });
  assert.equal(adapter.getSpecIds, undefined);
});

test("StaticAdapter, which has no index yet, need not define it", async () => {
  const { StaticAdapter } = await import("./StaticAdapter");
  assert.equal((StaticAdapter.prototype as { getSpecIds?: unknown }).getSpecIds, undefined);
});
