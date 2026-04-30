// Octokit is ESM-only, use dynamic import
let Octokit: any;
(async () => {
  const module = await import('@octokit/rest');
  Octokit = module.Octokit;
})();
import type {
  GitHubUser, RepoTreeResponse, TreeNode,
  FileContentResponse, PushFileRequest, PushFileResponse,
  DeleteFileRequest, RepoInfo, BranchInfo, CreateBranchRequest,
  GitCommit, GitGraphResponse,
} from '@repo-viz/shared';

// Max tree entries to return (GitHub API can be large)
const MAX_NODES = 600;

// Paths to skip entirely
const SKIP_RE = /^(node_modules|\.git|dist|build|\.next|out|coverage|\.turbo|vendor)(\/|$)/;

export class GitHubService {
  private octokit: any;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  async getUser(): Promise<GitHubUser> {
    const { data } = await this.octokit.rest.users.getAuthenticated();
    return {
      login: data.login,
      name: data.name ?? null,
      avatar_url: data.avatar_url,
      html_url: data.html_url,
    };
  }

  // ── Repos ───────────────────────────────────────────────────────────────────

  async listRepos(): Promise<RepoInfo[]> {
    const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 30,
    });
    return data.map((r) => ({
      full_name: r.full_name,
      name: r.name,
      description: r.description ?? null,
      private: r.private,
      default_branch: r.default_branch,
      updated_at: r.updated_at ?? '',
      language: r.language ?? null,
    }));
  }

  // ── Tree ────────────────────────────────────────────────────────────────────

  async getTree(owner: string, repo: string, branch?: string): Promise<RepoTreeResponse> {
    // Resolve default branch if not provided
    let ref = branch;
    if (!ref) {
      const { data } = await this.octokit.rest.repos.get({ owner, repo });
      ref = data.default_branch!;
    }

    const { data } = await this.octokit.rest.git.getTree({
      owner, repo,
      tree_sha: ref,
      recursive: '1',
    });

    const raw = (data.tree as { type?: string; path?: string; sha?: string; size?: number }[])
      .filter((e) => e.type === 'blob' || e.type === 'tree')
      .filter((e) => e.path && !SKIP_RE.test(e.path));

    const nodes: TreeNode[] = raw.slice(0, MAX_NODES).map((e) => ({
      type: e.type === 'tree' ? 'dir' : 'file',
      path: e.path!,
      name: e.path!.split('/').pop()!,
      sha: e.sha!,
      size: e.size,
    }));

    return {
      owner, repo,
      branch: ref,
      nodes,
      truncated: data.truncated || raw.length > MAX_NODES,
    };
  }

  // ── File content ────────────────────────────────────────────────────────────

  async getFile(owner: string, repo: string, path: string, branch?: string): Promise<FileContentResponse> {
    const params: Record<string, string> = { owner, repo, path };
    if (branch) params.ref = branch;

    const { data } = await this.octokit.rest.repos.getContent(params as Parameters<typeof this.octokit.rest.repos.getContent>[0]);

    if (Array.isArray(data)) throw new Error('Path is a directory');

    const file = data as { content?: string; encoding?: string; sha: string };
    const raw = file.content ?? '';
    const enc = (file.encoding ?? 'base64') as string;

    const content = enc === 'base64'
      ? Buffer.from(raw.replace(/\n/g, ''), 'base64').toString('utf8')
      : raw;

    return { path, content, sha: file.sha, encoding: enc };
  }

  // ── Push (create / update) ──────────────────────────────────────────────────

  async pushFile(req: PushFileRequest): Promise<PushFileResponse> {
    const contentB64 = Buffer.from(req.content, 'utf8').toString('base64');

    const params = {
      owner: req.owner,
      repo: req.repo,
      path: req.path,
      message: req.message,
      content: contentB64,
      ...(req.sha ? { sha: req.sha } : {}),
      ...(req.branch ? { branch: req.branch } : {}),
    };

    const { data } = await this.octokit.rest.repos.createOrUpdateFileContents(params);

    return {
      path: req.path,
      sha: data.content?.sha ?? '',
      commitSha: data.commit.sha ?? '',
      htmlUrl: data.content?.html_url ?? '',
    };
  }

  // ── Branches ────────────────────────────────────────────────────────────────

  async listBranches(owner: string, repo: string): Promise<BranchInfo[]> {
    // Fetch default branch name first
    const { data: repoData } = await this.octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    const { data } = await this.octokit.rest.repos.listBranches({
      owner, repo, per_page: 100,
    });

    return data.map((b) => ({
      name: b.name,
      sha: b.commit.sha,
      protected: b.protected,
      isDefault: b.name === defaultBranch,
    }));
  }

  async createBranch(req: CreateBranchRequest): Promise<BranchInfo> {
    // Resolve HEAD SHA of base branch
    const { data: ref } = await this.octokit.rest.git.getRef({
      owner: req.owner,
      repo: req.repo,
      ref: `heads/${req.fromBranch}`,
    });
    const sha = ref.object.sha;

    await this.octokit.rest.git.createRef({
      owner: req.owner,
      repo: req.repo,
      ref: `refs/heads/${req.name}`,
      sha,
    });

    return { name: req.name, sha, protected: false, isDefault: false };
  }

  async deleteBranch(owner: string, repo: string, branch: string): Promise<void> {
    await this.octokit.rest.git.deleteRef({
      owner, repo,
      ref: `heads/${branch}`,
    });
  }

  // ── Git Graph ───────────────────────────────────────────────────────────────

  async getGitGraph(owner: string, repo: string, perBranch = 35): Promise<GitGraphResponse> {
    // 1. Get repo info + branches
    const { data: repoData } = await this.octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    const { data: branchData } = await this.octokit.rest.repos.listBranches({
      owner, repo, per_page: 100,
    });

    // Limit to 8 most relevant branches (default first, then alphabetical)
    const sorted = [...branchData].sort((a, b) => {
      if (a.name === defaultBranch) return -1;
      if (b.name === defaultBranch) return 1;
      return a.name.localeCompare(b.name);
    }).slice(0, 8);

    const branchShaMap = new Map<string, string>(sorted.map((b) => [b.name, b.commit.sha]));
    const shaToB = new Map<string, string[]>(); // sha → branch names
    for (const [name, sha] of branchShaMap) {
      if (!shaToB.has(sha)) shaToB.set(sha, []);
      shaToB.get(sha)!.push(name);
    }

    // 2. Fetch commits for each branch in parallel
    const commitMap = new Map<string, GitCommit>();

    await Promise.all(
      sorted.map(async (b) => {
        try {
          const { data } = await this.octokit.rest.repos.listCommits({
            owner, repo,
            sha: b.name,
            per_page: perBranch,
          });
          for (const c of data) {
            if (commitMap.has(c.sha)) continue;
            commitMap.set(c.sha, {
              sha: c.sha,
              shortSha: c.sha.slice(0, 7),
              message: (c.commit.message ?? '').split('\n')[0].slice(0, 80),
              author: c.commit.author?.name ?? c.author?.login ?? 'Unknown',
              authorEmail: c.commit.author?.email ?? '',
              date: c.commit.author?.date ?? '',
              parents: c.parents.map((p) => p.sha),
              branches: shaToB.get(c.sha) ?? [],
            });
          }
        } catch { /* ignore inaccessible branches */ }
      })
    );

    // 3. Sort newest → oldest
    const commits = [...commitMap.values()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // 4. Assign branch colors
    const COLORS = [
      '#6366f1', '#f59e0b', '#10b981', '#ef4444',
      '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316',
    ];
    const branchColors: Record<string, string> = {};
    sorted.forEach((b, i) => {
      branchColors[b.name] = COLORS[i % COLORS.length];
    });

    return {
      commits,
      branchColors,
      defaultBranch,
      truncated: commits.length >= perBranch,
    };
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async deleteFile(req: DeleteFileRequest): Promise<void> {
    await this.octokit.rest.repos.deleteFile({
      owner: req.owner,
      repo: req.repo,
      path: req.path,
      message: req.message,
      sha: req.sha,
      ...(req.branch ? { branch: req.branch } : {}),
    });
  }
}
