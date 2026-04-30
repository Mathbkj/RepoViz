import dagre from 'dagre';
import type { Edge } from '@xyflow/react';

const NODE_W = 180;
const NODE_H = 64;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyDagreLayout<T extends { id: string; position: { x: number; y: number } }>(
  nodes: T[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): T[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 90, marginx: 40, marginy: 40 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
    };
  });
}
