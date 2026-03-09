import { createContext, useContext } from 'react';
import type { GraphAPI } from '../api/graph-api';

const GraphAPIContext = createContext<GraphAPI | null>(null);

export const GraphAPIProvider = GraphAPIContext.Provider;

/** Access the GraphAPI instance. Throws if used outside a provider. */
export function useGraphAPI(): GraphAPI {
  const api = useContext(GraphAPIContext);
  if (!api) throw new Error('useGraphAPI must be used within a GraphAPIProvider');
  return api;
}

/** Access the GraphAPI instance, or null if not in a provider. */
export function useGraphAPIMaybe(): GraphAPI | null {
  return useContext(GraphAPIContext);
}
