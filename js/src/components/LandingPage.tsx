import { useState, useRef, useCallback } from 'react';
import { ReactFlow, Background, BackgroundVariant, useNodesState, useEdgesState, useStore } from '@xyflow/react';
import type { UEGraphJSON } from '../types/ue-graph';
import { parseT3DToGraphJSON, isT3DText } from '../transform/t3d-to-json';
import { graphJsonToFlow } from '../transform/json-to-flow';
import { BlueprintNode } from '../nodes/BlueprintNode';
import { CommentNode } from '../nodes/CommentNode';
import { BlueprintEdge } from '../edges/BlueprintEdge';
import { PinBodyContext } from '../contexts/PinBodyContext';
import { DEMO_GRAPH } from '../data/demo-graph';
import { zoomSelector } from '../utils/selectors';
import type { AnyFlowNode, BlueprintFlowEdge } from '../types/flow-types';

const nodeTypes = { blueprintNode: BlueprintNode, commentNode: CommentNode };
const edgeTypes = { blueprintEdge: BlueprintEdge };

interface LandingPageProps {
  onGraphParsed: (graphJSON: UEGraphJSON) => void;
}

/* ---------- Hero demo (read-only interactive graph) ---------- */

function PinBodyProvider({ children }: { children: React.ReactNode }) {
  const zoom = useStore(zoomSelector);
  return <PinBodyContext.Provider value={zoom >= 0.15}>{children}</PinBodyContext.Provider>;
}

function HeroDemo() {
  const initial = graphJsonToFlow(DEMO_GRAPH);
  const [nodes] = useNodesState<AnyFlowNode>(initial.nodes);
  const [edgesRaw] = useEdgesState(initial.edges);
  const edges = edgesRaw as BlueprintFlowEdge[];

  return (
    <div className="ueflow-landing-hero-graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesConnectable={false}
        nodesDraggable={false}
        panOnDrag={[0, 1, 2]}
        zoomOnScroll={false}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        aria-label="Blueprint graph demo"
      >
        <PinBodyProvider>
          <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.025)" gap={20} />
          <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.05)" gap={100} />
        </PinBodyProvider>
      </ReactFlow>
    </div>
  );
}

/* ---------- Paste section ---------- */

function PasteSection({ onGraphParsed }: { onGraphParsed: (g: UEGraphJSON) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) { setError('Paste T3D text first.'); return; }
    if (!isT3DText(trimmed)) { setError('Not valid T3D paste text. Expected "Begin Object Class=..." blocks.'); return; }
    try {
      const graph = parseT3DToGraphJSON(trimmed);
      if (graph.nodes.length === 0) { setError('No nodes found in T3D text.'); return; }
      setError('');
      onGraphParsed(graph);
    } catch (err) {
      setError(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [text, onGraphParsed]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(); }
  }, [handleSubmit]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setText(reader.result as string); setError(''); };
    reader.readAsText(file);
  }, []);

  return (
    <div className="ueflow-landing-paste">
      <textarea
        ref={textareaRef}
        className={`ueflow-paste-textarea${dragOver ? ' ueflow-paste-textarea--dragover' : ''}`}
        placeholder="Begin Object Class=/Script/BlueprintGraph..."
        value={text}
        onChange={(e) => { setText(e.target.value); if (error) setError(''); }}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        spellCheck={false}
      />
      {error && <div className="ueflow-paste-error">{error}</div>}
      <div className="ueflow-landing-paste-actions">
        <button className="ueflow-paste-btn" onClick={handleSubmit} disabled={!text.trim()}>
          Render Blueprint
        </button>
        <span className="ueflow-paste-hint">or Ctrl+Enter</span>
      </div>
    </div>
  );
}

/* ---------- Feature cards ---------- */

const FEATURES = [
  {
    icon: '\u26A1',
    title: 'Client-Side Rendering',
    desc: 'Parse and render Blueprints entirely in the browser. No server, no uploads, no dependencies.',
  },
  {
    icon: '\u21C4',
    title: 'Round-Trip T3D',
    desc: 'Export back to T3D paste text. Edit pin values in the viewer, then paste right back into Unreal.',
  },
  {
    icon: '\u2B50',
    title: 'Interactive Graphs',
    desc: 'Pan, zoom, select, and inspect nodes. MiniMap, export toolbar, and keyboard navigation built in.',
  },
  {
    icon: '\u{1F3A8}',
    title: 'Blueprint Noir Theme',
    desc: 'Dark theme designed to feel better than stock UE visuals. Pin colors, exec arrows, and glass headers.',
  },
  {
    icon: '\u{1F4E6}',
    title: 'Embed Anywhere',
    desc: 'Drop a single script tag on any page. Render graphs from JSON or T3D with the embed API.',
  },
  {
    icon: '\u{1F40D}',
    title: 'Python CLI',
    desc: 'Render Blueprints from the command line. Output self-contained HTML or PNG screenshots.',
  },
];

const STEPS = [
  { step: '1', title: 'Copy Nodes', desc: 'Select nodes in Unreal Editor and press Ctrl+C to copy T3D text.' },
  { step: '2', title: 'Paste Here', desc: 'Paste the T3D text into the textarea below and hit Render.' },
  { step: '3', title: 'Explore', desc: 'Pan, zoom, inspect pins, and export. Share the link or download PNG.' },
];

/* ---------- Main landing page ---------- */

export function LandingPage({ onGraphParsed }: LandingPageProps) {
  return (
    <div className="ueflow-landing">
      {/* Hero */}
      <section className="ueflow-landing-hero">
        <div className="ueflow-landing-hero-content">
          <h1 className="ueflow-landing-h1">
            Blueprint Graphs,<br />Rendered Anywhere
          </h1>
          <p className="ueflow-landing-tagline">
            Paste Unreal Engine T3D text and get an interactive Blueprint graph instantly.
            No plugins, no server &mdash; runs entirely in your browser.
          </p>
          <a href="#try-it" className="ueflow-landing-cta">Try It Now</a>
        </div>
        <HeroDemo />
      </section>

      {/* Features */}
      <section className="ueflow-landing-section">
        <h2 className="ueflow-landing-h2">Features</h2>
        <div className="ueflow-landing-features">
          {FEATURES.map((f) => (
            <div key={f.title} className="ueflow-landing-feature-card">
              <div className="ueflow-landing-feature-icon">{f.icon}</div>
              <h3 className="ueflow-landing-feature-title">{f.title}</h3>
              <p className="ueflow-landing-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="ueflow-landing-section">
        <h2 className="ueflow-landing-h2">How It Works</h2>
        <div className="ueflow-landing-steps">
          {STEPS.map((s) => (
            <div key={s.step} className="ueflow-landing-step">
              <div className="ueflow-landing-step-num">{s.step}</div>
              <h3 className="ueflow-landing-step-title">{s.title}</h3>
              <p className="ueflow-landing-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Try it (paste CTA) */}
      <section id="try-it" className="ueflow-landing-section ueflow-landing-try">
        <h2 className="ueflow-landing-h2">Try It</h2>
        <p className="ueflow-landing-try-sub">
          Copy nodes in Unreal Editor (Ctrl+C) and paste the T3D text below.
        </p>
        <PasteSection onGraphParsed={onGraphParsed} />
      </section>

      {/* Footer */}
      <footer className="ueflow-landing-footer">
        <div className="ueflow-landing-footer-inner">
          <span className="ueflow-landing-footer-brand">ue-flow</span>
          <span className="ueflow-landing-footer-sep">&middot;</span>
          <a href="https://github.com/azereki/ue-flow" className="ueflow-landing-footer-link" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <span className="ueflow-landing-footer-sep">&middot;</span>
          <span className="ueflow-landing-footer-copy">Open Source &mdash; MIT License</span>
        </div>
      </footer>
    </div>
  );
}
