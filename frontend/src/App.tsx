import { useCallback, useEffect, useState } from 'react';
import type { RepoInfo, TreeNode, BranchInfo } from '@repo-viz/shared';
import { useAuth } from './hooks/useAuth';
import { useRepo, usePendingFiles, type PendingFile } from './hooks/useRepo';
import { LoginPage } from './components/LoginPage';
import { RepoSelector } from './components/RepoSelector';
import { FileTreeCanvas } from './components/FileTreeCanvas';
import { FileEditorPanel } from './components/FileEditorPanel';
import { CreateFileModal } from './components/CreateFileModal';
import { GitBar } from './components/GitBar';
import { GitGraphView } from './components/GitGraphView';
import type { GitGraphResponse } from '@repo-viz/shared';
import { Search, X, Github, LogOut, ChevronLeft, GitBranch, FolderTree } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActiveRepo {
  owner: string;
  repo: string;
  branch: string;
}

interface OpenFile {
  path: string;
  content: string | null;   // null = loading
  sha?: string;
  isNew: boolean;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const { token, user, loading: authLoading, login, logout } = useAuth();
  const api = useRepo(token);

  // ── Repo list ────────────────────────────────────────────────────────────────
  const [repos, setRepos]           = useState<RepoInfo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // ── Active repo ──────────────────────────────────────────────────────────────
  const [activeRepo, setActiveRepo]   = useState<ActiveRepo | null>(null);
  const [treeNodes, setTreeNodes]     = useState<TreeNode[]>([]);
  const [truncated, setTruncated]     = useState(false);
  const [loadingTree, setLoadingTree] = useState(false);
  const [treeError, setTreeError]     = useState('');

  // ── Branches ─────────────────────────────────────────────────────────────────
  const [branches, setBranches]           = useState<BranchInfo[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // ── Editor ───────────────────────────────────────────────────────────────────
  const [openFile, setOpenFile]     = useState<OpenFile | null>(null);

  // ── Pending changes ──────────────────────────────────────────────────────────
  const { pending, addOrUpdate, clear: clearPending } = usePendingFiles();

  // ── UI ───────────────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]       = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createBasePath, setCreateBasePath]   = useState('');
  const [view, setView] = useState<'files' | 'graph'>('files');

  // ── Git graph ─────────────────────────────────────────────────────────────────
  const [gitGraph, setGitGraph]         = useState<GitGraphResponse | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [graphError, setGraphError]     = useState('');

  // ── Load user repos on login ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setRepos([]); return; }
    setLoadingRepos(true);
    api.listRepos().then(setRepos).catch(console.error).finally(() => setLoadingRepos(false));
  }, [user]);

  // ── Load branches ─────────────────────────────────────────────────────────────
  const loadBranches = useCallback(async (owner: string, repo: string) => {
    setLoadingBranches(true);
    try {
      const result = await api.listBranches(owner, repo);
      setBranches(result);
    } catch { /* non-critical */ }
    finally { setLoadingBranches(false); }
  }, [api]);

  // ── Load tree ─────────────────────────────────────────────────────────────────
  const loadTree = useCallback(async (owner: string, repo: string, branch: string) => {
    setLoadingTree(true);
    setTreeError('');
    setActiveRepo({ owner, repo, branch });
    setTreeNodes([]);
    setOpenFile(null);
    clearPending();
    try {
      const result = await api.getTree(owner, repo, branch);
      setTreeNodes(result.nodes);
      setTruncated(result.truncated);
      // resolve real branch name (getTree resolves HEAD → actual branch)
      setActiveRepo({ owner, repo, branch: result.branch });
    } catch (e: unknown) {
      setTreeError(e instanceof Error ? e.message : 'Failed to load tree');
    } finally {
      setLoadingTree(false);
    }
  }, [api, clearPending]);

  // ── Select repo ───────────────────────────────────────────────────────────────
  const handleSelectRepo = useCallback((owner: string, repo: string, branch: string) => {
    loadTree(owner, repo, branch);
    loadBranches(owner, repo);
  }, [loadTree, loadBranches]);

  const handleManualUrl = useCallback((url: string) => {
    const m = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (!m) return;
    const [, owner, repoRaw] = m;
    const repo = repoRaw.replace(/\.git$/, '');
    loadTree(owner, repo, 'HEAD');
    loadBranches(owner, repo);
  }, [loadTree, loadBranches]);

  // ── Open file for editing ─────────────────────────────────────────────────────
  const openFileForEdit = useCallback(async (path: string, type: 'file' | 'dir') => {
    if (type === 'dir') return;
    if (!activeRepo) return;

    // If it's a pending new file, use pending content
    const pend = pending.get(path);
    if (pend?.isNew) {
      setOpenFile({ path, content: pend.content, isNew: true });
      return;
    }

    setOpenFile({ path, content: null, isNew: false });
    try {
      const f = await api.getFile(activeRepo.owner, activeRepo.repo, path, activeRepo.branch);
      setOpenFile({ path, content: pend ? pend.content : f.content, sha: f.sha, isNew: false });
    } catch (e) {
      setOpenFile({ path, content: `// Error loading file: ${e}`, isNew: false });
    }
  }, [activeRepo, api, pending]);

  // ── Save (stage locally) ──────────────────────────────────────────────────────
  const handleSave = useCallback((content: string) => {
    if (!openFile) return;
    addOrUpdate({
      path: openFile.path,
      content,
      sha: openFile.sha,
      isNew: openFile.isNew,
    });
    setOpenFile((prev) => prev ? { ...prev, content } : null);
  }, [openFile, addOrUpdate]);

  // ── Push all pending ──────────────────────────────────────────────────────────
  const handlePush = useCallback(async (message: string) => {
    if (!activeRepo) return;
    const files = [...pending.values()];
    for (const f of files) {
      await api.pushFile({
        owner: activeRepo.owner,
        repo: activeRepo.repo,
        path: f.path,
        content: f.content,
        message,
        sha: f.sha,
        branch: activeRepo.branch === 'HEAD' ? undefined : activeRepo.branch,
      });
    }
    clearPending();
    // Refresh tree to get new SHAs
    await loadTree(activeRepo.owner, activeRepo.repo, activeRepo.branch);
  }, [activeRepo, pending, api, clearPending, loadTree]);

  // ── Pull (refresh tree) ───────────────────────────────────────────────────────
  const handlePull = useCallback(async () => {
    if (!activeRepo) return;
    await loadTree(activeRepo.owner, activeRepo.repo, activeRepo.branch);
  }, [activeRepo, loadTree]);

  // ── Load git graph ────────────────────────────────────────────────────────────
  const loadGitGraph = useCallback(async (owner: string, repo: string) => {
    setLoadingGraph(true);
    setGraphError('');
    try {
      const data = await api.getGitGraph(owner, repo);
      setGitGraph(data);
    } catch (e: unknown) {
      setGraphError(e instanceof Error ? e.message : 'Failed to load graph');
    } finally {
      setLoadingGraph(false);
    }
  }, [api]);

  // Trigger graph load when switching to graph view
  const handleViewChange = useCallback((v: 'files' | 'graph') => {
    setView(v);
    if (v === 'graph' && !gitGraph && activeRepo) {
      loadGitGraph(activeRepo.owner, activeRepo.repo);
    }
  }, [gitGraph, activeRepo, loadGitGraph]);

  // ── Branch operations ─────────────────────────────────────────────────────────
  const handleSwitchBranch = useCallback((branch: string) => {
    if (!activeRepo) return;
    clearPending();
    setOpenFile(null);
    loadTree(activeRepo.owner, activeRepo.repo, branch);
  }, [activeRepo, loadTree, clearPending]);

  const handleCreateBranch = useCallback(async (name: string, from: string) => {
    if (!activeRepo) return;
    const newBranch = await api.createBranch({
      owner: activeRepo.owner,
      repo: activeRepo.repo,
      name,
      fromBranch: from,
    });
    setBranches((prev) => [...prev, newBranch]);
    setGitGraph(null); // invalidate graph cache
    clearPending();
    setOpenFile(null);
    await loadTree(activeRepo.owner, activeRepo.repo, name);
  }, [activeRepo, api, loadTree, clearPending]);

  const handleDeleteBranch = useCallback(async (branch: string) => {
    if (!activeRepo) return;
    await api.deleteBranch(activeRepo.owner, activeRepo.repo, branch);
    setBranches((prev) => prev.filter((b) => b.name !== branch));
    setGitGraph(null); // invalidate graph cache
    if (activeRepo.branch === branch) {
      const def = branches.find((b) => b.isDefault);
      if (def) await loadTree(activeRepo.owner, activeRepo.repo, def.name);
    }
  }, [activeRepo, api, branches, loadTree]);

  // ── Create file ───────────────────────────────────────────────────────────────
  const handleCreateFile = useCallback((path: string) => {
    setShowCreateModal(false);
    const isNew = !treeNodes.some((n) => n.path === path);
    const newFile: PendingFile = { path, content: '', sha: undefined, isNew };

    addOrUpdate(newFile);

    // Add to tree if truly new
    if (isNew) {
      const name = path.split('/').pop()!;
      setTreeNodes((prev) => [...prev, { type: 'file', path, name, sha: '__new__' }]);
    }

    setOpenFile({ path, content: '', isNew, sha: undefined });
  }, [treeNodes, addOrUpdate]);

  // ── Double-click on canvas → create file in that area ────────────────────────
  const handleDoubleClickCanvas = useCallback((evt: React.MouseEvent) => {
    const target = evt.target as HTMLElement;
    if (target.closest('.react-flow__node')) return;
    setCreateBasePath('');
    setShowCreateModal(true);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────

  const pendingPaths = new Set(pending.keys());
  const newPaths = new Set([...pending.values()].filter((f) => f.isNew).map((f) => f.path));

  // Loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf8]">
        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated
  if (!user) return <LoginPage onLogin={login} />;

  // No repo selected — show selector
  if (!activeRepo) {
    return (
      <RepoSelector
        user={user}
        repos={repos}
        loadingRepos={loadingRepos}
        onSelect={handleSelectRepo}
        onLogout={logout}
        onManualUrl={handleManualUrl}
      />
    );
  }

  // ── Main editor view ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#fafaf8]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
        <button
          onClick={() => { setActiveRepo(null); setOpenFile(null); clearPending(); }}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft size={14} />
          Repos
        </button>

        <div className="h-4 w-px bg-gray-200" />

        <Github size={16} className="text-gray-400 flex-shrink-0" />
        <span className="font-semibold text-gray-700 text-sm">repo-viz</span>

        <div className="h-4 w-px bg-gray-200" />

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => handleViewChange('files')}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${
              view === 'files' ? 'bg-white shadow-sm text-gray-700 font-medium' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <FolderTree size={12} />
            Files
          </button>
          <button
            onClick={() => handleViewChange('graph')}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors ${
              view === 'graph' ? 'bg-white shadow-sm text-gray-700 font-medium' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <GitBranch size={12} />
            Graph
          </button>
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files…"
            className="pl-7 pr-7 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 w-44"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <X size={11} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <img src={user.avatar_url} alt={user.login} className="w-6 h-6 rounded-full" />
          <button onClick={logout} className="text-gray-300 hover:text-gray-500 transition-colors">
            <LogOut size={13} />
          </button>
        </div>
      </div>

      {/* Git bar */}
      <GitBar
        repoName={`${activeRepo.owner}/${activeRepo.repo}`}
        branch={activeRepo.branch}
        branches={branches}
        loadingBranches={loadingBranches}
        pendingCount={pending.size}
        truncated={truncated}
        onPull={handlePull}
        onPush={handlePush}
        onNewFile={() => { setCreateBasePath(''); setShowCreateModal(true); }}
        onSwitchBranch={handleSwitchBranch}
        onCreateBranch={handleCreateBranch}
        onDeleteBranch={handleDeleteBranch}
      />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {view === 'files' ? (
          <>
            {loadingTree ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
                <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-sm">Loading repository tree…</p>
              </div>
            ) : treeError ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-red-500 bg-red-50 border border-red-200 rounded-xl p-6 max-w-sm">
                  <p className="font-medium">Failed to load repository</p>
                  <p className="text-sm mt-1 text-red-400">{treeError}</p>
                </div>
              </div>
            ) : (
              <FileTreeCanvas
                treeNodes={treeNodes}
                pendingPaths={pendingPaths}
                newPaths={newPaths}
                selectedPath={openFile?.path ?? null}
                searchQuery={searchQuery}
                branches={branches}
                activeBranch={activeRepo.branch}
                branchColors={gitGraph?.branchColors}
                onSelectFile={openFileForEdit}
                onDoubleClickCanvas={handleDoubleClickCanvas}
              />
            )}
            {openFile && (
              <FileEditorPanel
                key={openFile.path}
                path={openFile.path}
                initialContent={openFile.content}
                sha={openFile.sha}
                isNew={openFile.isNew}
                isDirty={pending.has(openFile.path)}
                onSave={handleSave}
                onClose={() => setOpenFile(null)}
              />
            )}
          </>
        ) : (
          <GitGraphView
            owner={activeRepo.owner}
            repo={activeRepo.repo}
            currentBranch={activeRepo.branch}
            graphData={gitGraph}
            loading={loadingGraph}
            error={graphError}
            onSwitchBranch={handleSwitchBranch}
          />
        )}
      </div>

      {/* Create file modal */}
      {showCreateModal && (
        <CreateFileModal
          basePath={createBasePath}
          onConfirm={handleCreateFile}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
