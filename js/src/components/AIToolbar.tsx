import { useState, useCallback, type FC } from 'react';
import { useAIProvider } from '../contexts/AIProviderContext';
import { useAIAction } from '../hooks/useAIAction';
import { AIResultModal } from './AIResultModal';
import { AISettings } from './AISettings';

interface AIToolbarProps {
  graphContext: string;
  onNavigateToNode?: (graphName: string, nodeTitle: string) => void;
  nodeTitles?: string[];
}

const DOCUMENT_SYSTEM_PROMPT = `You are a UE Blueprint documentation generator. Given the Blueprint context below, generate clear, structured documentation in markdown format. Include:
- **Overview**: What this Blueprint does (1-2 sentences)
- **Events**: Each event, what triggers it, and what it does
- **Functions**: Each function, its purpose, parameters, and return values
- **Variables**: Key variables and what they track
- **Data Flow**: How data flows between nodes
- **Key Connections**: Important execution and data paths

Use UE terminology. Be specific — reference actual node titles and pin names from the context. Keep it concise but comprehensive.`;

const REVIEW_SYSTEM_PROMPT = `You are a UE Blueprint code reviewer. Analyze the Blueprint context below for issues and best practices. Report findings in this format:

For each issue found, use:
**[SEVERITY]** Issue title
- **Where:** Node/area affected
- **Problem:** What's wrong
- **Fix:** How to fix it

Severity levels: WARNING (potential bugs/crashes), INFO (best practices), SUGGESTION (improvements)

Check for:
- Missing IsValid checks after casts
- Expensive operations on Tick (performance)
- Unused variables
- Dead-end execution paths (nodes with no output connections that should have them)
- Complex cast chains that could be simplified
- Missing error handling on async operations
- Blueprint best practices violations

If the Blueprint looks clean, say so briefly. Be specific — reference actual node titles.`;

const SEARCH_SYSTEM_PROMPT = `You are a UE Blueprint search engine. Given a Blueprint context and a user's natural language query, find the most relevant nodes.

IMPORTANT: Your response MUST start with a JSON block in this exact format:
\`\`\`json
{"matches": [{"graph": "GraphName", "nodeTitle": "Exact Node Title", "reason": "Why this matches"}]}
\`\`\`

After the JSON block, add a brief natural language explanation.

Rules:
- Use exact node titles from the context
- Use exact graph names from the context
- Return up to 5 most relevant matches
- If no matches found, return {"matches": []} and explain why`;

type ModalType = 'document' | 'review' | 'search' | null;

export const AIToolbar: FC<AIToolbarProps> = ({ graphContext, onNavigateToNode, nodeTitles }) => {
  const { ready } = useAIProvider();
  const { loading, result, error, execute, clear } = useAIAction();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleDocument = useCallback(async () => {
    setActiveModal('document');
    await execute(DOCUMENT_SYSTEM_PROMPT, graphContext);
  }, [execute, graphContext]);

  const handleReview = useCallback(async () => {
    setActiveModal('review');
    await execute(REVIEW_SYSTEM_PROMPT, graphContext);
  }, [execute, graphContext]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setActiveModal('search');
    const text = await execute(SEARCH_SYSTEM_PROMPT, `Query: "${searchQuery}"\n\nBlueprint Context:\n${graphContext}`);
    if (text && onNavigateToNode) {
      try {
        const jsonMatch = text.match(/```json\s*\n?([\s\S]*?)\n?\s*```/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]) as { matches?: { graph: string; nodeTitle: string }[] };
          if (parsed.matches?.[0]) {
            onNavigateToNode(parsed.matches[0].graph, parsed.matches[0].nodeTitle);
          }
        }
      } catch {
        // JSON parse failed — result still shows in modal
      }
    }
  }, [execute, graphContext, searchQuery, onNavigateToNode]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowSearch(false);
      setSearchQuery('');
    }
  }, [handleSearch]);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
    clear();
  }, [clear]);

  const modalTitle = activeModal === 'document' ? 'Blueprint Documentation'
    : activeModal === 'review' ? 'Blueprint Review'
    : activeModal === 'search' ? 'Search Results'
    : '';

  const disableActions = loading || !ready;

  return (
    <>
      <div className="ueflow-ai-toolbar">
        <button
          className="ueflow-ai-toolbar-btn"
          onClick={handleDocument}
          disabled={disableActions}
          title="Generate documentation for this Blueprint"
        >
          &#128196; Document
        </button>
        <button
          className="ueflow-ai-toolbar-btn"
          onClick={handleReview}
          disabled={disableActions}
          title="Review this Blueprint for issues"
        >
          &#128269; Review
        </button>
        {showSearch ? (
          <div className="ueflow-ai-toolbar-search">
            <input
              className="ueflow-ai-toolbar-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="e.g. Where does damage happen?"
              autoFocus
              disabled={loading}
            />
            <button
              className="ueflow-ai-toolbar-btn"
              onClick={handleSearch}
              disabled={!searchQuery.trim() || disableActions}
            >
              Go
            </button>
            <button
              className="ueflow-ai-toolbar-btn"
              onClick={() => { setShowSearch(false); setSearchQuery(''); }}
            >
              &#10005;
            </button>
          </div>
        ) : (
          <button
            className="ueflow-ai-toolbar-btn"
            onClick={() => setShowSearch(true)}
            disabled={disableActions}
            title="Search Blueprint with natural language"
          >
            &#128270; Search
          </button>
        )}
        <AISettings />
      </div>

      {activeModal && (
        <AIResultModal
          title={modalTitle}
          loading={loading}
          result={result}
          error={error}
          onClose={handleCloseModal}
          nodeTitles={nodeTitles}
          onNavigateToNode={onNavigateToNode}
        />
      )}
    </>
  );
};
