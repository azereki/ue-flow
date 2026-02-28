import type { FC } from 'react';

interface NodeHeaderProps {
  title: string;
  ueType: string;
  category?: string;
}

// More saturated colors for better visibility against dark background
const TYPE_COLORS: Record<string, string> = {
  event: '#b22020',
  call_function: '#2070b0',
  function: '#2070b0',
  branch: '#8a8a20',
  variable_get: '#208050',
  variable_set: '#208050',
  macro: '#8020a0',
  comment: '#4a4a5a',
  cast: '#30a060',
  switch: '#8a8a20',
  select: '#8a8a20',
  function_entry: '#b02020',
  function_result: '#20a040',
  tunnel: '#5a5a7a',
  reroute: '#4a4a5a',
  make_array: '#2070b0',
};

export const NodeHeader: FC<NodeHeaderProps> = ({ title, ueType }) => {
  const color = TYPE_COLORS[ueType] ?? '#3060a0';
  return (
    <div
      className="ueflow-node-header"
      style={{ '--header-accent': color } as React.CSSProperties}
    >
      <span className="ueflow-node-title">{title}</span>
    </div>
  );
};
