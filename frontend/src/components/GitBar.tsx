import { useState } from 'react';
import { RefreshCw, Upload, Loader2, FilePlus, AlertCircle } from 'lucide-react';
import type { BranchInfo } from '@repo-viz/shared';
import { BranchPanel } from './BranchPanel';

interface Props {
  repoName: string;
  branch: string;
  branches: BranchInfo[];
  loadingBranches: boolean;
  pendingCount: number;
  truncated: boolean;
  onPull: () => Promise<void>;
  onPush: (message: string) => Promise<void>;
  onNewFile: () => void;
  onSwitchBranch: (branch: string) => void;
  onCreateBranch: (name: string, from: string) => Promise<void>;
  onDeleteBranch: (branch: string) => Promise<void>;
}

export function GitBar({
  repoName, branch, branches, loadingBranches, pendingCount, truncated,
  onPull, onPush, onNewFile, onSwitchBranch, onCreateBranch, onDeleteBranch,
}: Props) {
  const [pushing, setPushing]     = useState(false);
  const [pulling, setPulling]     = useState(false);
  const [showMsg, setShowMsg]     = useState(false);
  const [message, setMessage]     = useState('');
  const [pushError, setPushError] = useState('');

  const handlePull = async () => {
    setPulling(true);
    try { await onPull(); } finally { setPulling(false); }
  };

  const handlePushClick = () => {
    if (pendingCount === 0) return;
    setMessage('feat: update files via repo-viz');
    setShowMsg(true);
    setPushError('');
  };

  const handleCommit = async () => {
    if (!message.trim()) { setPushError('Commit message is required'); return; }
    setPushing(true);
    setPushError('');
    try {
      await onPush(message.trim());
      setShowMsg(false);
      setMessage('');
    } catch (e: unknown) {
      setPushError(e instanceof Error ? e.message : 'Push failed');
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="flex flex-col border-b border-gray-200 bg-white">
      {/* Main bar */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">

        {/* Repo name */}
        <span className="text-xs font-medium text-gray-500 truncate max-w-[160px]" title={repoName}>
          {repoName}
        </span>

        <span className="text-gray-200">/</span>

        {/* Branch dropdown */}
        <BranchPanel
          branches={branches}
          currentBranch={branch}
          loading={loadingBranches}
          hasPending={pendingCount > 0}
          onSwitch={onSwitchBranch}
          onCreate={onCreateBranch}
          onDelete={onDeleteBranch}
        />

        {truncated && (
          <div className="flex items-center gap-1 text-amber-600 text-xs bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <AlertCircle size={11} />
            tree truncated
          </div>
        )}

        <div className="flex-1" />

        {/* New file */}
        <button
          onClick={onNewFile}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <FilePlus size={13} />
          New file
        </button>

        {/* Pull */}
        <button
          onClick={handlePull}
          disabled={pulling}
          title="Refresh tree from GitHub"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {pulling ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Pull
        </button>

        {/* Push */}
        <button
          onClick={handlePushClick}
          disabled={pendingCount === 0 || pushing}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors font-medium"
        >
          {pushing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          Push
          {pendingCount > 0 && (
            <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Commit message row */}
      {showMsg && (
        <div className="flex items-center gap-2 px-4 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
            <Upload size={12} />
            <span className="font-mono text-indigo-500">{branch}</span>
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => { setMessage(e.target.value); setPushError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleCommit()}
            placeholder="Commit message…"
            className="flex-1 text-xs font-mono border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            autoFocus
          />
          <button
            onClick={handleCommit}
            disabled={pushing}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 whitespace-nowrap"
          >
            {pushing ? <Loader2 size={13} className="animate-spin inline" /> : 'Commit & Push'}
          </button>
          <button onClick={() => setShowMsg(false)} className="text-xs text-gray-400 hover:text-gray-600">
            Cancel
          </button>
          {pushError && <span className="text-xs text-red-500">{pushError}</span>}
        </div>
      )}
    </div>
  );
}
