import type { ArchitectureGraph, NodeType, GraphNode } from '@repo-viz/shared';
import { ContentClassifier } from './contentClassifier';
import type { ScannedFile } from './fileScanner';

interface Rule {
  test: (p: string, l: string) => boolean;
  type: NodeType;
}

const PATH_RULES: Rule[] = [
  // Entry points — shallow files only (depth ≤ 3); content classifier handles deeper ones
  { test: (p, l) => /\b(main|bootstrap)\b/i.test(l) && /\.(ts|js|tsx|jsx|mjs)$/.test(p) && p.split('/').length <= 3, type: 'EntryPoint' },
  { test: (p, l) => /\b(app|server)\b/i.test(l) && /\.(ts|js|tsx|jsx|mjs)$/.test(p) && p.split('/').length <= 3, type: 'EntryPoint' },
  { test: (p, l) => l === 'index' && p.split('/').length <= 2, type: 'EntryPoint' },

  // Routes / controllers
  { test: (p) => /\/(routes?|controllers?|handlers?|endpoints?)\//i.test(p), type: 'Route' },
  { test: (_, l) => /\b(router|route|controller|handler)\b/i.test(l), type: 'Route' },

  // React/Vue/Svelte components
  { test: (p) => /\.(tsx|jsx|vue|svelte)$/.test(p), type: 'Component' },
  { test: (p) => /\/(components?|pages?|views?|screens?|ui|widgets?)\//i.test(p), type: 'Component' },

  // Application / core orchestrator (exact label match only — avoids tsconfig.app etc.)
  { test: (p, l) => /^(application|app|core)$/i.test(l) && /\.(ts|js|tsx|jsx|mjs)$/.test(p), type: 'Service' },

  // Services / business logic
  { test: (p) => /\/(services?|usecases?|domain|business|use-cases?)\//i.test(p), type: 'Service' },
  { test: (_, l) => /\bservice\b/i.test(l), type: 'Service' },

  // API / networking
  { test: (p) => /\/(api|graphql|grpc|rest|ws|socket|network|http)\//i.test(p), type: 'API' },
  { test: (_, l) => /\b(api|client|fetch|http|axios|request|gateway)\b/i.test(l), type: 'API' },

  // Database / models
  { test: (p) => /\/(models?|entities|schemas?|migrations?|db|database|repositories?|repos?|prisma|drizzle|store)\//i.test(p), type: 'Database' },
  { test: (_, l) => /\b(model|schema|entity|migration|repository|repo|prisma|drizzle|sequelize|mongoose|store)\b/i.test(l), type: 'Database' },

  // Config
  { test: (p) => /(\.config\.|tsconfig|vite\.config|jest\.config|eslint|prettier|babel\.config|webpack\.config)/i.test(p), type: 'Config' },
  { test: (p) => /\/(config|configs?|settings?|env)\//i.test(p), type: 'Config' },
  { test: (_, l) => /\b(config|configuration|settings?|environment)\b/i.test(l), type: 'Config' },

  // Utilities
  { test: (p) => /\/(utils?|helpers?|lib|libs?|shared|common|tools?)\//i.test(p), type: 'Utility' },
  { test: (_, l) => /\b(util|utils|helper|helpers|common|shared)\b/i.test(l), type: 'Utility' },
];

const SUMMARIES: Record<NodeType, (node: GraphNode) => string> = {
  EntryPoint: () => 'Application entry point — bootstraps and launches the process.',
  Route:      (n) => `Route/controller in ${n.layer ?? 'app'} — handles incoming requests.`,
  Component:  (n) => `UI component (${n.ext ?? 'file'}) — rendered in the frontend.`,
  Service:    () => 'Service layer — encapsulates business logic and domain operations.',
  API:        () => 'API client or handler — communicates over HTTP/GraphQL/WebSocket.',
  Database:   () => 'Data layer — model, schema, migration, or database accessor.',
  Config:     () => 'Configuration file — environment settings and app options.',
  Utility:    () => 'Utility module — shared helpers used across the codebase.',
  Unknown:    (n) => `Source file (${n.ext ?? ''}).`,
};

export class NodeTypeClassifier {
  private contentClassifier = new ContentClassifier();

  classify(graph: ArchitectureGraph, fileMap?: Map<string, ScannedFile>): void {
    for (const node of graph.nodes) {
      const pathType = this.detectFromPath(node.path, node.label ?? '');

      // Try content analysis for ambiguous / unknown path-based types
      if ((pathType === 'Unknown' || pathType === 'Component') && fileMap) {
        const file = fileMap.get(node.path);
        if (file) {
          const hint = this.contentClassifier.hint(file.absolutePath);
          if (hint && hint.confidence > 0.7) {
            node.type = hint.type;
            node.summary = SUMMARIES[hint.type](node);
            continue;
          }
        }
      }

      node.type = pathType;
      node.summary = SUMMARIES[pathType](node);
    }
  }

  private detectFromPath(filePath: string, label: string): NodeType {
    for (const rule of PATH_RULES) {
      if (rule.test(filePath, label)) return rule.type;
    }
    return 'Unknown';
  }
}
