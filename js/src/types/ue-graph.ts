import type { PinCategory } from './pin-types';

export interface UEPin {
  id: string;
  name: string;
  friendlyName: string;
  direction: 'input' | 'output';
  category: PinCategory;
  subCategory: string;
  subCategoryObject: string;
  containerType: '' | 'Array' | 'Set' | 'Map';
  defaultValue: string;
  isReference: boolean;
  isConst: boolean;
  isWeak: boolean;
  hidden: boolean;
  advancedView: boolean;
  description?: string;
}

export interface UENode {
  id: string;
  type: string;
  nodeClass: string;
  nodeGuid: string;
  position: { x: number; y: number };
  title: string;
  description?: string;
  category?: string;
  properties: Record<string, unknown>;
  pins: UEPin[];
}

export interface UEEdge {
  id: string;
  source: string;
  sourcePin: string;
  target: string;
  targetPin: string;
  category: PinCategory;
}

export interface UEGraphJSON {
  metadata: {
    title: string;
    assetPath: string;
  };
  nodes: UENode[];
  edges: UEEdge[];
  summary?: string;
}

export interface UEMultiGraphJSON {
  metadata: { title: string };
  graphs: Record<string, UEGraphJSON>;
  events: Array<{ name: string; params?: string[] }>;
  functions: Array<{ name: string; category?: string; params?: string[]; returns?: string[] }>;
  variables: Array<{ name: string; type: string; category?: string; default?: string; replicated?: boolean }>;
  structs: Array<{ name: string; fields: Array<{ name: string; type: string; default?: string }> }>;
  delegates: Array<{ name: string; signature?: string }>;
  dataTables: Record<string, { sampleRows?: unknown[] }>;
  comparison: Record<string, { before: number; after: number }>;
}
