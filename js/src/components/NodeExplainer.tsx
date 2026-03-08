import { useState, useEffect, useRef, type FC } from 'react';
import { useAIAction } from '../hooks/useAIAction';

interface NodeExplainerProps {
  nodeTitle: string;
  nodeClass: string;
  position: { x: number; y: number };
  onDismiss: () => void;
}

const EXPLAIN_PROMPT = `You are a UE Blueprint expert. Explain what the given Blueprint node does in 2-3 sentences. Include what its key pins are for. Be concise and use UE terminology.`;

export const NodeExplainer: FC<NodeExplainerProps> = ({ nodeTitle, nodeClass, position, onDismiss }) => {
  const { loading, result, error, execute } = useAIAction();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const executedRef = useRef(false);

  // Debounce: wait 800ms before firing AI call
  useEffect(() => {
    executedRef.current = false;
    setVisible(false);
    timerRef.current = setTimeout(() => {
      setVisible(true);
      if (!executedRef.current) {
        executedRef.current = true;
        execute(EXPLAIN_PROMPT, `Node: "${nodeTitle}" (${nodeClass})`);
      }
    }, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [nodeTitle, nodeClass, execute]);

  // Dismiss on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="ueflow-node-explainer"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="ueflow-node-explainer-header">
        <span className="ueflow-node-explainer-title">{nodeTitle}</span>
        <button className="ueflow-node-explainer-close" onClick={onDismiss}>&#10005;</button>
      </div>
      <div className="ueflow-node-explainer-body">
        {loading && (
          <div className="ueflow-chat-thinking">
            <span className="ueflow-chat-thinking-dot" />
            <span className="ueflow-chat-thinking-dot" />
            <span className="ueflow-chat-thinking-dot" />
          </div>
        )}
        {error && <div className="ueflow-node-explainer-error">{error}</div>}
        {result && <div className="ueflow-node-explainer-text">{result}</div>}
      </div>
    </div>
  );
};
