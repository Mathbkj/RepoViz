import type { NodeType } from '@repo-viz/shared';

interface NodeStyle {
  bg: string;
  border: string;
  text: string;
  icon: string;
}

const STYLES: Record<NodeType, NodeStyle> = {
  EntryPoint: { bg: '#fef3c7', border: '#d97706', text: '#92400e', icon: '⚡' },
  Route:      { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a', icon: '🛣️' },
  Component:  { bg: '#ede9fe', border: '#7c3aed', text: '#4c1d95', icon: '🧩' },
  Service:    { bg: '#dcfce7', border: '#16a34a', text: '#14532d', icon: '⚙️' },
  API:        { bg: '#fff1f2', border: '#f43f5e', text: '#881337', icon: '🔌' },
  Database:   { bg: '#fae8ff', border: '#a855f7', text: '#581c87', icon: '🗄️' },
  Config:     { bg: '#f1f5f9', border: '#64748b', text: '#1e293b', icon: '⚙' },
  Utility:    { bg: '#fefce8', border: '#ca8a04', text: '#713f12', icon: '🔧' },
  Unknown:    { bg: '#f9fafb', border: '#9ca3af', text: '#374151', icon: '📄' },
};

export function getNodeStyle(type: NodeType): NodeStyle {
  return STYLES[type] ?? STYLES.Unknown;
}
