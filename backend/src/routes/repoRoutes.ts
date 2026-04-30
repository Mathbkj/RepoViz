import { Router, type Request, type Response } from 'express';
import { GitHubService } from '../services/githubService';
import type { PushFileRequest, DeleteFileRequest, CreateBranchRequest } from '@repo-viz/shared';

const router = Router();

// ── Extract token from Authorization header ───────────────────────────────────
function getToken(req: Request): string | null {
  const auth = req.headers.authorization ?? '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function svc(req: Request): GitHubService {
  const token = getToken(req);
  if (!token) throw new Error('Missing authorization token');
  return new GitHubService(token);
}

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[repo]', msg);
      res.status(400).json({ error: msg });
    });
  };
}

// ── GET /api/repo/me ──────────────────────────────────────────────────────────
router.get('/me', wrap(async (req, res) => {
  const user = await svc(req).getUser();
  res.json(user);
}));

// ── GET /api/repo/list ────────────────────────────────────────────────────────
router.get('/list', wrap(async (req, res) => {
  const repos = await svc(req).listRepos();
  res.json(repos);
}));

// ── GET /api/repo/tree?owner=&repo=&branch= ───────────────────────────────────
router.get('/tree', wrap(async (req, res) => {
  const { owner, repo, branch } = req.query as Record<string, string | undefined>;
  if (!owner || !repo) { res.status(400).json({ error: 'owner and repo are required' }); return; }
  const tree = await svc(req).getTree(owner, repo, branch);
  res.json(tree);
}));

// ── GET /api/repo/file?owner=&repo=&path=&branch= ────────────────────────────
router.get('/file', wrap(async (req, res) => {
  const { owner, repo, path, branch } = req.query as Record<string, string | undefined>;
  if (!owner || !repo || !path) { res.status(400).json({ error: 'owner, repo and path are required' }); return; }
  const file = await svc(req).getFile(owner, repo, path, branch);
  res.json(file);
}));

// ── PUT /api/repo/file ────────────────────────────────────────────────────────
router.put('/file', wrap(async (req, res) => {
  const body = req.body as PushFileRequest;
  if (!body.owner || !body.repo || !body.path || body.content == null) {
    res.status(400).json({ error: 'owner, repo, path and content are required' });
    return;
  }
  const result = await svc(req).pushFile(body);
  res.json(result);
}));

// ── GET /api/repo/git-graph?owner=&repo= ─────────────────────────────────────
router.get('/git-graph', wrap(async (req, res) => {
  const { owner, repo } = req.query as Record<string, string | undefined>;
  if (!owner || !repo) { res.status(400).json({ error: 'owner and repo are required' }); return; }
  const graph = await svc(req).getGitGraph(owner, repo);
  res.json(graph);
}));

// ── GET /api/repo/branches?owner=&repo= ──────────────────────────────────────
router.get('/branches', wrap(async (req, res) => {
  const { owner, repo } = req.query as Record<string, string | undefined>;
  if (!owner || !repo) { res.status(400).json({ error: 'owner and repo are required' }); return; }
  const branches = await svc(req).listBranches(owner, repo);
  res.json(branches);
}));

// ── POST /api/repo/branches ───────────────────────────────────────────────────
router.post('/branches', wrap(async (req, res) => {
  const body = req.body as CreateBranchRequest;
  if (!body.owner || !body.repo || !body.name || !body.fromBranch) {
    res.status(400).json({ error: 'owner, repo, name and fromBranch are required' });
    return;
  }
  const branch = await svc(req).createBranch(body);
  res.status(201).json(branch);
}));

// ── DELETE /api/repo/branches/:branch ─────────────────────────────────────────
router.delete('/branches/:branch', wrap(async (req, res) => {
  const { owner, repo } = req.body as { owner: string; repo: string };
  const branch = req.params.branch;
  if (!owner || !repo) { res.status(400).json({ error: 'owner and repo are required' }); return; }
  await svc(req).deleteBranch(owner, repo, branch);
  res.status(204).send();
}));

// ── DELETE /api/repo/file ─────────────────────────────────────────────────────
router.delete('/file', wrap(async (req, res) => {
  const body = req.body as DeleteFileRequest;
  if (!body.owner || !body.repo || !body.path || !body.sha) {
    res.status(400).json({ error: 'owner, repo, path and sha are required' });
    return;
  }
  await svc(req).deleteFile(body);
  res.status(204).send();
}));

export default router;
