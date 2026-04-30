import { useEffect, useRef, useState } from 'react';
import { X, FilePlus } from 'lucide-react';

interface Props {
  basePath?: string;     // pre-filled prefix, e.g. "src/components/"
  onConfirm: (path: string) => void;
  onCancel: () => void;
}

const ALLOWED_EXTS = ['.md', '.js', '.jsx', '.ts', '.tsx'];

export function CreateFileModal({ basePath = '', onConfirm, onCancel }: Props) {
  const [value, setValue] = useState(basePath);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const validate = (v: string): string => {
    const p = v.trim();
    if (!p) return 'Enter a file path';
    if (p.endsWith('/')) return 'Must be a file, not a directory';
    const ext = '.' + p.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) return `Allowed extensions: ${ALLOWED_EXTS.join(', ')}`;
    if (/[\\<>:"|?*]/.test(p)) return 'Path contains invalid characters';
    return '';
  };

  const handleSubmit = () => {
    const err = validate(value);
    if (err) { setError(err); return; }
    onConfirm(value.trim());
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FilePlus size={18} className="text-indigo-500" />
            <h2 className="font-semibold text-gray-800 text-sm">Create new file</h2>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">
              File path <span className="text-gray-400 font-normal">(from repo root)</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); }}
              onKeyDown={handleKey}
              placeholder="e.g. src/components/Button.tsx"
              className="w-full text-sm font-mono border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-gray-50 placeholder-gray-300"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          {/* Shortcut buttons */}
          <div className="flex gap-2 flex-wrap">
            {['.md', '.ts', '.tsx', '.js'].map((ext) => (
              <button
                key={ext}
                onClick={() => {
                  const base = value.replace(/\.[^.]+$/, '');
                  setValue((base || 'new-file') + ext);
                  setError('');
                }}
                className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors font-mono"
              >
                {ext}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="text-sm px-4 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="text-sm px-4 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors font-medium"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
