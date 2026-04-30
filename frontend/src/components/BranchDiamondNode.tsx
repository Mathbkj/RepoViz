import { memo, useEffect, useRef } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import rough from 'roughjs';

export type BranchNodeData = {
  name: string;
  color: string;
  isActive: boolean;
  isDefault: boolean;
  isProtected: boolean;
};

export type BranchDiamondNodeType = Node<BranchNodeData, 'branchnode'>;

export const BRANCH_W = 140;
export const BRANCH_H = 70;
const PAD = 6;

export const BranchDiamondNode = memo(({ data }: NodeProps<Node<BranchNodeData, 'branchnode'>>) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { name, color, isActive } = data;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = BRANCH_W * dpr;
    canvas.height = BRANCH_H * dpr;
    canvas.style.width = `${BRANCH_W}px`;
    canvas.style.height = `${BRANCH_H}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, BRANCH_W, BRANCH_H);

    const rc = rough.canvas(canvas);
    const cx = BRANCH_W / 2;
    const cy = BRANCH_H / 2;

    const pts: [number, number][] = [
      [cx, PAD],
      [BRANCH_W - PAD, cy],
      [cx, BRANCH_H - PAD],
      [PAD, cy],
    ];

    rc.polygon(pts, {
      fill: color,
      stroke: isActive ? '#ffffff' : color,
      strokeWidth: isActive ? 2.8 : 2.0,
      roughness: 1.3,
      fillStyle: isActive ? 'solid' : 'hachure',
      fillWeight: 1.5,
      hachureGap: 7,
      seed: name.charCodeAt(0) * 7 + name.length * 13,
    });
  }, [name, color, isActive]);

  const displayName = name.length > 14 ? `${name.slice(0, 12)}…` : name;

  return (
    <div style={{ width: BRANCH_W, height: BRANCH_H, position: 'relative', cursor: 'default' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5"
        style={{ color: isActive ? '#ffffff' : '#1e293b' }}
      >
        <span
          className="font-hand font-bold leading-tight text-center w-full truncate"
          style={{ fontSize: 11, paddingLeft: 20, paddingRight: 20, textAlign: 'center' }}
        >
          {displayName}
        </span>
        <div className="flex items-center gap-1">
          {data.isDefault && (
            <span style={{ fontSize: 9, opacity: 0.85, fontWeight: 700 }}>★</span>
          )}
          {data.isProtected && (
            <span style={{ fontSize: 9, opacity: 0.85 }}>🔒</span>
          )}
          {data.isActive && (
            <span style={{ fontSize: 9, opacity: 0.85, fontWeight: 600 }}>active</span>
          )}
        </div>
      </div>

      <Handle type="target" position={Position.Left}   className="!bg-slate-300 !w-1.5 !h-1.5 !border-none !rounded-full" />
      <Handle type="source" position={Position.Right}  className="!bg-slate-300 !w-1.5 !h-1.5 !border-none !rounded-full" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-1.5 !h-1.5 !border-none !rounded-full" />
    </div>
  );
});

BranchDiamondNode.displayName = 'BranchDiamondNode';
