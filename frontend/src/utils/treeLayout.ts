import type { TreeNode, BranchInfo } from '@repo-viz/shared';
import type { Edge } from '@xyflow/react';
import dagre from 'dagre';

const W = 180;
const H = 52;
export const BRANCH_NODE_W = 140;
export const BRANCH_NODE_H = 70;
const NODE_SEP = 20;
const RANK_SEP = 60;

// Deterministic color for a branch name (used as fallback when branchColors is not provided)
const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#14b8a6',
];
export function hashBranchColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  return PALETTE[h % PALETTE.length];
}

export interface LayoutNode {
  id: string;
  kind: 'branch' | 'file';
  position: { x: number; y: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

/**
 * Converts a flat list of TreeNodes into positioned nodes + edges for React Flow.
 *
 * When `branches` are provided, they appear as diamond nodes at the first depth
 * level. Only the active branch connects down to the file tree. Inactive branches
 * float as isolated diamonds at the same rank.
 */
export function buildTreeLayout(
  nodes: TreeNode[],
  maxDepth = 4,
  pendingPaths: Set<string> = new Set(),
  newPaths: Set<string> = new Set(),
  branches: BranchInfo[] = [],
  activeBranch = '',
  branchColors: Record<string, string> = {},
): { rfNodes: LayoutNode[]; rfEdges: Edge[] } {
  if (nodes.length === 0 && branches.length === 0) return { rfNodes: [], rfEdges: [] };

  const dirSet = new Set(nodes.filter((n) => n.type === 'dir').map((n) => n.path));
  const depth = (p: string) => p.split('/').length - 1;
  const filtered = nodes.filter((n) => depth(n.path) < maxDepth);
  const hasBranches = branches.length > 0;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: NODE_SEP, ranksep: RANK_SEP, marginx: 20, marginy: 20 });

  const rfEdges: Edge[] = [];

  if (hasBranches) {
    // Hidden virtual root — 1×1, just so dagre places all branches at the same rank
    g.setNode('__vroot__', { width: 1, height: 1 });

    for (const b of branches) {
      g.setNode(`branch:${b.name}`, { width: BRANCH_NODE_W, height: BRANCH_NODE_H });
      g.setEdge('__vroot__', `branch:${b.name}`);
    }

    for (const n of filtered) {
      g.setNode(n.path, { width: W, height: H });
    }

    const activeBranchExists = branches.some((b) => b.name === activeBranch);
    const activeBranchId = `branch:${activeBranch}`;
    const activeColor = branchColors[activeBranch] ?? hashBranchColor(activeBranch);

    for (const n of filtered) {
      const parts = n.path.split('/');
      if (parts.length === 1) {
        // Top-level node: attach to the active branch diamond
        if (activeBranchExists) {
          g.setEdge(activeBranchId, n.path);
          rfEdges.push({
            id: `e-${activeBranchId}-${n.path}`,
            source: activeBranchId,
            target: n.path,
            type: 'smoothstep',
            style: { stroke: activeColor, strokeWidth: 1.5, opacity: 0.65 },
          });
        }
      } else {
        const parentPath = parts.slice(0, -1).join('/');
        if (dirSet.has(parentPath)) {
          g.setEdge(parentPath, n.path);
          rfEdges.push({
            id: `e-${parentPath}-${n.path}`,
            source: parentPath,
            target: n.path,
            type: 'smoothstep',
            style: { stroke: '#cbd5e1', strokeWidth: 1 },
          });
        }
      }
    }
  } else {
    // ── Fallback: no branches yet, use a virtual __root__ ──────────────────────
    g.setNode('__root__', { width: W, height: H });

    for (const n of filtered) {
      g.setNode(n.path, { width: W, height: H });
    }

    for (const n of filtered) {
      const parts = n.path.split('/');
      const parentPath = parts.length === 1 ? '__root__' : parts.slice(0, -1).join('/');
      if (parentPath === '__root__' || dirSet.has(parentPath)) {
        g.setEdge(parentPath, n.path);
        rfEdges.push({
          id: `e-${parentPath}-${n.path}`,
          source: parentPath,
          target: n.path,
          type: 'smoothstep',
          style: { stroke: '#cbd5e1', strokeWidth: 1 },
        });
      }
    }
  }

  dagre.layout(g);

  const rfNodes: LayoutNode[] = [];

  if (hasBranches) {
    for (const b of branches) {
      const id = `branch:${b.name}`;
      const pos = g.node(id);
      if (!pos) continue;
      rfNodes.push({
        id,
        kind: 'branch',
        position: { x: pos.x - BRANCH_NODE_W / 2, y: pos.y - BRANCH_NODE_H / 2 },
        data: {
          name: b.name,
          color: branchColors[b.name] ?? hashBranchColor(b.name),
          isActive: b.name === activeBranch,
          isDefault: b.isDefault,
          isProtected: b.protected,
        },
      });
    }
  } else {
    // Include __root__ node (styled as a plain dir node)
    const rootPos = g.node('__root__');
    if (rootPos) {
      rfNodes.push({
        id: '__root__',
        kind: 'file',
        position: { x: rootPos.x - W / 2, y: rootPos.y - H / 2 },
        data: { name: 'root', path: '__root__', type: 'dir' },
      });
    }
  }

  for (const n of filtered) {
    const pos = g.node(n.path);
    if (!pos) continue;
    rfNodes.push({
      id: n.path,
      kind: 'file',
      position: { x: pos.x - W / 2, y: pos.y - H / 2 },
      data: {
        name: n.name,
        path: n.path,
        type: n.type,
        size: n.size,
        isPending: pendingPaths.has(n.path),
        isNew: newPaths.has(n.path),
      },
    });
  }

  return { rfNodes, rfEdges };
}
