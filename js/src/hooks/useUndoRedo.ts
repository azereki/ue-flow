import { useCallback, useEffect, useRef } from 'react';
import type { AnyFlowNode, BlueprintFlowNode } from '../types/flow-types';

interface PinValueMap {
  /** nodeId -> pinId -> defaultValue */
  [nodeId: string]: { [pinId: string]: string };
}

interface Snapshot {
  positions: Map<string, { x: number; y: number }>;
  /** Saved pin default values for all blueprint nodes, so edits are also undoable. */
  pinValues: PinValueMap;
}

const MAX_STACK = 50;

function capturePositions(nodes: AnyFlowNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    positions.set(n.id, { ...n.position });
  }
  return positions;
}

function capturePinValues(nodes: AnyFlowNode[]): PinValueMap {
  const pinValues: PinValueMap = {};
  for (const n of nodes) {
    if (n.type !== 'blueprintNode') continue;
    const bp = n as BlueprintFlowNode;
    const nodeEntry: { [pinId: string]: string } = {};
    for (const pin of bp.data.pins) {
      if (pin.defaultValue) nodeEntry[pin.id] = pin.defaultValue;
    }
    if (Object.keys(nodeEntry).length > 0) {
      pinValues[n.id] = nodeEntry;
    }
  }
  return pinValues;
}

export function useUndoRedo(
  nodes: AnyFlowNode[],
  setNodes: (updater: (nodes: AnyFlowNode[]) => AnyFlowNode[]) => void,
) {
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const captureSnapshot = useCallback(() => {
    const snapshot: Snapshot = {
      positions: capturePositions(nodesRef.current),
      pinValues: capturePinValues(nodesRef.current),
    };
    undoStack.current.push(snapshot);
    if (undoStack.current.length > MAX_STACK) {
      undoStack.current.shift();
    }
    redoStack.current = [];
  }, []);

  const applySnapshot = useCallback((snapshot: Snapshot, saveCurrent: 'undo' | 'redo') => {
    // Save current state to the opposite stack before restoring
    const current: Snapshot = {
      positions: capturePositions(nodesRef.current),
      pinValues: capturePinValues(nodesRef.current),
    };
    if (saveCurrent === 'undo') {
      redoStack.current.push(current);
    } else {
      undoStack.current.push(current);
    }

    setNodes((prev) =>
      prev.map((n) => {
        const pos = snapshot.positions.get(n.id);
        const withPos = pos ? { ...n, position: pos } : n;

        // Restore pin values for blueprint nodes
        if (withPos.type !== 'blueprintNode') return withPos;
        const bp = withPos as BlueprintFlowNode;
        const savedPins = snapshot.pinValues[n.id];
        if (!savedPins) return withPos;

        const restoredPins = bp.data.pins.map((p) =>
          savedPins[p.id] !== undefined
            ? { ...p, defaultValue: savedPins[p.id] }
            : p,
        );
        return { ...bp, data: { ...bp.data, pins: restoredPins } };
      }),
    );
  }, [setNodes]);

  const undo = useCallback(() => {
    const snapshot = undoStack.current.pop();
    if (!snapshot) return;
    applySnapshot(snapshot, 'undo');
  }, [applySnapshot]);

  const redo = useCallback(() => {
    const snapshot = redoStack.current.pop();
    if (!snapshot) return;
    applySnapshot(snapshot, 'redo');
  }, [applySnapshot]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return { captureSnapshot, undo, redo };
}
