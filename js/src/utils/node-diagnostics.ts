/**
 * Node diagnostics — detect errors and warnings on Blueprint nodes.
 */
import type { FlowNodeData } from '../types/flow-types';
import type { BlueprintFlowEdge } from '../types/flow-types';
import { isExecPin } from '../types/pin-types';

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
}

/** Check a single node for diagnostic issues. */
export function diagnoseNode(
  data: FlowNodeData,
  nodeId: string,
  edges: BlueprintFlowEdge[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const shortClass = data.nodeClass?.includes('.') ? data.nodeClass.split('.').pop()! : (data.nodeClass ?? '');

  // Missing FunctionReference on call function nodes
  if (shortClass === 'K2Node_CallFunction') {
    const ref = data.properties?.FunctionReference;
    if (!ref || String(ref) === '' || String(ref) === '()') {
      diagnostics.push({ severity: 'error', message: 'Missing FunctionReference — node will be dropped by UE' });
    }
  }

  // Missing EventReference on event nodes
  if (shortClass === 'K2Node_Event') {
    const ref = data.properties?.EventReference;
    if (!ref || String(ref) === '' || String(ref) === '()') {
      diagnostics.push({ severity: 'error', message: 'Missing EventReference — event will show as "Event None"' });
    }
  }

  // Missing VariableReference on variable nodes
  if (shortClass === 'K2Node_VariableGet' || shortClass === 'K2Node_VariableSet') {
    const ref = data.properties?.VariableReference;
    if (!ref || String(ref) === '' || String(ref) === '()') {
      diagnostics.push({ severity: 'error', message: 'Missing VariableReference — variable will be unresolved' });
    }
  }

  // Unreachable impure node: has exec input pin but no incoming exec connection.
  // Only warn when the node has at least one outgoing edge (i.e. it's wired into the graph
  // but missing its exec input). Isolated/freshly-placed nodes are not flagged.
  const hasExecInput = data.pins?.some((p) => p.direction === 'input' && isExecPin(p.category));
  if (hasExecInput) {
    const execInputPins = data.pins.filter((p) => p.direction === 'input' && isExecPin(p.category));
    const hasIncomingExec = execInputPins.some((pin) =>
      edges.some((e) => e.target === nodeId && e.targetHandle === pin.id),
    );
    const hasAnyConnection = edges.some((e) => e.source === nodeId || e.target === nodeId);
    if (!hasIncomingExec && hasAnyConnection && data.ueType !== 'event' && data.ueType !== 'function_entry' && data.ueType !== 'input' && data.ueType !== 'component_event') {
      diagnostics.push({ severity: 'warning', message: 'No incoming exec connection — node may be unreachable' });
    }
  }

  return diagnostics;
}
