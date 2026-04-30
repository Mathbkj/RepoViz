import path from 'path';
import type { ArchitectureGraph, GraphNode, GraphEdge, NodeType } from '@repo-viz/shared';

const MAX_NODES = 120;

// Types always kept regardless of connectivity
const PRIORITY_TYPES = new Set<NodeType>(['EntryPoint', 'Route', 'Service', 'API', 'Database']);

export class GraphSimplifier {
  simplify(graph: ArchitectureGraph): ArchitectureGraph {
    let { nodes, edges } = graph;

    if (nodes.length <= MAX_NODES) return graph;

    // 1. Compute degree for each node
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    for (const n of nodes) {
      inDegree.set(n.id, 0);
      outDegree.set(n.id, 0);
    }
    for (const e of edges) {
      outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1);
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }
    const degree = (id: string) => (inDegree.get(id) ?? 0) + (outDegree.get(id) ?? 0);

    // 2. Collapse folder groups: many Unknown/Utility files in the same directory
    //    with degree < 2 → merge into a single folder node
    const folderBuckets = new Map<string, GraphNode[]>();
    for (const n of nodes) {
      if (PRIORITY_TYPES.has(n.type)) continue;
      if (degree(n.id) >= 2) continue;
      const dir = path.dirname(n.path);
      const bucket = folderBuckets.get(dir) ?? [];
      bucket.push(n);
      folderBuckets.set(dir, bucket);
    }

    const collapsedIds = new Set<string>();
    const folderNodes: GraphNode[] = [];
    const folderEdges: GraphEdge[] = [];

    for (const [dir, members] of folderBuckets) {
      if (members.length < 3) continue; // only collapse dirs with 3+ boring files

      const folderId = `folder:${dir}`;
      folderNodes.push({
        id: folderId,
        type: members[0].type === 'Component' ? 'Component' : 'Utility',
        label: path.basename(dir) || dir,
        path: dir + '/',
        layer: members[0].layer,
        summary: `${members.length} files in ${dir}/`,
      });

      for (const m of members) {
        collapsedIds.add(m.id);
        // Re-route edges that pointed to/from collapsed members → folder node
        folderEdges.push(
          ...edges
            .filter((e) => e.target === m.id && !collapsedIds.has(e.source))
            .map((e) => ({ source: e.source, target: folderId })),
          ...edges
            .filter((e) => e.source === m.id && !collapsedIds.has(e.target))
            .map((e) => ({ source: folderId, target: e.target }))
        );
      }
    }

    nodes = nodes.filter((n) => !collapsedIds.has(n.id));
    edges = edges.filter((e) => !collapsedIds.has(e.source) && !collapsedIds.has(e.target));
    nodes = [...nodes, ...folderNodes];
    edges = [...edges, ...folderEdges];

    // Deduplicate edges
    const edgeSet = new Set<string>();
    edges = edges.filter((e) => {
      const k = `${e.source}→${e.target}`;
      if (edgeSet.has(k) || e.source === e.target) return false;
      edgeSet.add(k);
      return true;
    });

    if (nodes.length <= MAX_NODES) return { nodes, edges };

    // 3. Still too many: score and keep top-N
    const scores = new Map<string, number>();
    const typeScore: Record<NodeType, number> = {
      EntryPoint: 100, Route: 80, Service: 70, API: 60, Database: 90,
      Component: 40, Config: 30, Utility: 20, Unknown: 10,
    };

    for (const n of nodes) {
      const d = degree(n.id);
      scores.set(n.id, (typeScore[n.type] ?? 10) + d * 5);
    }

    const sorted = [...nodes].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
    const kept = new Set(sorted.slice(0, MAX_NODES).map((n) => n.id));

    nodes = nodes.filter((n) => kept.has(n.id));
    edges = edges.filter((e) => kept.has(e.source) && kept.has(e.target));

    return { nodes, edges };
  }
}
