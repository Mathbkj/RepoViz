import axios from 'axios';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class RepoDownloader {
  /** Downloads a GitHub repo zip and extracts to a temp dir. Returns the extracted directory path. */
  async download(repoUrl: string): Promise<string> {
    const zipUrl = this.toZipUrl(repoUrl);
    console.log(`[downloader] fetching ${zipUrl}`);

    const response = await axios.get<ArrayBuffer>(zipUrl, {
      responseType: 'arraybuffer',
      timeout: 60_000,
      maxContentLength: 100 * 1024 * 1024, // 100 MB cap
      headers: {
        'User-Agent': 'repo-viz/1.0',
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    });

    const buffer = Buffer.from(response.data);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-viz-'));

    const zip = new AdmZip(buffer);
    zip.extractAllTo(tmpDir, true);

    // GitHub zips contain a single root folder (owner-repo-sha/); find it
    const entries = fs.readdirSync(tmpDir);
    const root = entries.length === 1 && fs.statSync(path.join(tmpDir, entries[0])).isDirectory()
      ? path.join(tmpDir, entries[0])
      : tmpDir;

    console.log(`[downloader] extracted to ${root}`);
    return root;
  }

  async cleanup(dir: string): Promise<void> {
    // Walk up one if we drilled into the zip root subfolder
    const parent = path.dirname(dir);
    const target = parent.includes('repo-viz-') ? parent : dir;
    fs.rmSync(target, { recursive: true, force: true });
  }

  private toZipUrl(repoUrl: string): string {
    // GitHub's zipball/HEAD resolves to the default branch automatically
    const clean = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
    return `${clean}/zipball/HEAD`;
  }
}
