import { memo, useState, useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NodeResizer } from '@xyflow/react';

interface CommentNodeData {
  title: string;
  ueType: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

export const CommentNode = memo(({ data, selected }: NodeProps) => {
  const { title, properties } = data as unknown as CommentNodeData;
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  // Extract comment color from properties if available
  const commentColor = (properties?.CommentColor as string) ?? '';
  let bgColor = 'rgba(255, 255, 255, 0.05)';
  // Parse UE color format: (R=0.1,G=0.2,B=0.3,A=0.4)
  const colorMatch = commentColor.match(/R=([\d.]+).*?G=([\d.]+).*?B=([\d.]+).*?A=([\d.]+)/);
  if (colorMatch) {
    const r = Math.round(parseFloat(colorMatch[1]) * 255);
    const g = Math.round(parseFloat(colorMatch[2]) * 255);
    const b = Math.round(parseFloat(colorMatch[3]) * 255);
    const a = parseFloat(colorMatch[4]) * 0.3; // Reduce opacity for readability
    bgColor = `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
    // Prevent React Flow from intercepting keyboard events
    e.stopPropagation();
  }, []);

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={150}
        minHeight={60}
        lineClassName="ueflow-comment-resize-line"
        handleClassName="ueflow-comment-resize-handle"
      />
      <div
        className="ueflow-comment"
        style={{ backgroundColor: bgColor }}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <input
            className="ueflow-comment-title-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <div className="ueflow-comment-title">{editTitle || title}</div>
        )}
      </div>
    </>
  );
});

CommentNode.displayName = 'CommentNode';
