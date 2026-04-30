import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { TreeNode, BranchInfo } from '@repo-viz/shared';
import { buildTreeLayout } from '../utils/treeLayout';
import { FileRoughNode, fileColor, type FileRoughNodeType } from './FileRoughNode';
import { BranchDiamondNode, type BranchDiamondNodeType } from './BranchDiamondNode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = {
  filenode: FileRoughNode,
  branchnode: BranchDiamondNode,
};

interface Props {
  treeNodes: TreeNode[];
  pendingPaths: Set<string>;
  newPaths: Set<string>;
  selectedPath: string | null;
  searchQuery: string;
  branches?: BranchInfo[];
  activeBranch?: string;
  branchColors?: Record<string, string>;
  onSelectFile: (path: string, type: 'file' | 'dir') => void;
  onDoubleClickCanvas: (evt: React.MouseEvent) => void;
}

function Inner({
  treeNodes, pendingPaths, newPaths, selectedPath, searchQuery,
  branches = [], activeBranch = '', branchColors = {},
  onSelectFile, onDoubleClickCanvas,
}: Props) {
  const { fitView } = useReactFlow();
  const [maxDepth, setMaxDepth] = useState(4);

  const { rfNodes: layoutNodes, rfEdges } = useMemo(() =>
    buildTreeLayout(treeNodes, maxDepth, pendingPaths, newPaths, branches, activeBranch, branchColors),
    [treeNodes, maxDepth, pendingPaths, newPaths, branches, activeBranch, branchColors]
  );

  const q = searchQuery.trim().toLowerCase();

  const rfNodes: (Node & { type: string })[] = useMemo(() =>
    layoutNodes.map((n) => {
      if (n.kind === 'branch') {
        return { ...n, type: 'branchnode' };
      }
      return {
        ...n,
        type: 'filenode',
        data: {
          ...n.data,
          selected: n.id === selectedPath,
          highlighted: q.length > 0 && String(n.data.name ?? '').toLowerCase().includes(q),
        },
      };
    }),
    [layoutNodes, selectedPath, q]
  );

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.1, duration: 200 }), 100);
    return () => clearTimeout(t);
  }, [treeNodes, maxDepth, branches, fitView]);

  const handleNodeClick: NodeMouseHandler = useCallback((_evt, node) => {
    // Ignore the virtual root and branch diamonds
    if (node.id === '__root__' || node.type === 'branchnode') return;
    const tn = node.data as { type: 'file' | 'dir'; path: string };
    onSelectFile(tn.path, tn.type);
  }, [onSelectFile]);

  return (
    <div className="relative flex-1 h-full">
      {/* Depth control */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-white/90 border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm text-xs text-gray-500">
        <span>Depth</span>
        {[2, 3, 4, 5].map((d) => (
          <button
            key={d}
            onClick={() => setMaxDepth(d)}
            className={`w-5 h-5 rounded text-[10px] font-bold transition-colors ${
              maxDepth === d ? 'bg-indigo-500 text-white' : 'hover:bg-gray-100 text-gray-400'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="w-full h-full" onDoubleClick={onDoubleClickCanvas}>
        <ReactFlow
          nodes={rfNodes as (FileRoughNodeType | BranchDiamondNodeType)[]}
          edges={rfEdges as Edge[]}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.1 }}
          minZoom={0.05}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          style={{ background: '#fafaf8' }}
        >
          <Background color="#e2e8f0" gap={24} size={1} />
          <Controls style={{ border: '2px solid #e2e8f0', borderRadius: 8 }} />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'branchnode') return (n.data as { color: string }).color ?? '#6366f1';
              if (n.id === '__root__') return '#e2e8f0';
              const d = n.data as { name: string; type: 'file' | 'dir' };
              return fileColor(d.name, d.type).border;
            }}
            style={{ border: '2px solid #e2e8f0', borderRadius: 8 }}
            maskColor="rgba(255,255,255,0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export function FileTreeCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
