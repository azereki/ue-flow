/**
 * Typed React Flow node/edge aliases for ue-flow.
 *
 * Using generic Node<Data, Type> throughout the codebase eliminates the need
 * for `as unknown as FlowNodeData` casts at every data access site.
 */
import type { Node, Edge } from '@xyflow/react';
import type { UEPin } from './ue-graph';
import type { PinCategory } from './pin-types';

// ─── Node data shapes ────────────────────────────────────────────────────────

export interface FlowNodeData {
  ueType: string;
  nodeClass: string;
  nodeGuid: string;
  title: string;
  description?: string;
  category?: string;
  properties: Record<string, unknown>;
  pins: UEPin[];
  /** Override header accent color — e.g. variable getters tinted by pin type. */
  headerAccent?: string;
  /** True when the function is latent (async/blocking) — shows clock badge on header. */
  isLatent?: boolean;
  /** User-set annotation note displayed above the node. */
  annotation?: string;
  /**
   * Optional callback injected by SingleGraphView so that pin value edits inside
   * BlueprintNode can propagate up to the node store.  This keeps the data
   * one-way: node renders read from data.pins, edits write back through this
   * callback which calls setNodes, ensuring flowToT3D() always sees current values.
   */
  __setPinValue?: (nodeId: string, pinId: string, value: string) => void;
  [key: string]: unknown;
}

export interface CommentNodeData {
  ueType: 'comment';
  title: string;
  nodeGuid?: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BlueprintEdgeData extends Record<string, unknown> {
  category: PinCategory;
}

// ─── Typed node/edge aliases ─────────────────────────────────────────────────

export type BlueprintFlowNode = Node<FlowNodeData, 'blueprintNode'>;
export type CommentFlowNode = Node<CommentNodeData, 'commentNode'>;
export type AnyFlowNode = BlueprintFlowNode | CommentFlowNode;

export type BlueprintFlowEdge = Edge<BlueprintEdgeData, 'blueprintEdge'>;
