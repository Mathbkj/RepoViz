import fs from 'fs';
import path from 'path';
import type { ArchitectureGraph } from '@repo-viz/shared';

export class GraphEnricher {
  /**
   * Adds packageName + importedByCount + importsCount to every node.
   * Detects monorepo packages by looking for package.json files.
   */
  enrich(graph: ArchitectureGraph, rootDir: string): void {
    const packageMap = this.buildPackageMap(rootDir);

    // Compute degree maps
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    for (const n of graph.nodes) { inDegree.set(n.id, 0); outDegree.set(n.id, 0); }
    for (const e of graph.edges) {
      outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1);
      inDegree.set(e.target,  (inDegree.get(e.target)  ?? 0) + 1);
    }

    for (const node of graph.nodes) {
      node.importedByCount = inDegree.get(node.id) ?? 0;
      node.importsCount    = outDegree.get(node.id) ?? 0;
      node.packageName     = this.resolvePackage(node.path, packageMap);
    }
  }

  /**
   * Walks rootDir looking for package.json files (excluding node_modules).
   * Returns a sorted list of [dirPrefix, packageName] pairs, longest-prefix first
   * so the most specific match wins.
   */
  private buildPackageMap(rootDir: string): Array<[string, string]> {
    const map: Array<[string, string]> = [];
    this.findPackageJsons(rootDir, rootDir, map, 0);
    // Sort longest prefix first for best-match lookup
    return map.sort((a, b) => b[0].length - a[0].length);
  }

  private findPackageJsons(
    rootDir: string,
    currentDir: string,
    map: Array<[string, string]>,
    depth: number
  ): void {
    if (depth > 4) return; // only search shallow

    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(currentDir, { withFileTypes: true }); }
    catch { return; }

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(currentDir, entry.name);

      if (entry.isFile() && entry.name === 'package.json') {
        try {
          const pkg = JSON.parse(fs.readFileSync(full, 'utf8')) as { name?: string };
          if (pkg.name) {
            const relDir = path.relative(rootDir, currentDir).replace(/\\/g, '/');
            map.push([relDir, pkg.name.replace(/^@[^/]+\//, '')]); // strip scope
          }
        } catch { /* ignore malformed */ }
      } else if (entry.isDirectory()) {
        this.findPackageJsons(rootDir, full, map, depth + 1);
      }
    }
  }

  private resolvePackage(
    filePath: string,
    packageMap: Array<[string, string]>
  ): string | undefined {
    for (const [prefix, name] of packageMap) {
      if (prefix === '' || filePath.startsWith(prefix + '/') || filePath === prefix) {
        return name;
      }
    }
    return undefined;
  }
}
