import fs from 'fs';
import path from 'path';

export interface ScannedFile {
  absolutePath: string;
  relativePath: string;
  ext: string;
  sizeBytes: number;
}

const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.py', '.go', '.rb', '.java', '.cs', '.php', '.rs', '.vue', '.svelte']);

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  'coverage', '__pycache__', '.venv', 'venv', '.cache', '.turbo',
  'out', '.output', 'vendor', 'target', 'bin', 'obj',
  '__tests__', '__mocks__', '__fixtures__', 'fixtures',
  'examples', 'example', 'demos', 'demo', 'samples', 'sample',
  'playground', 'playgrounds', 'benchmarks', 'benchmark', 'scripts',
  'test', 'tests', 'spec', 'specs', 'e2e', 'storybook', 'stories',
]);

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
const MAX_FILES = 2000;

export class FileScanner {
  async scan(rootDir: string): Promise<ScannedFile[]> {
    const results: ScannedFile[] = [];
    this.walk(rootDir, rootDir, results);
    console.log(`[scanner] found ${results.length} relevant files`);
    return results;
  }

  private walk(rootDir: string, currentDir: string, results: ScannedFile[]): void {
    if (results.length >= MAX_FILES) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= MAX_FILES) break;

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          this.walk(rootDir, fullPath, results);
        }
        continue;
      }

      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;
      // Skip test/spec/declaration files regardless of directory
      if (/\.(spec|test|d)\.(ts|js|tsx|jsx|mjs)$/.test(entry.name)) continue;
      if (/\.(stories|story)\.(ts|js|tsx|jsx)$/.test(entry.name)) continue;

      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.size > MAX_FILE_SIZE) continue;

      results.push({
        absolutePath: fullPath,
        relativePath: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
        ext,
        sizeBytes: stat.size,
      });
    }
  }
}
