/**
 * Serialize React Flow state back to UE T3D clipboard paste text.
 *
 * This is the browser-side inverse of the Python t3d_serializer.py.
 * It converts the current React Flow nodes/edges back to valid T3D text
 * that can be pasted into the UE editor.
 */
import type { Node, Edge } from '@xyflow/react';
import type { FlowNodeData } from './json-to-flow';
import type { UEPin } from '../types/ue-graph';

function serializePinWithLinks(
  pin: UEPin,
  linkedTo: Array<{ nodeName: string; pinId: string }>,
): string {
  const parts: string[] = [
    `PinId=${pin.id}`,
    `PinName="${pin.name}"`,
  ];

  if (pin.friendlyName) {
    parts.push(`PinFriendlyName="${pin.friendlyName}"`);
  }

  if (pin.direction === 'output') {
    parts.push('Direction="EGPD_Output"');
  }

  parts.push(`PinType.PinCategory="${pin.category}"`);
  parts.push(`PinType.PinSubCategory="${pin.subCategory}"`);

  if (pin.subCategoryObject) {
    parts.push(`PinType.PinSubCategoryObject=${pin.subCategoryObject}`);
  } else {
    parts.push('PinType.PinSubCategoryObject=None');
  }

  parts.push(
    'PinType.PinSubCategoryMemberReference=()',
    'PinType.PinValueType=()',
    `PinType.ContainerType=${pin.containerType || 'None'}`,
    `PinType.bIsReference=${pin.isReference}`,
    `PinType.bIsConst=${pin.isConst}`,
    `PinType.bIsWeakPointer=${pin.isWeak}`,
    'PinType.bIsUObjectWrapper=False',
    'PinType.bSerializeAsSinglePrecisionFloat=False',
  );

  if (pin.defaultValue) {
    parts.push(`DefaultValue="${pin.defaultValue}"`);
  }

  if (linkedTo.length > 0) {
    const refs = linkedTo.map(l => `${l.nodeName} ${l.pinId}`).join(',') + ',';
    parts.push(`LinkedTo=(${refs})`);
  }

  parts.push('PersistentGuid=00000000000000000000000000000000');
  parts.push(`bHidden=${pin.hidden ? 'True' : 'False'}`);
  parts.push('bNotConnectable=False');
  parts.push('bDefaultValueIsReadOnly=False');
  parts.push('bDefaultValueIsIgnored=False');
  parts.push(`bAdvancedView=${pin.advancedView ? 'True' : 'False'}`);
  parts.push('bOrphanedPin=False,');

  return '   CustomProperties Pin (' + parts.join(',') + ')';
}

interface PinLinkInfo {
  nodeName: string;
  pinId: string;
}

/**
 * Build a map of (nodeId, pinId) -> linked targets from the edge array.
 * Returns a map for both source and target directions (bidirectional links).
 */
function buildLinkedToMap(
  edges: Edge[],
): Map<string, PinLinkInfo[]> {
  const map = new Map<string, PinLinkInfo[]>();

  for (const edge of edges) {
    // Source pin -> target
    const sourceKey = `${edge.source}:${edge.sourceHandle}`;
    if (!map.has(sourceKey)) map.set(sourceKey, []);
    map.get(sourceKey)!.push({
      nodeName: edge.target,
      pinId: edge.targetHandle ?? '',
    });

    // Target pin -> source (bidirectional)
    const targetKey = `${edge.target}:${edge.targetHandle}`;
    if (!map.has(targetKey)) map.set(targetKey, []);
    map.get(targetKey)!.push({
      nodeName: edge.source,
      pinId: edge.sourceHandle ?? '',
    });
  }

  return map;
}

/**
 * Convert React Flow nodes and edges back to UE T3D paste text.
 */
export function flowToT3D(nodes: Node[], edges: Edge[]): string {
  const linkedToMap = buildLinkedToMap(edges);
  const blocks: string[] = [];

  for (const node of nodes) {
    const data = node.data as FlowNodeData;
    if (!data) continue;

    // Skip comment nodes — they use a different format
    if (data.ueType === 'comment') continue;

    const lines: string[] = [];

    // Header
    lines.push(`Begin Object Class=${data.nodeClass} Name="${node.id}"`);

    // Properties
    if (data.properties) {
      for (const [key, value] of Object.entries(data.properties)) {
        lines.push(`   ${key}=${value}`);
      }
    }

    // Position (use React Flow position, rounded to int)
    lines.push(`   NodePosX=${Math.round(node.position.x)}`);
    lines.push(`   NodePosY=${Math.round(node.position.y)}`);

    // GUID
    lines.push(`   NodeGuid=${data.nodeGuid}`);

    // Pins with linked_to
    for (const pin of data.pins) {
      const pinKey = `${node.id}:${pin.id}`;
      const linked = linkedToMap.get(pinKey) ?? [];
      lines.push(serializePinWithLinks(pin, linked));
    }

    lines.push('End Object');
    blocks.push(lines.join('\n'));
  }

  return blocks.join('\n\n');
}
