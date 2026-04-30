import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import type { ArchitectureGraph, GraphNode, NodeType } from '@repo-viz/shared';
import { applyDagreLayout } from '../utils/layout';
import { buildSwimlanePanels } from '../utils/swimlanes';
import { RoughNode, type RoughNodeType } from './RoughNode';
import { SwimlaneNode } from './SwimlaneNode';
import { GroupNode } from './GroupNode';
import { getNodeStyle } from '../utils/nodeStyle';
import { Toolbar, type LayoutDir } from './Toolbar';
import { Legend } from './Legend';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, any> = { rough: RoughNode, group: GroupNode, swimlane: SwimlaneNode };

const ALL_TYPES: NodeType[] = [
  'EntryPoint', 'Route', 'Component', 'Service',
  'API', 'Database', 'Config', 'Utility', 'Unknown',
];

interface Props {
  graph: ArchitectureGraph;
  onNodeClick: (node: GraphNode) => void;
  selectedNodeId: string | null;
  searchQuery: string;
}

function DiagramInner({ graph, onNodeClick, selectedNodeId, searchQuery }: Props) {
  const [layout, setLayout] = useState<LayoutDir>('TB');
  const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(new Set(ALL_TYPES));
  const flowRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  const toggleType = useCallback((type: NodeType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) { next.delete(type); } else { next.add(type); }
      return next;
    });
  }, []);

  // Filtered + search-highlighted node set
  const visibleNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return graph.nodes.filter((n) => {
      if (!activeTypes.has(n.type)) return false;
      if (q && !n.label.toLowerCase().includes(q) && !n.path.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [graph.nodes, activeTypes, searchQuery]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(
    () => graph.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [graph.edges, visibleIds]
  );

  const layerOf = useCallback(
    (id: string) => graph.nodes.find((n) => n.id === id)?.layer,
    [graph.nodes]
  );

  const { nodes, edges } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const rawNodes: RoughNodeType[] = visibleNodes.map((n) => {
      const style = getNodeStyle(n.type);
      const isMatch = q.length > 0 && (
        n.label.toLowerCase().includes(q) || n.path.toLowerCase().includes(q)
      );
      return {
        id: n.id,
        type: 'rough' as const,
        position: { x: 0, y: 0 },
        data: {
          label: n.packageName ? `${n.packageName}/${n.label}` : n.label,
          nodeType: n.type,
          summary: n.summary,
          layer: n.layer,
          icon: style.icon,
          selected: n.id === selectedNodeId,
          highlighted: isMatch,
          importedByCount: n.importedByCount,
        },
      };
    });

    const rawEdges: Edge[] = visibleEdges.map((e, i) => ({
      id: `e-${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12, color: '#94a3b8' },
      style: { stroke: '#94a3b8', strokeWidth: 1.5 },
    }));

    const laidNodes = applyDagreLayout(rawNodes, rawEdges, layout);

    // Build swimlane background panels after layout
    const swimlanes = buildSwimlanePanels(laidNodes, layerOf);

    return {
      nodes: [...swimlanes, ...laidNodes],
      edges: rawEdges,
    };
  }, [visibleNodes, visibleEdges, selectedNodeId, layout, searchQuery, layerOf]);

  const handleLayoutChange = useCallback((dir: LayoutDir) => {
    setLayout(dir);
    setTimeout(() => fitView({ padding: 0.15 }), 80);
  }, [fitView]);

  // Re-fit when search filters change
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.15 }), 80);
    return () => clearTimeout(t);
  }, [searchQuery, activeTypes, fitView]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_evt, node) => {
      if (node.id.startsWith('__swimlane__')) return;
      const original = graph.nodes.find((n) => n.id === node.id);
      if (original) onNodeClick(original);
    },
    [graph.nodes, onNodeClick]
  );

  const exportPng = useCallback(async () => {
    if (!flowRef.current) return;
    try {
      const dataUrl = await toPng(flowRef.current, {
        backgroundColor: '#fafaf8',
        pixelRatio: 2,
        filter: (el) =>
          !el.classList?.contains('react-flow__minimap') &&
          !el.classList?.contains('react-flow__controls') &&
          !el.classList?.contains('toolbar-overlay'),
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'architecture.png';
      a.click();
    } catch (e) { console.error(e); }
  }, []);

  const exportSvg = useCallback(async () => {
    if (!flowRef.current) return;
    try {
      const dataUrl = await toSvg(flowRef.current, {
        backgroundColor: '#fafaf8',
        filter: (el) =>
          !el.classList?.contains('react-flow__minimap') &&
          !el.classList?.contains('react-flow__controls') &&
          !el.classList?.contains('toolbar-overlay'),
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'architecture.svg';
      a.click();
    } catch (e) { console.error(e); }
  }, []);

  // Count only "real" nodes (not swimlanes) for stats
  const realNodeCount = nodes.filter((n) => !n.id.startsWith('__swimlane__')).length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Legend activeTypes={activeTypes} onToggle={toggleType} />
      <div className="relative flex-1" ref={flowRef}>
        <div className="toolbar-overlay">
          <Toolbar
            layout={layout}
            onLayoutChange={handleLayoutChange}
            onExportPng={exportPng}
            onExportSvg={exportSvg}
            nodeCount={realNodeCount}
            edgeCount={edges.length}
          />
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.05}
          maxZoom={3}
          proOptions={{ hideAttribution: true }}
          style={{ background: '#fafaf8' }}
          elevateNodesOnSelect={false}
        >
          <Background color="#e2e8f0" gap={24} size={1} />
          <Controls style={{ border: '2px solid #e2e8f0', borderRadius: 8 }} />
          <MiniMap
            nodeColor={(n) => {
              if (n.id.startsWith('__swimlane__')) return 'transparent';
              const gn = graph.nodes.find((x) => x.id === n.id);
              return gn ? getNodeStyle(gn.type).border : '#ccc';
            }}
            style={{ border: '2px solid #e2e8f0', borderRadius: 8 }}
            maskColor="rgba(255,255,255,0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export function DiagramCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <DiagramInner {...props} />
    </ReactFlowProvider>
  );
}
