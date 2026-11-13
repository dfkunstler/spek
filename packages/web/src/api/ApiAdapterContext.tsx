import { createContext, useContext } from "react";
import type { ApiAdapter } from "./types.js";

const ApiAdapterContext = createContext<ApiAdapter | null>(null);

export function ApiAdapterProvider({
  adapter,
  children,
}: {
  adapter: ApiAdapter;
  children: React.ReactNode;
}) {
  return (
    <ApiAdapterContext.Provider value={adapter}>
      {children}
    </ApiAdapterContext.Provider>
  );
}

export function useApiAdapter(): ApiAdapter {
  const adapter = useContext(ApiAdapterContext);
  if (!adapter) {
    throw new Error("useApiAdapter must be used within ApiAdapterProvider");
  }
  return adapter;
}

/**
 * The adapter if one is provided, else null. For decoration that must degrade rather than fail — the
 * spec identifier index — so a tree rendered without a host (a test, a future embed) shows its content
 * without links instead of throwing.
 */
export function useOptionalApiAdapter(): ApiAdapter | null {
  return useContext(ApiAdapterContext);
}
