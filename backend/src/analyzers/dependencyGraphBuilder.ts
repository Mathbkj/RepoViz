import fs from 'fs';
import path from 'path';
import type { ArchitectureGraph, GraphNode, GraphEdge } from '@repo-viz/shared';
import type { ScannedFile } from './fileScanner';

// Matches: import ... from '...' | require('...') | import('...')
const IMPORT_RE = /(?:import\s+(?:[\s\S]*?\s+from\s+)?|require\s*\(\s*|import\s*\(\s*)['"`]([^'"`\n]+)['"`]/g;

export class DependencyGraphBuilder {
  async build(files: ScannedFile[], rootDir: string): Promise<ArchitectureGraph> {
    // Build a fast lookup: relative path → node id
    const pathToId = new Map<string, string>();
    const nodes: GraphNode[] = [];

    for (const file of files) {
      const id = this.toId(file.relativePath);
      pathToId.set(file.relativePath, id);
      nodes.push({
        id,
        type: 'Unknown',
        label: this.toLabel(file.relativePath),
        path: file.relativePath,
        ext: file.ext,
        size: file.sizeBytes,
        layer: this.detectLayer(file.relativePath),
      });
    }

    // Parse imports and build edges
    const edgeSet = new Set<string>();
    const edges: GraphEdge[] = [];

    for (const file of files) {
      if (!['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte'].includes(file.ext)) continue;

      let content: string;
      try {
        content = fs.readFileSync(file.absolutePath, 'utf8');
      } catch {
        continue;
      }

      const sourceId = pathToId.get(file.relativePath);
      if (!sourceId) continue;

      const imports = this.extractImports(content);
      for (const imp of imports) {
        if (!imp.startsWith('.')) continue; // skip external packages

        const resolved = this.resolveImport(file.relativePath, imp, pathToId);
        if (!resolved) continue;

        const key = `${sourceId}→${resolved}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push({ source: sourceId, target: resolved });
      }
    }

    console.log(`[graph] ${nodes.length} nodes, ${edges.length} edges`);
    return { nodes, edges };
  }

  private extractImports(content: string): string[] {
    const results: string[] = [];
    let match: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((match = IMPORT_RE.exec(content)) !== null) {
      results.push(match[1]);
    }
    return results;
  }

  private resolveImport(fromRelative: string, importPath: string, pathToId: Map<string, string>): string | null {
    const dir = path.dirname(fromRelative);
    const candidates = this.buildCandidates(path.join(dir, importPath).replace(/\\/g, '/'));

    for (const c of candidates) {
      if (pathToId.has(c)) return pathToId.get(c)!;
    }
    return null;
  }

  private buildCandidates(base: string): string[] {
    const exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
    const candidates: string[] = [];

    // Exact path
    candidates.push(base);
    // With extensions
    for (const ext of exts) candidates.push(`${base}${ext}`);
    // Index files
    for (const ext of exts) candidates.push(`${base}/index${ext}`);

    return candidates.map((c) => c.replace(/^\//, ''));
  }

  private toId(relativePath: string): string {
    return relativePath.replace(/[^a-zA-Z0-9_/-]/g, '_');
  }

  private toLabel(relativePath: string): string {
    const base = path.basename(relativePath, path.extname(relativePath));
    if (base === 'index') {
      const dir = path.dirname(relativePath);
      const dirName = path.basename(dir);
      // Root-level index → just "index"; otherwise "parentDir/index"
      return dirName === '.' ? 'index' : `${dirName}/index`;
    }
    return base;
  }

  private detectLayer(relativePath: string): string {
    const lower = relativePath.toLowerCase();
    if (lower.startsWith('frontend/') || lower.startsWith('client/') || lower.startsWith('web/')) return 'frontend';
    if (lower.startsWith('backend/') || lower.startsWith('server/') || lower.startsWith('api/')) return 'backend';
    if (lower.startsWith('shared/') || lower.startsWith('common/') || lower.startsWith('lib/')) return 'shared';
    if (lower.startsWith('packages/')) return 'packages';
    return 'root';
  }
}
