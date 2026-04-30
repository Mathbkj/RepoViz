import { memo, useEffect, useRef } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import rough from 'roughjs';
import type { NodeType } from '@repo-viz/shared';
import { getNodeStyle } from '../utils/nodeStyle';

const W = 180;
const H = 64;

export type RoughNodeData = {
  label: string;
  nodeType: NodeType;
  summary?: string;
  layer?: string;
  icon?: string;
  selected?: boolean;
  highlighted?: boolean;
  importedByCount?: number;
};

export type RoughNodeType = Node<RoughNodeData, 'rough'>;

export const RoughNode = memo(({ data, selected }: NodeProps<RoughNodeType>) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const style = getNodeStyle(data.nodeType);
  const isSelected = selected || data.selected;
  const isHighlighted = data.highlighted;

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
    rc.rectangle(4, 4, W - 8, H - 8, {
      fill: isHighlighted ? '#fef08a' : style.bg,
      stroke: isSelected ? '#4f46e5' : isHighlighted ? '#ca8a04' : style.border,
      strokeWidth: isSelected ? 2.8 : isHighlighted ? 2.2 : 1.8,
      roughness: 1.3,
      fillStyle: 'solid',
      seed: 42 + (data.label.charCodeAt(0) ?? 0),
    });

    if (isSelected) {
      rc.rectangle(2, 2, W - 4, H - 4, {
        fill: 'transparent',
        stroke: '#818cf8',
        strokeWidth: 1,
        roughness: 1.5,
        seed: 99,
      });
    }
  }, [style, data.label, isSelected]);

  return (
    <div style={{ width: W, height: H, position: 'relative', cursor: 'pointer' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-3 pointer-events-none"
        style={{ color: style.text }}
      >
        <div className="flex items-center gap-1 w-full justify-center">
          <span className="text-sm leading-none">{data.icon ?? style.icon}</span>
          <span className="font-hand font-bold text-sm leading-tight truncate text-center max-w-[130px]">
            {data.label}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[9px] opacity-50 font-hand leading-none">{data.nodeType}</span>
          {data.layer && data.layer !== 'root' && (
            <span
              className="text-[8px] px-1 rounded-full font-mono leading-none"
              style={{ background: style.border + '30', color: style.border }}
            >
              {data.layer}
            </span>
          )}
        </div>
      </div>

      {/* "hot" badge for highly-imported nodes */}
      {(data.importedByCount ?? 0) >= 3 && (
        <div
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm pointer-events-none"
          style={{ background: style.border }}
          title={`Imported by ${data.importedByCount} files`}
        >
          {data.importedByCount}
        </div>
      )}

      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2 !border-none !rounded-full" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-2 !h-2 !border-none !rounded-full" />
    </div>
  );
});

RoughNode.displayName = 'RoughNode';
