/**
 * Searchable node palette for creating new nodes.
 * Opens on right-click on empty canvas or Tab key.
 * Searches 2,700+ functions from the signature DB.
 */
import { useState, useRef, useEffect, useMemo, type FC } from 'react';
import { searchFunctions, getSignatureDB } from '../utils/signature-db';
import { getRegisteredStructs } from '../utils/struct-registry';

export interface PaletteResult {
  memberName: string;
  memberParent: string;
  isPure: boolean;
  isLatent?: boolean;
}

/** Special entries that don't come from the signature DB. */
const SPECIAL_ENTRIES: Array<{ label: string; group: string; nodeClass: string; memberName?: string; searchTerms?: string[] }> = [
  { label: 'Event BeginPlay', group: 'Events', nodeClass: 'K2Node_Event', memberName: 'ReceiveBeginPlay' },
  { label: 'Event Tick', group: 'Events', nodeClass: 'K2Node_Event', memberName: 'ReceiveTick' },
  { label: 'Custom Event', group: 'Events', nodeClass: 'K2Node_CustomEvent' },
  { label: 'Component Begin Overlap', group: 'Events', nodeClass: 'K2Node_ComponentBoundEvent', memberName: 'OnComponentBeginOverlap' },
  { label: 'Component End Overlap', group: 'Events', nodeClass: 'K2Node_ComponentBoundEvent', memberName: 'OnComponentEndOverlap' },
  { label: 'Enhanced Input Action', group: 'Events', nodeClass: 'K2Node_EnhancedInputAction' },
  { label: 'Input Key Event', group: 'Input Events', nodeClass: 'K2Node_InputKeyEvent', searchTerms: ['keyboard', 'key press', 'key release'] },
  { label: 'Input Action Event', group: 'Input Events', nodeClass: 'K2Node_InputActionEvent', searchTerms: ['action mapping', 'input action'] },
  { label: 'Input Touch Event', group: 'Input Events', nodeClass: 'K2Node_InputTouchEvent', searchTerms: ['touch', 'mobile', 'finger'] },
  { label: 'Input Axis Event', group: 'Input Events', nodeClass: 'K2Node_InputAxisEvent', searchTerms: ['axis', 'gamepad', 'analog'] },
  { label: 'Branch', group: 'Flow Control', nodeClass: 'K2Node_IfThenElse' },
  { label: 'Sequence', group: 'Flow Control', nodeClass: 'K2Node_ExecutionSequence' },
  { label: 'For Each Loop', group: 'Flow Control', nodeClass: 'K2Node_ForEachLoop' },
  { label: 'Do Once', group: 'Flow Control', nodeClass: 'K2Node_DoOnce' },
  { label: 'Gate', group: 'Flow Control', nodeClass: 'K2Node_Gate' },
  { label: 'Flip Flop', group: 'Flow Control', nodeClass: 'K2Node_FlipFlop' },
  { label: 'Delay', group: 'Flow Control', nodeClass: 'K2Node_Delay' },
  { label: 'For Loop', group: 'Flow Control', nodeClass: 'K2Node_MacroInstance', memberName: 'ForLoop' },
  { label: 'For Loop With Break', group: 'Flow Control', nodeClass: 'K2Node_MacroInstance', memberName: 'ForLoopWithBreak' },
  { label: 'While Loop', group: 'Flow Control', nodeClass: 'K2Node_MacroInstance', memberName: 'WhileLoop' },
  { label: 'MultiGate', group: 'Flow Control', nodeClass: 'K2Node_MultiGate' },
  { label: 'Timeline', group: 'Flow Control', nodeClass: 'K2Node_Timeline' },
  { label: 'Switch on Enum', group: 'Flow Control', nodeClass: 'K2Node_SwitchEnum', searchTerms: ['switch', 'enum', 'case'] },
  { label: 'Switch on String', group: 'Flow Control', nodeClass: 'K2Node_SwitchString', searchTerms: ['switch', 'string', 'case', 'text'] },
  { label: 'Switch on Name', group: 'Flow Control', nodeClass: 'K2Node_SwitchName', searchTerms: ['switch', 'name', 'case'] },
  { label: 'Async Action', group: 'Flow Control', nodeClass: 'K2Node_AsyncAction', searchTerms: ['async', 'latent', 'task'] },
  { label: 'Comment', group: 'Utility', nodeClass: 'EdGraphNode_Comment' },
  { label: 'Reroute', group: 'Utility', nodeClass: 'K2Node_Knot' },
  { label: 'Self Reference', group: 'Utility', nodeClass: 'K2Node_Self' },
  { label: 'Print String', group: 'Utility', nodeClass: 'K2Node_CallFunction', memberName: 'PrintString' },
  { label: 'IsValid', group: 'Utility', nodeClass: 'K2Node_CallFunction', memberName: 'IsValid' },
  { label: 'Create Widget', group: 'Utility', nodeClass: 'K2Node_CreateWidget', searchTerms: ['widget', 'ui', 'umg', 'hud', 'create'] },
  { label: 'Variable Get', group: 'Variables', nodeClass: 'K2Node_VariableGet' },
  { label: 'Variable Set', group: 'Variables', nodeClass: 'K2Node_VariableSet' },
  // Spawning
  { label: 'Spawn Actor From Class', group: 'Spawning', nodeClass: 'K2Node_SpawnActorFromClass' },
  // Delegates
  { label: 'Call Delegate', group: 'Delegates', nodeClass: 'K2Node_CallDelegate' },
  { label: 'Bind Delegate', group: 'Delegates', nodeClass: 'K2Node_AddDelegate' },
  { label: 'Unbind Delegate', group: 'Delegates', nodeClass: 'K2Node_RemoveDelegate' },
  // Casting
  { label: 'Cast To Actor', group: 'Casting', nodeClass: 'K2Node_DynamicCast' },
  { label: 'Cast To Pawn', group: 'Casting', nodeClass: 'K2Node_DynamicCast' },
  { label: 'Cast To Character', group: 'Casting', nodeClass: 'K2Node_DynamicCast' },
  { label: 'Cast To PlayerController', group: 'Casting', nodeClass: 'K2Node_DynamicCast' },
  { label: 'Cast To GameModeBase', group: 'Casting', nodeClass: 'K2Node_DynamicCast' },
  { label: 'Cast To PlayerState', group: 'Casting', nodeClass: 'K2Node_DynamicCast' },
  { label: 'Cast To ActorComponent', group: 'Casting', nodeClass: 'K2Node_DynamicCast' },
  { label: 'Cast To Widget', group: 'Casting', nodeClass: 'K2Node_DynamicCast' },
  { label: 'Class Dynamic Cast', group: 'Casting', nodeClass: 'K2Node_ClassDynamicCast', searchTerms: ['cast', 'class', 'type', 'safe'] },
  // Struct Break/Make — generated from struct registry
  ...getRegisteredStructs().flatMap((name) => {
    const short = name.startsWith('F') ? name.slice(1) : name;
    return [
      { label: `Break ${short}`, group: 'Structs', nodeClass: 'K2Node_BreakStruct', memberName: name },
      { label: `Make ${short}`, group: 'Structs', nodeClass: 'K2Node_MakeStruct', memberName: name },
    ];
  }),
];

/** Set of node titles already on the canvas — used to filter out duplicate unique nodes (e.g. events). */
interface NodePaletteProps {
  x: number;
  y: number;
  onSelect: (entry: { label: string; nodeClass: string; memberName?: string; memberParent?: string; isPure?: boolean; isLatent?: boolean }) => void;
  onClose: () => void;
  /** Node titles already on the canvas (for duplicate prevention on unique nodes like events). */
  existingTitles?: Set<string>;
}

export const NodePalette: FC<NodePaletteProps> = ({ x, y, onSelect, onClose, existingTitles }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Unique node classes — only one allowed per graph (events with specific memberName)
  const isUniqueNode = (e: { nodeClass: string; memberName?: string }) =>
    e.nodeClass === 'K2Node_Event' && !!e.memberName;

  const isDuplicate = (e: { label: string; nodeClass: string; memberName?: string }) => {
    if (!existingTitles || !isUniqueNode(e)) return false;
    return existingTitles.has(e.label.toLowerCase());
  };

  // Search results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return SPECIAL_ENTRIES
        .filter((e) => !isDuplicate(e))
        .map((e) => ({
          label: e.label,
          group: e.group,
          nodeClass: e.nodeClass,
          memberName: e.memberName,
          memberParent: undefined as string | undefined,
          isPure: false,
          isLatent: false,
        }));
    }

    // Filter special entries
    const specialMatches = SPECIAL_ENTRIES
      .filter((e) => (e.label.toLowerCase().includes(q) || e.searchTerms?.some((t) => t.toLowerCase().includes(q))) && !isDuplicate(e))
      .map((e) => ({
        label: e.label,
        group: e.group,
        nodeClass: e.nodeClass,
        memberName: e.memberName,
        memberParent: undefined as string | undefined,
        isPure: false,
        isLatent: false,
      }));

    // Search signature DB
    const dbMatches = searchFunctions(q, 30).map((sig) => ({
      label: sig.memberName,
      group: extractClassShort(sig.memberParent),
      nodeClass: 'K2Node_CallFunction',
      memberName: sig.memberName,
      memberParent: sig.memberParent,
      isPure: sig.isPure,
      isLatent: sig.isLatent ?? false,
    }));

    return [...specialMatches, ...dbMatches].slice(0, 40);
  }, [query, existingTitles]);

  // Reset selection when query changes
  useEffect(() => setSelectedIndex(0), [query]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      onSelect(results[selectedIndex]);
      onClose();
    }
  };

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) panelRef.current.style.left = `${x - rect.width}px`;
    if (rect.bottom > vh) panelRef.current.style.top = `${y - rect.height}px`;
  }, [x, y]);

  return (
    <div
      ref={panelRef}
      className="ueflow-node-palette"
      style={{ position: 'fixed', left: x, top: y }}
    >
      <input
        ref={inputRef}
        className="ueflow-node-palette-search"
        type="text"
        placeholder="Search nodes..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div ref={listRef} className="ueflow-node-palette-list">
        {results.length === 0 && (
          <div className="ueflow-node-palette-empty">No matches</div>
        )}
        {results.map((entry, i) => (
          <button
            key={`${entry.nodeClass}-${entry.label}-${i}`}
            className={`ueflow-node-palette-item${i === selectedIndex ? ' ueflow-node-palette-item--selected' : ''}`}
            onMouseEnter={() => setSelectedIndex(i)}
            onClick={() => { onSelect(entry); onClose(); }}
          >
            <span className="ueflow-node-palette-label">{entry.label}</span>
            <span className="ueflow-node-palette-group">{entry.group}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

function extractClassShort(memberParent: string): string {
  // "/Script/Engine.KismetSystemLibrary" → "KismetSystemLibrary"
  const dot = memberParent.lastIndexOf('.');
  return dot >= 0 ? memberParent.slice(dot + 1) : memberParent;
}
