/**
 * Graph comparison / diff computation.
 *
 * Computes structural differences between two UEGraphJSON graphs,
 * identifying added, removed, and modified nodes and edges.
 */
import type { UEGraphJSON, UENode, UEEdge } from '../types/ue-graph';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface NodeChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface ModifiedNode {
  nodeId: string;
  title: string;
  changes: NodeChange[];
}

export interface GraphDiffSummary {
  totalChanges: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

export interface GraphDiff {
  addedNodes: UENode[];
  removedNodes: UENode[];
  modifiedNodes: ModifiedNode[];
  addedEdges: UEEdge[];
  removedEdges: UEEdge[];
  summary: GraphDiffSummary;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Canonical edge key for deduplication. */
function edgeKey(e: UEEdge): string {
  return `${e.source}:${e.sourcePin}->${e.target}:${e.targetPin}`;
}

/** Stringify a value for display in a diff change entry. */
function displayValue(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * Compare two matched nodes and return a list of field-level changes.
 * Checks: title, position, nodeClass, pin default values, and select properties.
 */
function compareNodes(a: UENode, b: UENode): NodeChange[] {
  const changes: NodeChange[] = [];

  if (a.title !== b.title) {
    changes.push({ field: 'title', oldValue: a.title, newValue: b.title });
  }

  if (a.position.x !== b.position.x || a.position.y !== b.position.y) {
    changes.push({
      field: 'position',
      oldValue: `(${a.position.x}, ${a.position.y})`,
      newValue: `(${b.position.x}, ${b.position.y})`,
    });
  }

  if (a.nodeClass !== b.nodeClass) {
    changes.push({ field: 'nodeClass', oldValue: a.nodeClass, newValue: b.nodeClass });
  }

  // Compare pin default values
  const aPins = new Map(a.pins.map(p => [p.name, p]));
  const bPins = new Map(b.pins.map(p => [p.name, p]));

  for (const [name, pinA] of aPins) {
    const pinB = bPins.get(name);
    if (!pinB) {
      changes.push({ field: `pin "${name}"`, oldValue: 'present', newValue: 'removed' });
    } else {
      if (pinA.defaultValue !== pinB.defaultValue) {
        changes.push({
          field: `pin "${name}" defaultValue`,
          oldValue: pinA.defaultValue || '(empty)',
          newValue: pinB.defaultValue || '(empty)',
        });
      }
      if (pinA.category !== pinB.category) {
        changes.push({
          field: `pin "${name}" category`,
          oldValue: pinA.category,
          newValue: pinB.category,
        });
      }
    }
  }
  for (const name of bPins.keys()) {
    if (!aPins.has(name)) {
      changes.push({ field: `pin "${name}"`, oldValue: 'absent', newValue: 'added' });
    }
  }

  // Compare select properties (FunctionReference, EventReference, VariableReference)
  const propsToCompare = [
    'FunctionReference', 'EventReference', 'VariableReference',
    'SignatureName', 'TargetType', 'NodeComment',
  ];
  for (const prop of propsToCompare) {
    const valA = displayValue(a.properties[prop]);
    const valB = displayValue(b.properties[prop]);
    if (valA !== valB) {
      changes.push({ field: prop, oldValue: valA || '(empty)', newValue: valB || '(empty)' });
    }
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the structural diff between two UEGraphJSON graphs.
 *
 * Matching strategy:
 *  1. Exact match by node ID
 *  2. Fuzzy match by title + type for unmatched nodes
 *  3. Unmatched nodes in A → removed; unmatched in B → added
 */
export function computeGraphDiff(graphA: UEGraphJSON, graphB: UEGraphJSON): GraphDiff {
  // --- Node matching ---
  const aById = new Map(graphA.nodes.map(n => [n.id, n]));
  const bById = new Map(graphB.nodes.map(n => [n.id, n]));

  const matchedPairs: Array<[UENode, UENode]> = [];
  const matchedAIds = new Set<string>();
  const matchedBIds = new Set<string>();

  // Pass 1: exact ID match
  for (const [id, nodeA] of aById) {
    const nodeB = bById.get(id);
    if (nodeB) {
      matchedPairs.push([nodeA, nodeB]);
      matchedAIds.add(id);
      matchedBIds.add(id);
    }
  }

  // Pass 2: fuzzy match by title + type for remaining nodes
  const unmatchedA = graphA.nodes.filter(n => !matchedAIds.has(n.id));
  const unmatchedB = graphB.nodes.filter(n => !matchedBIds.has(n.id));
  const fuzzyUsedB = new Set<string>();

  for (const nodeA of unmatchedA) {
    const fuzzyKey = `${nodeA.title}::${nodeA.type}`;
    const candidate = unmatchedB.find(
      n => !fuzzyUsedB.has(n.id) && `${n.title}::${n.type}` === fuzzyKey,
    );
    if (candidate) {
      matchedPairs.push([nodeA, candidate]);
      matchedAIds.add(nodeA.id);
      matchedBIds.add(candidate.id);
      fuzzyUsedB.add(candidate.id);
    }
  }

  // Classify
  const removedNodes = graphA.nodes.filter(n => !matchedAIds.has(n.id));
  const addedNodes = graphB.nodes.filter(n => !matchedBIds.has(n.id));
  const modifiedNodes: ModifiedNode[] = [];

  for (const [nodeA, nodeB] of matchedPairs) {
    const changes = compareNodes(nodeA, nodeB);
    if (changes.length > 0) {
      modifiedNodes.push({
        nodeId: nodeB.id,
        title: nodeB.title,
        changes,
      });
    }
  }

  // --- Edge matching ---
  const aEdgeKeys = new Map(graphA.edges.map(e => [edgeKey(e), e]));
  const bEdgeKeys = new Map(graphB.edges.map(e => [edgeKey(e), e]));

  const removedEdges: UEEdge[] = [];
  const addedEdges: UEEdge[] = [];

  for (const [key, edge] of aEdgeKeys) {
    if (!bEdgeKeys.has(key)) removedEdges.push(edge);
  }
  for (const [key, edge] of bEdgeKeys) {
    if (!aEdgeKeys.has(key)) addedEdges.push(edge);
  }

  // --- Summary ---
  const summary: GraphDiffSummary = {
    addedCount: addedNodes.length + addedEdges.length,
    removedCount: removedNodes.length + removedEdges.length,
    modifiedCount: modifiedNodes.length,
    totalChanges:
      addedNodes.length + addedEdges.length +
      removedNodes.length + removedEdges.length +
      modifiedNodes.length,
  };

  return {
    addedNodes,
    removedNodes,
    modifiedNodes,
    addedEdges,
    removedEdges,
    summary,
  };
}
