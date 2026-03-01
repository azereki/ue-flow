import { useCallback, useEffect, useRef } from 'react';
import type { Node } from '@xyflow/react';

interface Snapshot {
  positions: Map<string, { x: number; y: number }>;
}

const MAX_STACK = 50;

export function useUndoRedo(
  nodes: Node[],
  setNodes: (updater: (nodes: Node[]) => Node[]) => void,
) {
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const captureSnapshot = useCallback(() => {
    const positions = new Map<string, { x: number; y: number }>();
    for (const n of nodesRef.current) {
      positions.set(n.id, { ...n.position });
    }
    undoStack.current.push({ positions });
    if (undoStack.current.length > MAX_STACK) {
      undoStack.current.shift();
    }
    redoStack.current = [];
  }, []);

  const undo = useCallback(() => {
    const snapshot = undoStack.current.pop();
    if (!snapshot) return;

    // Save current state to redo stack
    const current = new Map<string, { x: number; y: number }>();
    for (const n of nodesRef.current) {
      current.set(n.id, { ...n.position });
    }
    redoStack.current.push({ positions: current });

    // Restore positions
    setNodes((prev) =>
      prev.map((n) => {
        const pos = snapshot.positions.get(n.id);
        return pos ? { ...n, position: pos } : n;
      }),
    );
  }, [setNodes]);

  const redo = useCallback(() => {
    const snapshot = redoStack.current.pop();
    if (!snapshot) return;

    // Save current state to undo stack
    const current = new Map<string, { x: number; y: number }>();
    for (const n of nodesRef.current) {
      current.set(n.id, { ...n.position });
    }
    undoStack.current.push({ positions: current });

    // Restore positions
    setNodes((prev) =>
      prev.map((n) => {
        const pos = snapshot.positions.get(n.id);
        return pos ? { ...n, position: pos } : n;
      }),
    );
  }, [setNodes]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
