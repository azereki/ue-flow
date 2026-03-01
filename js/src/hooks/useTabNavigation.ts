import { useState, useCallback } from 'react';
import type { BreadcrumbItem } from '../components/Breadcrumbs';

export interface SpecialTabInfo {
  type: 'graph' | 'datatable' | 'struct';
  name: string;
}

export function parseTabName(tabName: string): SpecialTabInfo {
  if (tabName.startsWith('dt:')) return { type: 'datatable', name: tabName.slice(3) };
  if (tabName.startsWith('struct:')) return { type: 'struct', name: tabName.slice(7) };
  return { type: 'graph', name: tabName };
}

export interface TabNavigationState {
  openTabs: string[];
  activeGraph: string;
  breadcrumbs: BreadcrumbItem[];
  focusNodeTitle: string | null;
  pinnedTab: string;
}

export interface TabNavigationActions {
  selectGraph: (name: string) => void;
  closeTab: (name: string) => void;
  navigateToGraph: (name: string, focusTitle?: string) => void;
  navigateBreadcrumb: (index: number) => void;
  openSpecialTab: (name: string, type: 'datatable' | 'struct') => void;
}

export function useTabNavigation(graphNames: string[]): TabNavigationState & TabNavigationActions {
  const firstGraph = graphNames[0] ?? '';

  const [openTabs, setOpenTabs] = useState<string[]>([firstGraph]);
  const [activeGraph, setActiveGraph] = useState(firstGraph);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>(
    firstGraph ? [{ label: firstGraph, graphName: firstGraph }] : [],
  );
  const [focusNodeTitle, setFocusNodeTitle] = useState<string | null>(null);

  const pinnedTab = firstGraph;

  const openTab = useCallback((name: string) => {
    setOpenTabs(prev => prev.includes(name) ? prev : [...prev, name]);
    setActiveGraph(name);
  }, []);

  const closeTab = useCallback((name: string) => {
    if (name === pinnedTab) return;
    setOpenTabs(prev => {
      const next = prev.filter(t => t !== name);
      setActiveGraph(current => {
        if (current === name) {
          const closedIndex = prev.indexOf(name);
          const fallback = next[Math.min(closedIndex, next.length - 1)] ?? pinnedTab;
          setBreadcrumbs([{ label: fallback, graphName: fallback }]);
          return fallback;
        }
        return current;
      });
      return next;
    });
  }, [pinnedTab]);

  const selectGraph = useCallback((name: string) => {
    setActiveGraph(name);
    setBreadcrumbs([{ label: name, graphName: name }]);
  }, []);

  const navigateToGraph = useCallback((name: string, focusTitle?: string) => {
    const exact = graphNames.find((g) => g === name);
    const fuzzy = exact ?? graphNames.find((g) => g.toLowerCase() === name.toLowerCase());
    if (fuzzy) {
      openTab(fuzzy);
      setBreadcrumbs([{ label: fuzzy, graphName: fuzzy }]);
      setFocusNodeTitle(focusTitle ?? null);
    }
  }, [graphNames, openTab]);

  const navigateBreadcrumb = useCallback((index: number) => {
    const item = breadcrumbs[index];
    if (item) {
      setActiveGraph(item.graphName);
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
    }
  }, [breadcrumbs]);

  const openSpecialTab = useCallback((name: string, type: 'datatable' | 'struct') => {
    const prefix = type === 'datatable' ? 'dt:' : 'struct:';
    const tabName = `${prefix}${name}`;
    setOpenTabs(prev => prev.includes(tabName) ? prev : [...prev, tabName]);
    setActiveGraph(tabName);
    setBreadcrumbs([{ label: name, graphName: tabName }]);
  }, []);

  // State values are volatile; action callbacks are stable via useCallback.
  // No useMemo wrapper — destructuring consumers pick individual values,
  // so a new container object is harmless and avoids coupling stable actions
  // to volatile state in a single memo.
  return {
    openTabs,
    activeGraph,
    breadcrumbs,
    focusNodeTitle,
    pinnedTab,
    selectGraph,
    closeTab,
    navigateToGraph,
    navigateBreadcrumb,
    openSpecialTab,
  };
}
