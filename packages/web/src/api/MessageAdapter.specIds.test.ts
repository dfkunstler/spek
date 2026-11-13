import { test } from "node:test";
import assert from "node:assert/strict";

// MessageAdapter reads `window.__vscodeApi` in its constructor and listens on `window`, neither of which
// exists under node. A stub window that records posted messages and replays a response is enough.
type Listener = (event: { data: unknown }) => void;

function setup() {
  const posted: { id: string; method: string; params?: Record<string, unknown> }[] = [];
  const listeners: Listener[] = [];
  (globalThis as unknown as { window: unknown }).window = {
    __vscodeApi: { postMessage: (m: (typeof posted)[number]) => posted.push(m) },
    addEventListener: (_: string, l: Listener) => listeners.push(l),
  };
  // The request's 10 s timeout timer would hold the test process open after the answer; unref it.
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: () => void, ms?: number) => {
    const t = realSetTimeout(fn, ms);
    t.unref();
    return t;
  }) as typeof setTimeout;
  const reply = (data: unknown) => listeners.forEach((l) => l({ data: { type: "response", id: posted[0].id, data } }));
  return { posted, reply, restore: () => { globalThis.setTimeout = realSetTimeout; } };
}

test("getSpecIds posts the method with no slug and resolves with the reply", async () => {
  const { posted, reply, restore } = setup();
  try {
    const { MessageAdapter } = await import("./MessageAdapter");
    const adapter = new MessageAdapter();
    const pending = adapter.getSpecIds();
    assert.equal(posted[0].method, "getSpecIds");
    assert.equal(posted[0].params?.changeSlug, undefined);
    reply({ entries: {}, retired: {} });
    assert.deepEqual(await pending, { entries: {}, retired: {} });
  } finally {
    restore();
  }
});

test("a change slug is sent in the request", async () => {
  const { posted, reply, restore } = setup();
  try {
    const { MessageAdapter } = await import("./MessageAdapter");
    const pending = new MessageAdapter().getSpecIds("add-thing");
    assert.equal(posted[0].params?.changeSlug, "add-thing");
    reply({ entries: {}, retired: {} });
    await pending;
  } finally {
    restore();
  }
});
