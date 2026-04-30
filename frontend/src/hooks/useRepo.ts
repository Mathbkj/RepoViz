import { useCallback, useState } from 'react';
import type { RepoTreeResponse, FileContentResponse, PushFileRequest, PushFileResponse, RepoInfo, BranchInfo, CreateBranchRequest, GitGraphResponse } from '@repo-viz/shared';
import { API_BASE } from '../config';

export interface PendingFile {
  path: string;
  content: string;
  sha?: string;       // undefined = new file, defined = update
  isNew: boolean;
}

export function useRepo(token: string | null) {
  const headers = useCallback((): HeadersInit => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const listRepos = useCallback(async (): Promise<RepoInfo[]> => {
    const r = await fetch(`${API_BASE}/api/repo/list`, { headers: headers() });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }, [headers]);

  const getTree = useCallback(async (owner: string, repo: string, branch?: string): Promise<RepoTreeResponse> => {
    const params = new URLSearchParams({ owner, repo });
    if (branch) params.set('branch', branch);
    const r = await fetch(`${API_BASE}/api/repo/tree?${params}`, { headers: headers() });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }, [headers]);

  const getFile = useCallback(async (owner: string, repo: string, path: string, branch?: string): Promise<FileContentResponse> => {
    const params = new URLSearchParams({ owner, repo, path });
    if (branch) params.set('branch', branch);
    const r = await fetch(`${API_BASE}/api/repo/file?${params}`, { headers: headers() });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }, [headers]);

  const pushFile = useCallback(async (req: PushFileRequest): Promise<PushFileResponse> => {
    const r = await fetch(`${API_BASE}/api/repo/file`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(req),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }, [headers]);

  const listBranches = useCallback(async (owner: string, repo: string): Promise<BranchInfo[]> => {
    const r = await fetch(`${API_BASE}/api/repo/branches?${new URLSearchParams({ owner, repo })}`, { headers: headers() });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }, [headers]);

  const createBranch = useCallback(async (req: CreateBranchRequest): Promise<BranchInfo> => {
    const r = await fetch(`${API_BASE}/api/repo/branches`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(req),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }, [headers]);

  const deleteBranch = useCallback(async (owner: string, repo: string, branch: string) => {
    const r = await fetch(`${API_BASE}/api/repo/branches/${encodeURIComponent(branch)}`, {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ owner, repo }),
    });
    if (!r.ok) throw new Error(await r.text());
  }, [headers]);

  const deleteFile = useCallback(async (owner: string, repo: string, path: string, sha: string, branch?: string) => {
    const r = await fetch(`${API_BASE}/api/repo/file`, {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ owner, repo, path, sha, message: `chore: delete ${path}`, branch }),
    });
    if (!r.ok) throw new Error(await r.text());
  }, [headers]);

  const getGitGraph = useCallback(async (owner: string, repo: string): Promise<GitGraphResponse> => {
    const r = await fetch(`${API_BASE}/api/repo/git-graph?${new URLSearchParams({ owner, repo })}`, { headers: headers() });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }, [headers]);

  return { listRepos, getTree, getFile, pushFile, deleteFile, listBranches, createBranch, deleteBranch, getGitGraph };
}

// Track local pending changes (not yet pushed)
export function usePendingFiles() {
  const [pending, setPending] = useState<Map<string, PendingFile>>(new Map());

  const addOrUpdate = useCallback((file: PendingFile) => {
    setPending((prev) => new Map(prev).set(file.path, file));
  }, []);

  const remove = useCallback((path: string) => {
    setPending((prev) => { const n = new Map(prev); n.delete(path); return n; });
  }, []);

  const clear = useCallback(() => setPending(new Map()), []);

  return { pending, addOrUpdate, remove, clear };
}
