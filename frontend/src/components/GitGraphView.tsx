import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GitGraphResponse, GitCommit } from '@repo-viz/shared';
import { computeLanes, type LaneCommit } from '../utils/gitLanes';
import { Loader2, GitMerge, GitCommit as GitCommitIcon, AlertCircle } from 'lucide-react';

// ── Layout constants ─────────────────────────────────────────────────────────
const ROW_H    = 48;   // vertical spacing between commits
const LANE_W   = 22;   // horizontal spacing between lanes
const DOT_R    = 6;    // commit dot radius
const PAD_LEFT = 20;   // left padding before the graph
const PAD_TOP  = 28;   // top padding

interface Props {
  owner?: string;
  repo?: string;
  currentBranch: string;
  graphData: GitGraphResponse | null;
  loading: boolean;
  error: string;
  onSwitchBranch: (branch: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  if (weeks < 5)  return `${weeks}w ago`;
  return `${months}mo ago`;
}

function cx(lane: number) { return PAD_LEFT + lane * LANE_W + LANE_W / 2; }
function cy(idx: number)  { return PAD_TOP  + idx  * ROW_H  + ROW_H / 2; }

// Compute cubic bezier path between two points (for edges)
function edgePath(
  x1: number, y1: number,
  x2: number, y2: number,
): string {
  if (x1 === x2) return `M${x1},${y1} L${x2},${y2}`;
  // Curved path: leave vertically, curve to the target lane
  const dy = Math.abs(y2 - y1);
  const cp = Math.min(dy * 0.5, 24);
  return `M${x1},${y1} C${x1},${y1 + cp} ${x2},${y2 - cp} ${x2},${y2}`;
}

// ── Main component ───────────────────────────────────────────────────────────

export function GitGraphView({ currentBranch, graphData, loading, error, onSwitchBranch }: Props) {
  const [selected, setSelected] = useState<GitCommit | null>(null);
  const [tooltip, setTooltip]   = useState<{ x: number; y: number; commit: LaneCommit } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { laneCommits, edges, maxLane, svgWidth, svgHeight } = useMemo(() => {
    if (!graphData) return { laneCommits: [], edges: [], maxLane: 0, svgWidth: 300, svgHeight: 300 };

    const { laneCommits, edges } = computeLanes(
      graphData.commits,
      graphData.branchColors,
      graphData.defaultBranch,
    );

    const maxLane = laneCommits.reduce((m, c) => Math.max(m, c.lane), 0);
    const svgWidth  = PAD_LEFT + (maxLane + 1) * LANE_W + 10;
    const svgHeight = PAD_TOP  + laneCommits.length * ROW_H + PAD_TOP;

    return { laneCommits, edges, maxLane, svgWidth, svgHeight };
  }, [graphData]);

  // Close tooltip on outside click
  useEffect(() => {
    const handler = () => setTooltip(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  const handleDotClick = useCallback((e: React.MouseEvent, lc: LaneCommit) => {
    e.stopPropagation();
    setSelected((prev) => prev?.sha === lc.sha ? null : lc);
    setTooltip(null);
  }, []);

  const handleDotHover = useCallback((e: React.MouseEvent, lc: LaneCommit) => {
    const rect = (e.target as SVGCircleElement).getBoundingClientRect();
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    setTooltip({
      x: rect.left - container.left + 16,
      y: rect.top  - container.top,
      commit: lc,
    });
  }, []);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400">
      <Loader2 size={22} className="animate-spin" />
      <p className="text-sm">Loading commit history…</p>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex items-center gap-2 text-red-500 bg-red-50 border border-red-200 rounded-xl p-4">
        <AlertCircle size={16} />
        <span className="text-sm">{error}</span>
      </div>
    </div>
  );

  if (!graphData) return null;

  const selectedLc = selected ? laneCommits.find((c) => c.sha === selected.sha) : null;

  return (
    <div className="flex flex-1 overflow-hidden" ref={containerRef}>
      {/* ── Graph + list ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* SVG graph column */}
        <div className="overflow-y-auto overflow-x-hidden border-r border-gray-100 flex-shrink-0 bg-[#fafaf8]"
             style={{ width: svgWidth + 4 }}>
          <svg
            width={svgWidth}
            height={svgHeight}
            style={{ display: 'block', minHeight: '100%' }}
          >
            {/* ── Lane guide lines ── */}
            {Array.from({ length: maxLane + 1 }, (_, lane) => (
              <line
                key={`guide-${lane}`}
                x1={cx(lane)} y1={PAD_TOP}
                x2={cx(lane)} y2={svgHeight - PAD_TOP}
                stroke="#e2e8f0"
                strokeWidth={1}
                strokeDasharray="3 5"
              />
            ))}

            {/* ── Edges ── */}
            {edges.map((edge, i) => {
              const fromIdx = laneCommits.findIndex((c) => c.sha === edge.fromSha);
              const toIdx   = laneCommits.findIndex((c) => c.sha === edge.toSha);
              if (fromIdx === -1 || toIdx === -1) return null;
              const x1 = cx(edge.fromLane), y1 = cy(fromIdx);
              const x2 = cx(edge.toLane),   y2 = cy(toIdx);
              const isSelected = selected?.sha === edge.fromSha || selected?.sha === edge.toSha;
              return (
                <path
                  key={`edge-${i}`}
                  d={edgePath(x1, y1, x2, y2)}
                  stroke={edge.color}
                  strokeWidth={isSelected ? 2.5 : 1.8}
                  strokeDasharray={edge.isMerge ? '4 3' : undefined}
                  fill="none"
                  opacity={selected && !isSelected ? 0.2 : 0.85}
                />
              );
            })}

            {/* ── Commit dots ── */}
            {laneCommits.map((lc, idx) => {
              const x = cx(lc.lane);
              const y = cy(idx);
              const isSelected = selected?.sha === lc.sha;
              const isMerge = lc.parents.length > 1;
              return (
                <g
                  key={lc.sha}
                  onClick={(e) => handleDotClick(e, lc)}
                  onMouseEnter={(e) => handleDotHover(e, lc)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Selection halo */}
                  {isSelected && (
                    <circle cx={x} cy={y} r={DOT_R + 5}
                      fill={lc.color} opacity={0.2} />
                  )}
                  {/* Outer ring */}
                  <circle cx={x} cy={y} r={DOT_R + 1.5}
                    fill="#fafaf8" stroke={lc.color} strokeWidth={1.5} />
                  {/* Inner dot */}
                  <circle cx={x} cy={y} r={isMerge ? DOT_R - 1 : DOT_R - 2}
                    fill={isSelected ? lc.color : (isMerge ? lc.color : '#fff')}
                    stroke={lc.color} strokeWidth={1.5}
                  />
                  {/* Merge icon center */}
                  {isMerge && (
                    <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize={6} fill="#fff" fontWeight="bold">M</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── Commit list column ── */}
        <div className="flex-1 overflow-y-auto">
          {laneCommits.map((lc) => {
            const isSelected = selected?.sha === lc.sha;
            return (
              <div
                key={lc.sha}
                onClick={() => setSelected((prev) => prev?.sha === lc.sha ? null : lc)}
                className={`flex items-center gap-3 px-4 border-b border-gray-50 cursor-pointer transition-colors
                  ${isSelected ? 'bg-indigo-50/70' : 'hover:bg-gray-50/80'}`}
                style={{ height: ROW_H }}
              >
                {/* Branch labels */}
                <div className="flex gap-1 flex-shrink-0 min-w-0" style={{ minWidth: 0, maxWidth: 180 }}>
                  {lc.branches.map((b) => (
                    <button
                      key={b}
                      onClick={(e) => { e.stopPropagation(); onSwitchBranch(b); }}
                      className="flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 hover:opacity-80 transition-opacity"
                      style={{
                        background: (graphData.branchColors[b] ?? '#6366f1') + '18',
                        borderColor: (graphData.branchColors[b] ?? '#6366f1') + '60',
                        color: graphData.branchColors[b] ?? '#6366f1',
                        maxWidth: 100,
                      }}
                      title={`Switch to ${b}`}
                    >
                      <span className="truncate">{b}</span>
                      {b === currentBranch && <span className="ml-0.5">✓</span>}
                    </button>
                  ))}
                </div>

                {/* Commit icon */}
                <div className="flex-shrink-0" style={{ color: lc.color }}>
                  {lc.parents.length > 1
                    ? <GitMerge size={13} />
                    : <GitCommitIcon size={13} />
                  }
                </div>

                {/* SHA */}
                <code
                  className="text-[10px] font-mono flex-shrink-0 px-1 py-0.5 rounded"
                  style={{ background: lc.color + '18', color: lc.color }}
                >
                  {lc.shortSha}
                </code>

                {/* Message */}
                <span className="text-xs text-gray-700 truncate flex-1 min-w-0">
                  {lc.message}
                </span>

                {/* Author + date */}
                <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-gray-400">
                  <span className="truncate max-w-[80px] hidden sm:block">{lc.author}</span>
                  <span className="whitespace-nowrap">{relativeDate(lc.date)}</span>
                </div>
              </div>
            );
          })}

          {graphData.truncated && (
            <div className="text-center py-4 text-xs text-gray-300">
              Showing last {laneCommits.length} commits per branch
            </div>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selectedLc && (
        <CommitDetail
          lc={selectedLc}
          branchColors={graphData.branchColors}
          currentBranch={currentBranch}
          allBranches={laneCommits.flatMap((c) => c.branches)}
          onSwitchBranch={onSwitchBranch}
          onClose={() => setSelected(null)}
        />
      )}

      {/* ── Hover tooltip ── */}
      {tooltip && !selected && (
        <div
          className="absolute z-40 bg-gray-900 text-white text-[10px] font-mono px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.commit.shortSha} · {tooltip.commit.author}
        </div>
      )}
    </div>
  );
}

// ── Commit detail side panel ─────────────────────────────────────────────────

function CommitDetail({
  lc, branchColors, currentBranch, onSwitchBranch, onClose,
}: {
  lc: LaneCommit;
  branchColors: Record<string, string>;
  currentBranch: string;
  allBranches: string[];
  onSwitchBranch: (b: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="w-72 border-l border-gray-200 bg-white flex flex-col overflow-y-auto flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100"
           style={{ borderLeftColor: lc.color, borderLeftWidth: 3 }}>
        <div className="flex items-center gap-2">
          {lc.parents.length > 1
            ? <GitMerge size={14} style={{ color: lc.color }} />
            : <GitCommitIcon size={14} style={{ color: lc.color }} />
          }
          <code className="text-xs font-mono font-bold" style={{ color: lc.color }}>
            {lc.shortSha}
          </code>
        </div>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Message */}
        <p className="text-sm font-medium text-gray-800 leading-snug">{lc.message}</p>

        {/* Metadata */}
        <div className="flex flex-col gap-1.5 text-xs text-gray-500">
          <div className="flex gap-2">
            <span className="text-gray-400 w-16 flex-shrink-0">Author</span>
            <span className="text-gray-700">{lc.author}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-16 flex-shrink-0">Email</span>
            <span className="text-gray-600 font-mono truncate">{lc.authorEmail}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-16 flex-shrink-0">Date</span>
            <span className="text-gray-700">
              {new Date(lc.date).toLocaleString()}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-16 flex-shrink-0">SHA</span>
            <code className="text-gray-600 font-mono text-[10px] break-all">{lc.sha}</code>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-16 flex-shrink-0">Parents</span>
            <div className="flex flex-col gap-0.5">
              {lc.parents.length === 0 && <span className="text-gray-400 italic">Initial commit</span>}
              {lc.parents.map((p) => (
                <code key={p} className="text-gray-600 font-mono text-[10px]">{p.slice(0, 7)}</code>
              ))}
            </div>
          </div>
        </div>

        {/* Branch labels */}
        {lc.branches.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Branches</p>
            <div className="flex flex-wrap gap-1.5">
              {lc.branches.map((b) => (
                <button
                  key={b}
                  onClick={() => onSwitchBranch(b)}
                  className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border hover:opacity-80 transition-opacity"
                  style={{
                    background: (branchColors[b] ?? '#6366f1') + '18',
                    borderColor: (branchColors[b] ?? '#6366f1') + '60',
                    color: branchColors[b] ?? '#6366f1',
                  }}
                >
                  {b}
                  {b === currentBranch && ' ✓'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Merge info */}
        {lc.parents.length > 1 && (
          <div className="flex items-center gap-2 text-xs bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-indigo-600">
            <GitMerge size={12} />
            Merge commit — {lc.parents.length} parents
          </div>
        )}
      </div>
    </div>
  );
}
