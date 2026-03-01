import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeResizer } from '@xyflow/react';

interface CommentNodeData {
  title: string;
  ueType: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

function parseCommentColor(commentColor: string): { r: number; g: number; b: number; a: number } | null {
  const colorMatch = commentColor.match(/R=([\d.]+).*?G=([\d.]+).*?B=([\d.]+).*?A=([\d.]+)/);
  if (!colorMatch) return null;
  return {
    r: Math.round(parseFloat(colorMatch[1]) * 255),
    g: Math.round(parseFloat(colorMatch[2]) * 255),
    b: Math.round(parseFloat(colorMatch[3]) * 255),
    a: parseFloat(colorMatch[4]),
  };
}

export const CommentNode = memo(({ data, selected }: NodeProps) => {
  const { title, properties } = data as unknown as CommentNodeData;

  const commentColor = (properties?.CommentColor as string) ?? '';
  const parsed = parseCommentColor(commentColor);
  const headerBg = parsed
    ? `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0.22)`
    : 'rgba(255, 255, 255, 0.06)';
  const bodyBg = parsed
    ? `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0.12)`
    : 'rgba(255, 255, 255, 0.04)';
  const borderColor = parsed
    ? `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0.35)`
    : 'rgba(255, 255, 255, 0.1)';

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={150}
        minHeight={60}
        lineClassName="ueflow-comment-resize-line"
        handleClassName="ueflow-comment-resize-handle"
      />
      <div className="ueflow-comment-node" style={{ border: `1px solid ${borderColor}` }} aria-label={`Comment: ${title}`}>
        <div
          className="ueflow-comment-header"
          style={{ background: headerBg }}
        >
          <span className="ueflow-comment-title">{title}</span>
        </div>
        <div className="ueflow-comment-body" style={{ background: bodyBg }} />
      </div>
    </>
  );
});

CommentNode.displayName = 'CommentNode';
