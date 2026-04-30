// ─── Node Types ────────────────────────────────────────────────────────────────

export type NodeType =
  | 'EntryPoint'
  | 'Route'
  | 'Component'
  | 'Service'
  | 'API'
  | 'Database'
  | 'Config'
  | 'Utility'
  | 'Unknown';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  path: string;
  /** Detected layer (e.g. "frontend", "backend", "shared") */
  layer?: string;
  /** Package name in a monorepo (e.g. "vite", "create-vite") */
  packageName?: string;
  /** File extension */
  ext?: string;
  /** Size in bytes */
  size?: number;
  /** Brief summary derived from filename/folder/content heuristics */
  summary?: string;
  /** Number of other files that import this node */
  importedByCount?: number;
  /** Number of files this node imports */
  importsCount?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface ArchitectureGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── API Shapes ────────────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  repoUrl: string;
}

export interface AnalyzeResponse {
  graph: ArchitectureGraph;
  /** Repo name extracted from URL */
  repoName: string;
  /** Total files scanned (before pruning) */
  filesScanned: number;
  /** Analysis duration in ms */
  durationMs: number;
  /** Detected layers present in the graph */
  layers: string[];
}

export interface ApiError {
  error: string;
  details?: string;
}
