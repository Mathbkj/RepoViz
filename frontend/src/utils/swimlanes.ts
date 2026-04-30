import type { Node } from '@xyflow/react';
import { getLayerColor } from './layerColors';

const PAD_X = 32;
const PAD_Y = 48; // extra top padding for label

export interface SwimlanePanelData extends Record<string, unknown> {
  label: string;
  color: string;
  bg: string;
}

/**
 * Given a list of laid-out nodes, compute bounding-box "swimlane" background
 * nodes — one per unique layer. Returns them sorted to render below content nodes.
 */
export function buildSwimlanePanels(
  nodes: Node[],
  layerOf: (id: string) => string | undefined
): Node<SwimlanePanelData>[] {
  const groups = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();

  for (const n of nodes) {
    const layer = layerOf(n.id);
    if (!layer || layer === 'root') continue;

    const x = n.position.x;
    const y = n.position.y;
    const w = (n.width as number | undefined) ?? 180;
    const h = (n.height as number | undefined) ?? 64;

    const cur = groups.get(layer);
    if (!cur) {
      groups.set(layer, { minX: x, minY: y, maxX: x + w, maxY: y + h });
    } else {
      cur.minX = Math.min(cur.minX, x);
      cur.minY = Math.min(cur.minY, y);
      cur.maxX = Math.max(cur.maxX, x + w);
      cur.maxY = Math.max(cur.maxY, y + h);
    }
  }

  const panels: Node<SwimlanePanelData>[] = [];
  for (const [layer, box] of groups) {
    const style = getLayerColor(layer);
    panels.push({
      id: `__swimlane__${layer}`,
      type: 'swimlane',
      position: {
        x: box.minX - PAD_X,
        y: box.minY - PAD_Y,
      },
      data: {
        label: style.label || layer,
        color: style.border,
        bg: style.bg,
      },
      style: {
        width:  box.maxX - box.minX + PAD_X * 2,
        height: box.maxY - box.minY + PAD_Y + PAD_X,
        zIndex: -10,
        pointerEvents: 'none' as const,
      },
      selectable: false,
      draggable: false,
      connectable: false,
      zIndex: -10,
    });
  }
  return panels;
}
