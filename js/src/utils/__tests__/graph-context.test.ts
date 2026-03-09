import { describe, it, expect } from 'vitest';
import { serializeGraphContext, serializeMultiGraphContext } from '../graph-context';
import { DEMO_GRAPH } from '../../data/demo-graph';
import { DEMO_MULTIGRAPH } from '../../data/demo-multigraph';

describe('serializeGraphContext', () => {
  it('serializes a single graph with nodes and edges', () => {
    const result = serializeGraphContext(DEMO_GRAPH);
    expect(result).toContain('Graph: EventGraph');
    expect(result).toContain('Event BeginPlay');
    expect(result).toContain('Branch');
    expect(result).toContain('Print String');
    expect(result).toContain('Destroy Actor');
    expect(result).toContain('Connections');
  });

  it('includes node types and pin info', () => {
    const result = serializeGraphContext(DEMO_GRAPH);
    expect(result).toContain('[event]');
    expect(result).toContain('[flow_control]');
    expect(result).toContain('[call_function]');
  });

  it('includes edge connections with node titles', () => {
    const result = serializeGraphContext(DEMO_GRAPH);
    expect(result).toContain('Event BeginPlay.then');
    expect(result).toContain('Branch.then');
    expect(result).toContain('Branch.else');
  });

  it('stays under the 12K char limit', () => {
    const result = serializeGraphContext(DEMO_GRAPH);
    expect(result.length).toBeLessThanOrEqual(12_000);
  });

  it('truncates oversized output with notice', () => {
    // Create a graph with many nodes to exceed limit
    const bigGraph = {
      ...DEMO_GRAPH,
      nodes: Array.from({ length: 500 }, (_, i) => ({
        ...DEMO_GRAPH.nodes[0],
        id: `node-${i}`,
        title: `Very Long Node Title That Takes Up Space Number ${i} With Extra Description Text`,
        pins: DEMO_GRAPH.nodes[0].pins.map((p) => ({
          ...p,
          id: `pin-${i}-${p.id}`,
          name: `SomeLongPinName_${i}`,
        })),
      })),
    };
    const result = serializeGraphContext(bigGraph);
    expect(result.length).toBeLessThanOrEqual(12_000);
    expect(result).toContain('[...truncated');
  });
});

describe('serializeMultiGraphContext', () => {
  it('serializes multi-graph with metadata', () => {
    const result = serializeMultiGraphContext(DEMO_MULTIGRAPH, 'EventGraph');
    expect(result).toContain('Blueprint: BP_PlayerCharacter');
    expect(result).toContain('Asset: /Game/Blueprints/BP_PlayerCharacter');
  });

  it('lists all graphs', () => {
    const result = serializeMultiGraphContext(DEMO_MULTIGRAPH, 'EventGraph');
    expect(result).toContain('EventGraph');
  });

  it('includes events, functions, and variables', () => {
    const result = serializeMultiGraphContext(DEMO_MULTIGRAPH, 'EventGraph');
    expect(result).toContain('Events');
    expect(result).toContain('Functions');
    expect(result).toContain('Variables');
  });

  it('provides active graph detail', () => {
    const result = serializeMultiGraphContext(DEMO_MULTIGRAPH, 'EventGraph');
    expect(result).toContain('--- Active Graph Detail ---');
    expect(result).toContain('Graph: EventGraph');
  });

  it('stays under the 12K char limit', () => {
    const result = serializeMultiGraphContext(DEMO_MULTIGRAPH, 'EventGraph');
    expect(result.length).toBeLessThanOrEqual(12_000);
  });
});
