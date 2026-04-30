const LAYER_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  frontend:  { bg: '#ede9fe', border: '#7c3aed', label: 'Frontend' },
  backend:   { bg: '#dcfce7', border: '#16a34a', label: 'Backend' },
  shared:    { bg: '#dbeafe', border: '#3b82f6', label: 'Shared' },
  packages:  { bg: '#fef3c7', border: '#d97706', label: 'Packages' },
  root:      { bg: '#f1f5f9', border: '#64748b', label: 'Root' },
};

const FALLBACK = { bg: '#f9fafb', border: '#d1d5db', label: '' };

export function getLayerColor(layer: string) {
  return LAYER_COLORS[layer] ?? { ...FALLBACK, label: layer };
}

export const KNOWN_LAYERS = Object.keys(LAYER_COLORS);
