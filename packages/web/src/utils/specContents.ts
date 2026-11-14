import type { SpecInfo } from "@spekjs/core";
import type { SpecContent } from "@spekjs/core/spec-relations";
import type { ApiAdapter } from "../api/types";

/** How many `getSpec` calls are in flight at once. Enough to hide latency, few enough for a local server. */
export const SPEC_READ_CONCURRENCY = 8;

export interface SpecContents {
  specs: SpecInfo[];
  contents: SpecContent[];
  /** Specs whose content could not be read; their references are missing from the result. */
  unreadable: number;
}

/**
 * Every spec's text, read through the adapter every host already has — which is why Specs mode needs no
 * route of its own. A failed list is a failure of the whole read; a failed spec costs only that spec's
 * outgoing references and is counted, so the page can say so rather than draw a quietly thinner graph.
 *
 * Results keep the list's order whatever order the reads finish in.
 */
export async function readSpecContents(
  adapter: Pick<ApiAdapter, "getSpecs" | "getSpec">,
  concurrency = SPEC_READ_CONCURRENCY,
): Promise<SpecContents> {
  const specs = await adapter.getSpecs();
  const slots: (SpecContent | null)[] = new Array(specs.length).fill(null);

  let next = 0;
  const worker = async () => {
    while (next < specs.length) {
      const i = next++;
      try {
        const detail = await adapter.getSpec(specs[i].topic);
        slots[i] = { topic: specs[i].topic, content: detail.content };
      } catch {
        // counted below, from the empty slot
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, specs.length)) }, worker));

  const contents = slots.filter((s): s is SpecContent => s !== null);
  return { specs, contents, unreadable: specs.length - contents.length };
}
