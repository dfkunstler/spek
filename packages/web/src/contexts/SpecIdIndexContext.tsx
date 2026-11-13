import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { EMPTY_SPEC_ID_INDEX, type SpecIdIndex } from "@spekjs/core/spec-ids";
import { useOptionalApiAdapter } from "../api/ApiAdapterContext";
import { useRefreshKey } from "./RefreshContext";

/**
 * What a `[ID]` citation in spec text resolves to. The default is the empty index, so a tree that never
 * mounts a provider — the proposal / design / tasks tabs, a preview's own nested render — links nothing.
 */
export const SpecIdIndexContext = createContext<SpecIdIndex>(EMPTY_SPEC_ID_INDEX);

export function useSpecIdIndex(): SpecIdIndex {
  return useContext(SpecIdIndexContext);
}

/**
 * Fetches the repository's identifier index and provides it to the spec content below.
 *
 * A decoration must never turn a spec page into an error page, so every failure — an adapter without
 * `getSpecIds`, a refused request, an older server — leaves the empty index in place and says nothing.
 * It joins no fetch-state bookkeeping either: the busy state of a manual refresh must not wait on this.
 */
export function SpecIdIndexProvider({ changeSlug, children }: { changeSlug?: string; children: ReactNode }) {
  const adapter = useOptionalApiAdapter();
  const refreshKey = useRefreshKey();
  const [index, setIndex] = useState<SpecIdIndex>(EMPTY_SPEC_ID_INDEX);

  useEffect(() => {
    if (!adapter?.getSpecIds) {
      setIndex(EMPTY_SPEC_ID_INDEX);
      return;
    }
    let cancelled = false;
    adapter
      .getSpecIds(changeSlug)
      .then((next) => {
        if (!cancelled) setIndex(next);
      })
      .catch(() => {
        // Keep what is showing: a transient failure should not strip links the reader is using.
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, changeSlug, refreshKey]);

  return <SpecIdIndexContext.Provider value={index}>{children}</SpecIdIndexContext.Provider>;
}
