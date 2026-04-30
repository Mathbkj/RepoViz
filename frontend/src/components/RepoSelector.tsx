import { useState } from 'react';
import type { GitHubUser, RepoInfo } from '@repo-viz/shared';
import { Search, Lock, Globe, Loader2, Github, LogOut } from 'lucide-react';

interface Props {
  user: GitHubUser;
  repos: RepoInfo[];
  loadingRepos: boolean;
  onSelect: (owner: string, repo: string, branch: string) => void;
  onLogout: () => void;
  onManualUrl: (url: string) => void;
}

export function RepoSelector({ user, repos, loadingRepos, onSelect, onLogout, onManualUrl }: Props) {
  const [search, setSearch] = useState('');
  const [manualUrl, setManualUrl] = useState('');

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleManual = () => {
    const m = manualUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/);
    if (!m) return;
    onManualUrl(manualUrl);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf8]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Github size={18} className="text-gray-600" />
          <span className="font-bold text-gray-800 text-sm">repo-viz</span>
        </div>
        <div className="flex items-center gap-3">
          <img src={user.avatar_url} alt={user.login} className="w-7 h-7 rounded-full" />
          <span className="text-sm text-gray-600">{user.name ?? user.login}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full py-10 px-4 flex flex-col gap-6">
        <h2 className="text-xl font-bold text-gray-700">Select a repository</h2>

        {/* Manual URL input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManual()}
            placeholder="https://github.com/owner/repo"
            className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white placeholder-gray-300"
          />
          <button
            onClick={handleManual}
            disabled={!manualUrl.includes('github.com/')}
            className="text-sm px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
          >
            Open
          </button>
        </div>

        {/* Search your repos */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your repositories…"
              className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          </div>

          {loadingRepos ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-gray-300" />
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto">
              {filtered.map((r) => (
                <button
                  key={r.full_name}
                  onClick={() => {
                    const [owner, repo] = r.full_name.split('/');
                    onSelect(owner, repo, r.default_branch);
                  }}
                  className="flex items-start gap-3 text-left px-4 py-3 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors shadow-sm"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {r.private ? <Lock size={14} className="text-gray-400" /> : <Globe size={14} className="text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-700 truncate">{r.full_name}</span>
                      {r.language && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {r.language}
                        </span>
                      )}
                    </div>
                    {r.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{r.description}</p>
                    )}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && !loadingRepos && (
                <p className="text-center text-sm text-gray-400 py-6">No repositories found</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
