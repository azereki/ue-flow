import type { FC } from 'react';

interface NodeHeaderProps {
  title: string;
  ueType: string;
  category?: string;
}

const TYPE_COLORS: Record<string, string> = {
  event: '#8b1a1a',
  call_function: '#1a5c8c',
  function: '#1a5c8c',
  branch: '#5c5c1a',
  variable_get: '#1a5c3a',
  variable_set: '#1a5c3a',
  macro: '#5c1a5c',
  comment: '#3a3a3a',
  cast: '#2a6e4a',
  switch: '#5c5c1a',
  select: '#5c5c1a',
  function_entry: '#8b1a1a',
  function_result: '#1a5c3a',
  tunnel: '#4a4a5c',
  reroute: '#3a3a3a',
  make_array: '#1a5c8c',
};

export const NodeHeader: FC<NodeHeaderProps> = ({ title, ueType }) => {
  const color = TYPE_COLORS[ueType] ?? '#3a4a5c';
  return (
    <div
      className="ueflow-node-header"
      style={{ '--header-accent': color } as React.CSSProperties}
    >
      <span className="ueflow-node-title">{title}</span>
    </div>
  );
};
