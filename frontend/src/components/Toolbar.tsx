import { Download, LayoutTemplate, Image } from 'lucide-react';

export type LayoutDir = 'TB' | 'LR';

interface Props {
  layout: LayoutDir;
  onLayoutChange: (dir: LayoutDir) => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  nodeCount: number;
  edgeCount: number;
}

export function Toolbar({ layout, onLayoutChange, onExportPng, onExportSvg, nodeCount, edgeCount }: Props) {
  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white border border-gray-200 rounded-xl shadow-md px-3 py-2">
      {/* Stats */}
      <span className="text-xs text-gray-400 pr-2 border-r border-gray-200">
        {nodeCount} nodes · {edgeCount} edges
      </span>

      {/* Layout toggle */}
      <div className="flex items-center gap-1">
        <LayoutTemplate size={14} className="text-gray-400" />
        <button
          onClick={() => onLayoutChange(layout === 'TB' ? 'LR' : 'TB')}
          title={layout === 'TB' ? 'Switch to horizontal layout' : 'Switch to vertical layout'}
          className="text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700 font-mono transition-colors"
        >
          {layout}
        </button>
      </div>

      {/* Export */}
      <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
        <Download size={14} className="text-gray-400" />
        <button
          onClick={onExportPng}
          title="Export as PNG"
          className="text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-green-100 text-gray-600 hover:text-green-700 font-medium transition-colors"
        >
          PNG
        </button>
        <button
          onClick={onExportSvg}
          title="Export as SVG"
          className="text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 font-medium transition-colors"
        >
          <Image size={12} className="inline mr-0.5" />SVG
        </button>
      </div>
    </div>
  );
}
