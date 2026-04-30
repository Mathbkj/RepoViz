import { useEffect, useRef, useState } from 'react';
import type { BranchInfo } from '@repo-viz/shared';
import {
  GitBranch, Plus, Trash2, Check, Loader2,
  ChevronDown, ShieldCheck, Star,
} from 'lucide-react';

interface Props {
  branches: BranchInfo[];
  currentBranch: string;
  loading: boolean;
  hasPending: boolean;
  onSwitch: (branch: string) => void;
  onCreate: (name: string, from: string) => Promise<void>;
  onDelete: (branch: string) => Promise<void>;
}

export function BranchPanel({
  branches, currentBranch, loading, hasPending,
  onSwitch, onCreate, onDelete,
}: Props) {
  const [open, setOpen]             = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName]       = useState('');
  const [newFrom, setNewFrom]       = useState(currentBranch);
  const [creating, setCreating]     = useState(false);
  const [deletingBranch, setDeletingBranch] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete]   = useState<string | null>(null);
  const [error, setError]           = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
        setConfirmDelete(null);
        setError('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus new-branch input when shown
  useEffect(() => {
    if (showCreate) {
      setNewName('');
      setNewFrom(currentBranch);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showCreate, currentBranch]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) { setError('Branch name is required'); return; }
    if (!/^[a-zA-Z0-9._\-/]+$/.test(name)) { setError('Invalid branch name'); return; }
    if (branches.some((b) => b.name === name)) { setError('Branch already exists'); return; }
    setCreating(true);
    setError('');
    try {
      await onCreate(name, newFrom);
      setShowCreate(false);
      setNewName('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create branch');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (branch: string) => {
    if (confirmDelete !== branch) { setConfirmDelete(branch); return; }
    setDeletingBranch(branch);
    setConfirmDelete(null);
    try {
      await onDelete(branch);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete branch');
    } finally {
      setDeletingBranch(null);
    }
  };

  const sortedBranches = [...branches].sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    if (a.name === currentBranch) return -1;
    if (b.name === currentBranch) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => { setOpen((v) => !v); setShowCreate(false); setConfirmDelete(null); }}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
      >
        {loading
          ? <Loader2 size={12} className="animate-spin text-gray-400" />
          : <GitBranch size={12} className="text-indigo-500" />
        }
        <span className="font-mono text-indigo-600 font-medium max-w-[140px] truncate">
          {currentBranch}
        </span>
        <ChevronDown size={11} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500">
              Branches <span className="text-gray-300 font-normal">({branches.length})</span>
            </span>
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-500 font-medium"
            >
              <Plus size={12} />
              New
            </button>
          </div>

          {/* Create branch form */}
          {showCreate && (
            <div className="px-3 py-2.5 border-b border-gray-100 bg-indigo-50/50 flex flex-col gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="branch-name"
                className="w-full text-xs font-mono border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 flex-shrink-0">from</span>
                <select
                  value={newFrom}
                  onChange={(e) => setNewFrom(e.target.value)}
                  className="flex-1 text-xs font-mono border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-[10px] text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                  Create branch
                </button>
                <button
                  onClick={() => { setShowCreate(false); setError(''); }}
                  className="text-xs px-2 py-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Branch list */}
          <div className="max-h-64 overflow-y-auto">
            {sortedBranches.map((b) => {
              const isCurrent = b.name === currentBranch;
              const isDeleting = deletingBranch === b.name;
              const isConfirm = confirmDelete === b.name;

              return (
                <div
                  key={b.name}
                  className={`flex items-center gap-2 px-3 py-2 group hover:bg-gray-50 transition-colors ${
                    isCurrent ? 'bg-indigo-50/60' : ''
                  }`}
                >
                  {/* Branch name / switch button */}
                  <button
                    onClick={() => {
                      if (isCurrent) return;
                      if (hasPending) {
                        if (!confirm('You have unsaved changes. Switch branch anyway?')) return;
                      }
                      onSwitch(b.name);
                      setOpen(false);
                    }}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                  >
                    {isCurrent
                      ? <Check size={12} className="text-indigo-500 flex-shrink-0" />
                      : <GitBranch size={12} className="text-gray-300 flex-shrink-0" />
                    }
                    <span className={`text-xs font-mono truncate ${isCurrent ? 'text-indigo-700 font-semibold' : 'text-gray-700'}`}>
                      {b.name}
                    </span>
                    {b.isDefault && (
                      <span title="Default branch"><Star size={10} className="text-amber-400 flex-shrink-0" /></span>
                    )}
                    {b.protected && (
                      <span title="Protected branch"><ShieldCheck size={10} className="text-gray-300 flex-shrink-0" /></span>
                    )}
                  </button>

                  {/* Delete button — hidden for default and protected */}
                  {!b.isDefault && !b.protected && (
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      {isConfirm ? (
                        <>
                          <button
                            onClick={() => handleDelete(b.name)}
                            disabled={isDeleting}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white hover:bg-red-600"
                          >
                            {isDeleting ? '…' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-[10px] px-1.5 py-0.5 rounded text-gray-400 hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleDelete(b.name)}
                          title="Delete branch"
                          className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hasPending && (
            <div className="px-3 py-2 border-t border-gray-100 bg-amber-50">
              <p className="text-[10px] text-amber-600">
                ⚠ You have unsaved changes — push before switching branches
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
