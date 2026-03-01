import type { FC } from 'react';

interface NodeHeaderProps {
  title: string;
  ueType: string;
  isPure?: boolean;
}

// More saturated colors for better visibility against dark background
const TYPE_COLORS: Record<string, string> = {
  event: '#B40000',
  call_function: '#1060A8',
  function: '#1060A8',
  branch: '#404040',
  variable_get: '#208050',
  variable_set: '#208050',
  macro: '#8020a0',
  comment: '#4a4a5a',
  cast: '#30a060',
  switch: '#8a8a20',
  select: '#8a8a20',
  function_entry: '#B40000',
  function_result: '#20a040',
  tunnel: '#5a5a7a',
  reroute: '#4a4a5a',
  make_array: '#1060A8',
};

const TYPE_ICONS: Record<string, string> = {
  event: '\u25C6',
  function_entry: '\u25C6',
  function: 'f',
  call_function: 'f',
  branch: 'B',
  macro: 'M',
  cast: 'C',
};

/** UE5 compact title icons — K2Node_CallFunction::GetCompactNodeTitle() symbol map. */
export const COMPACT_TITLE_ICONS: Record<string, string> = {
  'Add':            '+',
  'Subtract':       '\u2212',
  'Multiply':       '\u00D7',
  'Divide':         '\u00F7',
  'Modulo':         '%',
  'Power':          '^',
  'Negate':         '\u00B1',
  'Dot Product':    '\u00B7',
  'Cross Product':  '\u00D7',
  'Equal':          '==',
  'Not Equal':      '!=',
  'Less':           '<',
  'Less Equal':     '\u2264',
  'Greater':        '>',
  'Greater Equal':  '\u2265',
  'AND Boolean':    '&&',
  'OR Boolean':     '||',
  'NOT Boolean':    '!',
};

export const NodeHeader: FC<NodeHeaderProps> = ({ title, ueType, isPure }) => {
  const color = TYPE_COLORS[ueType] ?? '#3060a0';
  const icon = TYPE_ICONS[ueType];
  const compactIcon = COMPACT_TITLE_ICONS[title];

  // Compact mode: show operator symbol instead of title
  if (compactIcon && ueType === 'call_function') {
    return (
      <div
        className="ueflow-node-header"
        style={{ '--header-accent': color } as React.CSSProperties}
      >
        <span className="ueflow-node-operator">{compactIcon}</span>
      </div>
    );
  }

  return (
    <div
      className="ueflow-node-header"
      style={{ '--header-accent': color } as React.CSSProperties}
    >
      {isPure && <span className="ueflow-node-pure" title="Pure function">&#9671;</span>}
      {icon && <span className="ueflow-node-icon">{icon}</span>}
      <span className="ueflow-node-title">{title}</span>
    </div>
  );
};
