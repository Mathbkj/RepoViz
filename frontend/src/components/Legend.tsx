import type { NodeType } from '@repo-viz/shared';
import { getNodeStyle } from '../utils/nodeStyle';

const TYPES: { type: NodeType; label: string }[] = [
  { type: 'EntryPoint', label: 'Entry Point' },
  { type: 'Route',      label: 'Route / Controller' },
  { type: 'Component',  label: 'UI Component' },
  { type: 'Service',    label: 'Service' },
  { type: 'API',        label: 'API Client' },
  { type: 'Database',   label: 'Database / Model' },
  { type: 'Config',     label: 'Config' },
  { type: 'Utility',    label: 'Utility' },
  { type: 'Unknown',    label: 'Other' },
];

interface Props {
  activeTypes: Set<NodeType>;
  onToggle: (type: NodeType) => void;
}

export function Legend({ activeTypes, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2 bg-white border-b border-gray-100">
      {TYPES.map(({ type, label }) => {
        const s = getNodeStyle(type);
        const active = activeTypes.has(type);
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            title={`Toggle ${label} nodes`}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-opacity"
            style={{
              background: active ? s.bg : '#f3f4f6',
              borderColor: active ? s.border : '#d1d5db',
              color: active ? s.text : '#9ca3af',
              opacity: active ? 1 : 0.6,
            }}
          >
            <span>{s.icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
