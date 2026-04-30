import type { AnalyzeResponse } from '@repo-viz/shared';
import { RepoDownloader } from './repoDownloader';
import { FileScanner } from '../analyzers/fileScanner';
import { DependencyGraphBuilder } from '../analyzers/dependencyGraphBuilder';
import { NodeTypeClassifier } from '../analyzers/nodeTypeClassifier';
import { GraphSimplifier } from '../analyzers/graphSimplifier';
import { GraphEnricher } from '../analyzers/graphEnricher';

export class AnalyzeService {
  private downloader  = new RepoDownloader();
  private scanner     = new FileScanner();
  private graphBuilder = new DependencyGraphBuilder();
  private classifier  = new NodeTypeClassifier();
  private simplifier  = new GraphSimplifier();
  private enricher    = new GraphEnricher();

  async analyze(repoUrl: string): Promise<AnalyzeResponse> {
    const start = Date.now();
    const repoName = this.extractRepoName(repoUrl);

    const extractDir = await this.downloader.download(repoUrl);

    try {
      const files = await this.scanner.scan(extractDir);
      const fileMap = new Map(files.map((f) => [f.relativePath, f]));

      const graph = await this.graphBuilder.build(files, extractDir);
      this.classifier.classify(graph, fileMap);
      const simplified = this.simplifier.simplify(graph);

      // Enrich after simplification so degree counts reflect the pruned graph
      this.enricher.enrich(simplified, extractDir);

      const layers = [...new Set(simplified.nodes.map((n) => n.layer).filter(Boolean))] as string[];

      return {
        graph: simplified,
        repoName,
        filesScanned: files.length,
        durationMs: Date.now() - start,
        layers,
      };
    } finally {
      this.downloader.cleanup(extractDir).catch(console.error);
    }
  }

  private extractRepoName(url: string): string {
    const match = url.match(/github\.com\/([^/]+\/[^/?#]+)/);
    return match ? match[1] : url;
  }
}
