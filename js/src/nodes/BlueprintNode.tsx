import { memo, useContext, useState, useCallback, useEffect, useMemo, type FC } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position, useStore } from '@xyflow/react';
import { NodeHeader, COMPACT_TITLE_ICONS } from './NodeHeader';
import { PinHandle } from './PinHandle';
import { PinValueEditor } from './PinValueEditor';
import { PinBodyContext } from '../contexts/PinBodyContext';
import type { BlueprintFlowNode } from '../types/flow-types';
import { isExecPin, PIN_COLORS } from '../types/pin-types';
import type { UEPin } from '../types/ue-graph';

/** Input pin row: holds edited value state shared between PinHandle hint and PinValueEditor. */
const InputPinRow: FC<{
  pin: UEPin;
  isConnected: boolean;
  onPinValueChange?: (pinId: string, value: string) => void;
}> = ({ pin, isConnected, onPinValueChange }) => {
  const [editedValue, setEditedValue] = useState(pin.defaultValue);
  // Sync local state from prop when undo/redo restores a previous value
  useEffect(() => { setEditedValue(pin.defaultValue); }, [pin.defaultValue]);
  const showEditor = !isExecPin(pin.category) && pin.defaultValue !== undefined && !isConnected;

  const handleValueChange = useCallback((value: string) => {
    setEditedValue(value);
    onPinValueChange?.(pin.id, value);
  }, [pin.id, onPinValueChange]);

  return (
    <div className="ueflow-pin-row">
      <PinHandle pin={pin} isConnected={isConnected} editedValue={showEditor ? editedValue : undefined} />
      {showEditor && (
        <PinValueEditor pin={pin} onValueChange={handleValueChange} />
      )}
    </div>
  );
};

/** Build a set of connected pin IDs for this node.
 *  Returns a string key from useStore (stable under ===) then derives Set via useMemo,
 *  so the component only re-renders when the actual connected-pin set changes. */
function useConnectedPins(pins: Array<{ id: string; direction: string }>) {
  const pinIdKey = JSON.stringify(pins.map(p => p.id));
  // Memoize a Set for O(1) lookup inside the selector (avoids O(n) includes per edge)
  const pinIdSet = useMemo(() => new Set<string>(JSON.parse(pinIdKey) as string[]), [pinIdKey]);
  const connectedKey = useStore(
    useCallback(
      (s: { edges: Array<{ sourceHandle?: string | null; targetHandle?: string | null }> }) => {
        const connected: string[] = [];
        for (const e of s.edges) {
          if (e.sourceHandle && pinIdSet.has(e.sourceHandle)) connected.push(e.sourceHandle);
          if (e.targetHandle && pinIdSet.has(e.targetHandle)) connected.push(e.targetHandle);
        }
        // Use | separator — UE pin IDs (GUIDs) never contain pipes
        return connected.sort().join('|');
      },
      [pinIdSet],
    ),
  );
  return useMemo(() => new Set(connectedKey ? connectedKey.split('|') : []), [connectedKey]);
}

export const BlueprintNode = memo(({ data, id }: NodeProps<BlueprintFlowNode>) => {
  const { title, ueType, pins, headerAccent } = data;
  const showPinBody = useContext(PinBodyContext);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const connectedPinIds = useConnectedPins(pins);

  // Issue 3: lift pin edits into node data via the setNodes callback stored on data.
  // When a user edits a pin value, we update the pin's defaultValue in the node store
  // so that flowToT3D() exports the edited value.
  // Extract the stable callback reference from data so the useCallback dependency
  // doesn't change on every render when the full data object identity changes.
  const setPinValue = data.__setPinValue;
  const handlePinValueChange = useCallback((pinId: string, value: string) => {
    setPinValue?.(id, pinId, value);
  }, [id, setPinValue]);

  // Reroute nodes: minimal 16px dot
  if (ueType === 'reroute') {
    const pin = pins[0];
    const color = pin ? (PIN_COLORS[pin.category] ?? '#808080') : '#808080';
    const inputPin = pins.find(p => p.direction === 'input');
    const outputPin = pins.find(p => p.direction === 'output');
    return (
      <div className="ueflow-reroute-node">
        <Handle type="target" position={Position.Left} id={inputPin?.id} className="ueflow-handle" style={{ '--pin-color': color, opacity: 0 } as React.CSSProperties} />
        <div className="ueflow-reroute-dot" style={{ background: color }} />
        <Handle type="source" position={Position.Right} id={outputPin?.id} className="ueflow-handle" style={{ '--pin-color': color, opacity: 0 } as React.CSSProperties} />
      </div>
    );
  }

  const visiblePins = pins.filter((p) => !p.hidden);
  const isPure = !pins.some((p) => isExecPin(p.category));
  const isCompact = ueType === 'call_function' && COMPACT_TITLE_ICONS[title] !== undefined;

  // Split input/output pins into standard and advanced groups
  const inputPins = visiblePins.filter(p => p.direction === 'input');
  const outputPins = visiblePins.filter(p => p.direction === 'output');

  const standardInputs = inputPins.filter(p => !p.advancedView);
  const advancedInputs = inputPins.filter(p => p.advancedView);
  const alwaysVisibleAdvancedInputs = advancedInputs.filter(p => connectedPinIds.has(p.id));
  const collapsibleAdvancedInputs = advancedInputs.filter(p => !connectedPinIds.has(p.id));

  const standardOutputs = outputPins.filter(p => !p.advancedView);
  const advancedOutputs = outputPins.filter(p => p.advancedView);
  const alwaysVisibleAdvancedOutputs = advancedOutputs.filter(p => connectedPinIds.has(p.id));
  const collapsibleAdvancedOutputs = advancedOutputs.filter(p => !connectedPinIds.has(p.id));

  const hasCollapsible = collapsibleAdvancedInputs.length > 0 || collapsibleAdvancedOutputs.length > 0;

  return (
    <div className="ueflow-node" data-ue-type={ueType} data-compact={isCompact ? '' : undefined} aria-label={`${ueType} node: ${title}`}>
      <NodeHeader title={title} ueType={ueType} isPure={isPure} headerAccent={headerAccent} />
      {ueType === 'select' && showPinBody && (
        <div className="ueflow-select-count">
          {outputPins.filter(p => !isExecPin(p.category)).length} options
        </div>
      )}
      {showPinBody && (
        <div className="ueflow-node-body">
          <div className="ueflow-pins-column ueflow-pins--input">
            {standardInputs.map(pin => <InputPinRow key={pin.id} pin={pin} isConnected={connectedPinIds.has(pin.id)} onPinValueChange={handlePinValueChange} />)}
            {alwaysVisibleAdvancedInputs.map(pin => <InputPinRow key={pin.id} pin={pin} isConnected={connectedPinIds.has(pin.id)} onPinValueChange={handlePinValueChange} />)}
            {showAdvanced && collapsibleAdvancedInputs.map(pin => <InputPinRow key={pin.id} pin={pin} isConnected={connectedPinIds.has(pin.id)} onPinValueChange={handlePinValueChange} />)}
          </div>
          <div className="ueflow-pins-column ueflow-pins--output">
            {standardOutputs.map(pin => <PinHandle key={pin.id} pin={pin} isConnected={connectedPinIds.has(pin.id)} />)}
            {alwaysVisibleAdvancedOutputs.map(pin => <PinHandle key={pin.id} pin={pin} isConnected={connectedPinIds.has(pin.id)} />)}
            {showAdvanced && collapsibleAdvancedOutputs.map(pin => <PinHandle key={pin.id} pin={pin} isConnected={connectedPinIds.has(pin.id)} />)}
          </div>
        </div>
      )}
      {hasCollapsible && showPinBody && (
        <button className="ueflow-advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
          <span className={`ueflow-advanced-arrow ${showAdvanced ? '' : 'ueflow-collapsed'}`}>&#9660;</span>
          <span>{collapsibleAdvancedInputs.length + collapsibleAdvancedOutputs.length} advanced</span>
        </button>
      )}
    </div>
  );
});

BlueprintNode.displayName = 'BlueprintNode';
