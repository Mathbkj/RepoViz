import type { GraphNode } from '@repo-viz/shared';
import { getNodeStyle } from '../utils/nodeStyle';
import { X } from 'lucide-react';

interface Props {
  node: GraphNode;
  onClose: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  EntryPoint: 'Entry Point', Route: 'Route / Controller',
  Component: 'UI Component', Service: 'Service',
  API: 'API Client/Handler', Database: 'Database / Model',
  Config: 'Configuration', Utility: 'Utility', Unknown: 'Source File',
};

export function SidePanel({ node, onClose }: Props) {
  const style = getNodeStyle(node.type);

  return (
    <aside className="w-72 flex flex-col border-l border-gray-200 bg-white overflow-y-auto shadow-lg z-10 animate-slide-in">
      {/* header */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: style.bg, borderBottom: `2px solid ${style.border}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{style.icon}</span>
          <span className="font-semibold text-sm truncate" style={{ color: style.text }}>
            {node.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 ml-2 flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
          aria-label="Close panel (Esc)"
          title="Close (Esc)"
        >
          <X size={14} />
        </button>
      </div>

      {/* body */}
      <div className="flex flex-col gap-4 p-4 flex-1">
        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: style.border + '20', color: style.border }}
          >
            {TYPE_LABEL[node.type] ?? node.type}
          </span>
          {node.layer && node.layer !== 'root' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {node.layer}
            </span>
          )}
          {node.packageName && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 font-mono">
              {node.packageName}
            </span>
          )}
        </div>

        {/* Summary */}
        {node.summary && (
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
            {node.summary}
          </p>
        )}

        {/* Path */}
        <Field label="Path">
          <code className="text-xs font-mono bg-gray-50 rounded px-2 py-1.5 block break-all text-gray-700 border border-gray-100">
            {node.path}
          </code>
        </Field>

        {/* Connection stats */}
        {((node.importedByCount ?? 0) + (node.importsCount ?? 0)) > 0 && (
          <Field label="Connections">
            <div className="flex gap-3">
              {(node.importsCount ?? 0) > 0 && (
                <Stat label="imports" value={node.importsCount!} color="#6366f1" />
              )}
              {(node.importedByCount ?? 0) > 0 && (
                <Stat label="imported by" value={node.importedByCount!} color="#16a34a" />
              )}
            </div>
          </Field>
        )}

        {/* Meta */}
        <div className="grid grid-cols-2 gap-3">
          {node.ext && <SmallField label="Extension" value={node.ext} />}
          {node.size !== undefined && (
            <SmallField
              label="File size"
              value={node.size < 1024 ? `${node.size} B` : `${(node.size / 1024).toFixed(1)} KB`}
            />
          )}
        </div>
      </div>

      <div className="px-4 pb-3 text-[10px] text-gray-300 text-center">
        Press <kbd className="bg-gray-100 text-gray-400 px-1 py-0.5 rounded text-[10px]">Esc</kbd> to close
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function SmallField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
      <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xs font-mono text-gray-700">{value}</p>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-lg font-bold font-hand" style={{ color }}>{value}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}
