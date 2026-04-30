import { memo, useEffect, useRef } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import rough from 'roughjs';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function fileIcon(name: string, type: 'file' | 'dir'): string {
  if (type === 'dir') return '📁';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'md' || ext === 'mdx') return '📝';
  if (ext === 'ts' || ext === 'tsx') return '🔷';
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs') return '🟡';
  if (ext === 'json') return '📋';
  if (ext === 'css' || ext === 'scss') return '🎨';
  if (ext === 'html') return '🌐';
  return '📄';
}

export function fileColor(name: string, type: 'file' | 'dir'): { bg: string; border: string; text: string } {
  if (type === 'dir') return { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' };
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'md' || ext === 'mdx') return { bg: '#fefce8', border: '#ca8a04', text: '#713f12' };
  if (ext === 'ts' || ext === 'tsx') return { bg: '#eff6ff', border: '#2563eb', text: '#1e3a8a' };
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs') return { bg: '#fefce8', border: '#d97706', text: '#78350f' };
  if (ext === 'json') return { bg: '#f0fdf4', border: '#16a34a', text: '#14532d' };
  if (ext === 'css' || ext === 'scss') return { bg: '#fdf4ff', border: '#a855f7', text: '#581c87' };
  return { bg: '#f8fafc', border: '#64748b', text: '#1e293b' };
}

export type FileNodeData = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  isPending?: boolean;     // locally modified, not yet pushed
  isNew?: boolean;         // brand new, doesn't exist on GitHub yet
  selected?: boolean;
  highlighted?: boolean;
};

export type FileRoughNodeType = Node<FileNodeData, 'filenode'>;

const W = 180;
const H = 52;

export const FileRoughNode = memo(({ data, selected }: NodeProps<Node<FileNodeData, 'filenode'>>) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const style = fileColor(data.name, data.type);
  const isSelected = selected || data.selected;
  const icon = fileIcon(data.name, data.type);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const rc = rough.canvas(canvas);

    // Directories get a slightly different shape (wider rounded look)
    rc.rectangle(4, 4, W - 8, H - 8, {
      fill: data.highlighted ? '#fef08a' : style.bg,
      stroke: isSelected ? '#4f46e5' : data.isPending ? '#f97316' : style.border,
      strokeWidth: isSelected ? 2.8 : data.isPending ? 2.2 : 1.6,
      roughness: data.type === 'dir' ? 1.5 : 1.1,
      fillStyle: 'solid',
      seed: data.name.charCodeAt(0) + data.name.length,
    });

    if (data.type === 'dir') {
      // Draw a small "tab" on top like a folder
      rc.line(4, 10, 40, 10, { stroke: style.border, strokeWidth: 1, roughness: 1 });
    }
  }, [style, data.name, data.type, isSelected, data.highlighted, data.isPending]);

  return (
    <div style={{ width: W, height: H, position: 'relative', cursor: 'pointer' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

      <div
        className="absolute inset-0 flex items-center px-3 gap-2 pointer-events-none"
        style={{ color: style.text }}
      >
        <span className="text-base flex-shrink-0">{icon}</span>
        <div className="flex flex-col min-w-0">
          <span className="font-hand font-bold text-xs leading-tight truncate">
            {data.name}
          </span>
          {data.size !== undefined && data.size > 0 && (
            <span className="text-[9px] opacity-50 font-mono">
              {data.size < 1024 ? `${data.size}B` : `${(data.size / 1024).toFixed(1)}KB`}
            </span>
          )}
        </div>

        {/* Pending / new badges */}
        {data.isNew && (
          <span className="ml-auto text-[8px] font-bold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 flex-shrink-0">
            NEW
          </span>
        )}
        {data.isPending && !data.isNew && (
          <span className="ml-auto text-[8px] font-bold px-1 py-0.5 rounded bg-orange-100 text-orange-700 flex-shrink-0">
            MODIFIED
          </span>
        )}
      </div>

      <Handle type="target" position={Position.Top}    className="!bg-slate-300 !w-1.5 !h-1.5 !border-none !rounded-full" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-1.5 !h-1.5 !border-none !rounded-full" />
      <Handle type="target" position={Position.Left}   className="!bg-slate-300 !w-1.5 !h-1.5 !border-none !rounded-full" />
      <Handle type="source" position={Position.Right}  className="!bg-slate-300 !w-1.5 !h-1.5 !border-none !rounded-full" />
    </div>
  );
});

FileRoughNode.displayName = 'FileRoughNode';
