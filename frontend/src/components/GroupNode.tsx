import { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';

export type GroupNodeData = {
  label: string;
  color: string;
};

export type GroupNodeType = Node<GroupNodeData, 'group'>;

export const GroupNode = memo(({ data }: NodeProps<GroupNodeType>) => {
  return (
    <div
      className="w-full h-full rounded-xl border-2 border-dashed flex items-start justify-start p-2 pointer-events-none"
      style={{ borderColor: data.color, background: `${data.color}10` }}
    >
      <span
        className="font-hand font-semibold text-xs uppercase tracking-wider px-2 py-0.5 rounded-full"
        style={{ color: data.color, background: `${data.color}20` }}
      >
        {data.label}
      </span>
    </div>
  );
});

GroupNode.displayName = 'GroupNode';
