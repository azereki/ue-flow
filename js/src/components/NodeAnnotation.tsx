/**
 * Node annotation — small speech bubble rendered above a node header.
 * Double-click to edit inline, X button to remove.
 */
import { useState, useRef, useEffect, type FC } from 'react';

interface NodeAnnotationProps {
  text: string;
  onEdit: (text: string) => void;
  onRemove: () => void;
}

export const NodeAnnotation: FC<NodeAnnotationProps> = ({ text, onEdit, onRemove }) => {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleCommit = () => {
    setEditing(false);
    if (editText.trim() && editText !== text) {
      onEdit(editText.trim());
    } else {
      setEditText(text);
    }
  };

  return (
    <div className="ueflow-annotation" onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}>
      {editing ? (
        <input
          ref={inputRef}
          className="ueflow-annotation-input"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleCommit}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); if (e.key === 'Escape') { setEditing(false); setEditText(text); } }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <span className="ueflow-annotation-text" title={text}>
            {text.length > 40 ? text.slice(0, 37) + '...' : text}
          </span>
          <button className="ueflow-annotation-remove" onClick={(e) => { e.stopPropagation(); onRemove(); }} title="Remove note">&times;</button>
        </>
      )}
    </div>
  );
};
