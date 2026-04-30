import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';

export type SwimlaneNodeData = {
  label: string;
  color: string;
  bg: string;
};

export type SwimlaneNodeType = Node<SwimlaneNodeData, 'swimlane'>;

export const SwimlaneNode = memo(({ data, width, height }: NodeProps<SwimlaneNodeType>) => {
  return (
    <div
      className="rounded-2xl border-2 border-dashed relative pointer-events-none select-none"
      style={{
        borderColor: data.color,
        background: data.bg + 'cc',
        width:  width  ?? '100%',
        height: height ?? '100%',
      }}
    >
      <span
        className="absolute top-2 left-3 text-xs font-hand font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
        style={{ color: data.color, background: data.color + '20' }}
      >
        {data.label}
      </span>
    </div>
  );
});

SwimlaneNode.displayName = 'SwimlaneNode';
