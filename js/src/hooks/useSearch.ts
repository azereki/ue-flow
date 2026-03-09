/**
 * Search hook — finds nodes, pins, and comments across graphs.
 */
import { useState, useMemo, useCallback } from 'react';
import type { UEMultiGraphJSON, UEGraphJSON } from '../types/ue-graph';

export interface SearchResult {
  nodeId: string;
  graphName: string;
  title: string;
  matchField: 'title' | 'pin' | 'comment' | 'pinValue';
  matchText: string;
}

/** Search a single graph for matches. */
function searchGraph(graph: UEGraphJSON, graphName: string, query: string): SearchResult[] {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  for (const node of graph.nodes) {
    // Search node titles
    if ((node.title ?? '').toLowerCase().includes(q)) {
      results.push({ nodeId: node.id, graphName, title: node.title, matchField: 'title', matchText: node.title });
    }
    // Search comment text
    if (node.type === 'comment') {
      const comment = String(node.properties?.NodeComment ?? node.title ?? '');
      if (comment.toLowerCase().includes(q) && !(node.title ?? '').toLowerCase().includes(q)) {
        results.push({ nodeId: node.id, graphName, title: node.title, matchField: 'comment', matchText: comment.slice(0, 60) });
      }
      continue;
    }
    // Search pin names and default values
    for (const pin of node.pins) {
      if (pin.hidden) continue;
      const name = pin.friendlyName || pin.name;
      if (name.toLowerCase().includes(q)) {
        results.push({ nodeId: node.id, graphName, title: node.title, matchField: 'pin', matchText: `Pin: ${name}` });
        break; // One match per node is enough
      }
      if (pin.defaultValue && pin.defaultValue.toLowerCase().includes(q)) {
        results.push({ nodeId: node.id, graphName, title: node.title, matchField: 'pinValue', matchText: `${name} = ${pin.defaultValue.slice(0, 40)}` });
        break;
      }
    }
  }

  return results;
}

export function useSearch(
  multiGraph?: UEMultiGraphJSON | null,
  singleGraph?: UEGraphJSON | null,
) {
  const [query, setQuery] = useState('');

  const results = useMemo((): SearchResult[] => {
    if (!query || query.length < 2) return [];

    if (multiGraph) {
      const allResults: SearchResult[] = [];
      for (const [graphName, graph] of Object.entries(multiGraph.graphs)) {
        allResults.push(...searchGraph(graph, graphName, query));
      }
      return allResults;
    }
    if (singleGraph) {
      return searchGraph(singleGraph, singleGraph.metadata?.title ?? 'Graph', query);
    }
    return [];
  }, [query, multiGraph, singleGraph]);

  const clearSearch = useCallback(() => setQuery(''), []);

  return { query, setQuery, results, clearSearch };
}
