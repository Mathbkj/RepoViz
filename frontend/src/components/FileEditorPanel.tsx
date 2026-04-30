import { useCallback, useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { X, Save, Loader2 } from 'lucide-react';

interface Props {
  path: string;
  initialContent: string | null;   // null = loading
  sha?: string;
  isNew: boolean;
  isDirty: boolean;
  onSave: (content: string) => void;
  onClose: () => void;
}

function langExt(path: string) {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'ts' || ext === 'tsx') return javascript({ typescript: true, jsx: ext === 'tsx' });
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs') return javascript({ jsx: ext === 'jsx' });
  if (ext === 'md' || ext === 'mdx') return markdown();
  return undefined;
}

export function FileEditorPanel({ path, initialContent, isNew, isDirty, onSave, onClose }: Props) {
  const [content, setContent] = useState(initialContent ?? '');
  const [localDirty, setLocalDirty] = useState(false);

  // Sync when initialContent changes (file loaded)
  useEffect(() => {
    if (initialContent !== null) {
      setContent(initialContent);
      setLocalDirty(false);
    }
  }, [initialContent, path]);

  const handleChange = useCallback((val: string) => {
    setContent(val);
    setLocalDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    onSave(content);
    setLocalDirty(false);
  }, [content, onSave]);

  // Ctrl+S / Cmd+S shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (localDirty) handleSave();
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, localDirty, onClose]);

  const ext = langExt(path);
  const filename = path.split('/').pop()!;
  const dirty = localDirty || isDirty;

  return (
    <div className="w-[480px] flex flex-col border-l border-gray-200 bg-[#1e1e2e] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#181825] border-b border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-gray-400 truncate" title={path}>
            {path}
          </span>
          {isNew && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-300">NEW</span>
          )}
          {dirty && (
            <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" title="Unsaved changes" />
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={!dirty}
            title="Save changes (Ctrl+S)"
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 transition-colors"
          >
            <Save size={11} />
            Save
          </button>
          <button
            onClick={onClose}
            title="Close editor (Esc)"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Filename bar */}
      <div className="px-3 py-1 bg-[#1e1e2e] border-b border-gray-700/30 text-[10px] font-mono text-gray-500 flex-shrink-0">
        {filename}
      </div>

      {/* Editor */}
      {initialContent === null ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-gray-500" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <CodeMirror
            value={content}
            onChange={handleChange}
            theme={oneDark}
            extensions={ext ? [ext] : []}
            basicSetup={{ lineNumbers: true, foldGutter: true }}
            style={{ fontSize: 13, height: '100%' }}
            height="100%"
          />
        </div>
      )}
    </div>
  );
}
