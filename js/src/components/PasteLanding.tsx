import { useState, useRef, useCallback } from 'react';
import type { UEGraphJSON } from '../types/ue-graph';
import { parseT3DToGraphJSON, isT3DText } from '../transform/t3d-to-json';

interface PasteLandingProps {
  onGraphParsed: (graphJSON: UEGraphJSON) => void;
}

export function PasteLanding({ onGraphParsed }: PasteLandingProps) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Paste T3D text first.');
      return;
    }
    if (!isT3DText(trimmed)) {
      setError('Not valid T3D paste text. Expected "Begin Object Class=..." blocks.');
      return;
    }
    try {
      const graph = parseT3DToGraphJSON(trimmed);
      if (graph.nodes.length === 0) {
        setError('No nodes found in T3D text.');
        return;
      }
      setError('');
      onGraphParsed(graph);
    } catch (err) {
      setError(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [text, onGraphParsed]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (error) setError('');
  }, [error]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        setText(content);
        if (error) setError('');
      };
      reader.readAsText(file);
    },
    [error],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <div className="ueflow-paste-landing">
      <div className="ueflow-paste-card">
        <div className="ueflow-paste-icon">&#9670;</div>
        <div className="ueflow-paste-title">Paste Blueprint</div>
        <div className="ueflow-paste-subtitle">
          Copy nodes in Unreal Editor (Ctrl+C) and paste the T3D text below.
        </div>
        <textarea
          ref={textareaRef}
          className={`ueflow-paste-textarea${dragOver ? ' ueflow-paste-textarea--dragover' : ''}`}
          placeholder={'Begin Object Class=/Script/BlueprintGraph...'}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          autoFocus
          spellCheck={false}
        />
        {error && <div className="ueflow-paste-error">{error}</div>}
        <button
          className="ueflow-paste-btn"
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          Render Blueprint
        </button>
        <div className="ueflow-paste-hint">or Ctrl+Enter</div>
      </div>
    </div>
  );
}
