import type { UEGraphJSON, UEMultiGraphJSON, UENode, UEEdge } from '../types/ue-graph';

const MAX_CHARS = 12_000;

function summarizeNode(node: UENode): string {
  const pins = node.pins
    .filter((p) => !p.hidden)
    .map((p) => `${p.direction === 'input' ? '←' : '→'} ${p.name} (${p.category})`)
    .join(', ');
  return `  [${node.type}] ${node.title}${pins ? ` | ${pins}` : ''}`;
}

function summarizeEdges(edges: UEEdge[], nodes: UENode[]): string {
  const idToTitle = new Map(nodes.map((n) => [n.id, n.title]));
  return edges
    .map((e) => `  ${idToTitle.get(e.source) ?? e.source}.${e.sourcePin} → ${idToTitle.get(e.target) ?? e.target}.${e.targetPin} (${e.category})`)
    .join('\n');
}

function serializeSingleGraph(graph: UEGraphJSON): string {
  const lines: string[] = [];
  lines.push(`Graph: ${graph.metadata.title}`);
  if (graph.summary) lines.push(`Summary: ${graph.summary}`);

  // Group nodes by type
  const byType = new Map<string, UENode[]>();
  for (const node of graph.nodes) {
    const list = byType.get(node.type) ?? [];
    list.push(node);
    byType.set(node.type, list);
  }

  lines.push(`\nNodes (${graph.nodes.length}):`);
  for (const [type, nodes] of byType) {
    lines.push(`  -- ${type} (${nodes.length}) --`);
    for (const node of nodes) {
      lines.push(summarizeNode(node));
    }
  }

  lines.push(`\nConnections (${graph.edges.length}):`);
  lines.push(summarizeEdges(graph.edges, graph.nodes));

  return lines.join('\n');
}

/**
 * Serialize a single graph into a compact text summary for AI context.
 * Output is capped at MAX_CHARS.
 */
export function serializeGraphContext(graph: UEGraphJSON): string {
  const result = serializeSingleGraph(graph);
  if (result.length <= MAX_CHARS) return result;
  const suffix = '\n\n[...truncated — graph has more nodes/connections]';
  return result.slice(0, MAX_CHARS - suffix.length) + suffix;
}

/**
 * Serialize a multi-graph blueprint into a compact text summary for AI context.
 * The active graph gets full detail; other graphs get a brief overview.
 */
export function serializeMultiGraphContext(
  multi: UEMultiGraphJSON,
  activeGraphName: string,
): string {
  const lines: string[] = [];
  const meta = multi.metadata;
  lines.push(`Blueprint: ${meta.title || meta.blueprintName || 'Unknown'}`);
  if (meta.assetPath) lines.push(`Asset: ${meta.assetPath}`);

  // Summary counts
  const graphNames = Object.keys(multi.graphs);
  lines.push(`\nGraphs: ${graphNames.join(', ')}`);

  if (multi.events?.length) {
    lines.push(`\nEvents (${multi.events.length}): ${multi.events.map((e) => e.name).join(', ')}`);
  }
  if (multi.functions?.length) {
    lines.push(`Functions (${multi.functions.length}): ${multi.functions.map((f) => f.name).join(', ')}`);
  }
  if (multi.variables?.length) {
    lines.push(`Variables (${multi.variables.length}): ${multi.variables.map((v) => `${v.name}: ${v.type}`).join(', ')}`);
  }
  if (multi.components?.length) {
    lines.push(`Components (${multi.components.length}): ${multi.components.map((c) => `${c.name} (${c.class})`).join(', ')}`);
  }
  if (multi.delegates?.length) {
    lines.push(`Delegates (${multi.delegates.length}): ${multi.delegates.map((d) => d.name).join(', ')}`);
  }

  // Active graph in full detail
  const activeGraph = multi.graphs[activeGraphName];
  if (activeGraph) {
    lines.push(`\n--- Active Graph: "${activeGraphName}" (currently viewed) ---`);
    lines.push(serializeSingleGraph(activeGraph));
  }

  // Other graphs: brief summaries with key node info
  for (const name of graphNames) {
    if (name === activeGraphName) continue;
    const g = multi.graphs[name];
    const eventNodes = g.nodes.filter((n) => n.type === 'event' || n.type === 'custom-event');
    const funcNodes = g.nodes.filter((n) => n.type === 'function' || n.type === 'function-entry');
    const summary: string[] = [`${g.nodes.length} nodes, ${g.edges.length} connections`];
    if (eventNodes.length > 0) {
      summary.push(`events: ${eventNodes.map((n) => n.title).join(', ')}`);
    }
    if (funcNodes.length > 0) {
      summary.push(`functions: ${funcNodes.map((n) => n.title).join(', ')}`);
    }
    lines.push(`\n[${name}]: ${summary.join(' | ')}`);
  }

  // Graph switching note for AI awareness
  if (graphNames.length > 1) {
    lines.push(`\nNote: The user is viewing "${activeGraphName}". Other graphs exist in this blueprint but are not shown in detail. Reference them by name if relevant.`);
  }

  const result = lines.join('\n');
  if (result.length <= MAX_CHARS) return result;
  const suffix = '\n\n[...truncated — blueprint has more detail]';
  return result.slice(0, MAX_CHARS - suffix.length) + suffix;
}
