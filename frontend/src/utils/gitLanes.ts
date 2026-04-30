import type { GitCommit } from '@repo-viz/shared';

export interface LaneCommit extends GitCommit {
  lane: number;        // horizontal column index
  color: string;       // color of the lane this commit lives in
}

export interface LaneEdge {
  fromSha: string;
  toSha: string;
  fromLane: number;
  toLane: number;
  color: string;
  isMerge: boolean;    // true if this is a merge edge (not the primary parent)
}

const FALLBACK = '#94a3b8';

/**
 * Assigns a horizontal lane to each commit using a classic git-graph algorithm.
 * Returns commits with lane info + edges to draw.
 */
export function computeLanes(
  commits: GitCommit[],
  branchColors: Record<string, string>,
  defaultBranch: string,
): { laneCommits: LaneCommit[]; edges: LaneEdge[] } {
  if (commits.length === 0) return { laneCommits: [], edges: [] };

  // sha → index in commits array (for fast lookup)
  const shaIdx = new Map<string, number>(commits.map((c: GitCommit, i: number) => [c.sha, i]));

  // Build: for each sha, which branch "owns" it (for coloring)
  // Priority: branch that first introduced the commit = default branch > others
  const shaColor = new Map<string, string>();

  // Walk from each branch tip following first-parent chain to assign colors
  // Process default branch first so it gets priority
  const branchOrder = Object.keys(branchColors).sort((a) => (a === defaultBranch ? -1 : 1));

  for (const branch of branchOrder) {
    const color = branchColors[branch];
    // Find HEAD commit of this branch
    const head = commits.find((c) => c.branches.includes(branch));
    if (!head) continue;
    // Walk first-parent chain
    let sha: string | undefined = head.sha;
    while (sha && shaIdx.has(sha)) {
      if (!shaColor.has(sha)) shaColor.set(sha, color);
      const c: GitCommit = commits[shaIdx.get(sha)!];
      sha = c.parents[0];
    }
  }

  // Fallback: uncolored commits get the fallback color
  for (const c of commits) {
    if (!shaColor.has(c.sha)) shaColor.set(c.sha, FALLBACK);
  }

  // ── Lane assignment ───────────────────────────────────────────────────────
  // lanes[i] = sha that "owns" lane i right now (the commit we expect next in that lane)
  const lanes: (string | null)[] = [];
  const laneOf = new Map<string, number>();

  for (const commit of commits) {
    const { sha, parents } = commit;

    // Is this sha already reserved in some lane?
    let lane = lanes.indexOf(sha);

    if (lane === -1) {
      // Not reserved — take first free lane or open a new one
      lane = lanes.indexOf(null);
      if (lane === -1) lane = lanes.length;
    }

    // Ensure the array is wide enough
    while (lanes.length <= lane) lanes.push(null);

    laneOf.set(sha, lane);

    // Primary parent inherits this lane
    lanes[lane] = parents[0] ?? null;

    // Secondary parents (merge commits): reserve a lane for them if not already
    for (let pi = 1; pi < parents.length; pi++) {
      const pSha = parents[pi];
      if (laneOf.has(pSha) || lanes.includes(pSha)) continue;
      // Reserve in next free lane
      let freeLane = lanes.indexOf(null);
      if (freeLane === -1) freeLane = lanes.length;
      while (lanes.length <= freeLane) lanes.push(null);
      lanes[freeLane] = pSha;
    }
  }

  // ── Build laneCommits ─────────────────────────────────────────────────────
  const laneCommits: LaneCommit[] = commits.map((c) => ({
    ...c,
    lane: laneOf.get(c.sha) ?? 0,
    color: shaColor.get(c.sha) ?? FALLBACK,
  }));

  // ── Build edges ───────────────────────────────────────────────────────────
  const edges: LaneEdge[] = [];
  for (const lc of laneCommits) {
    lc.parents.forEach((pSha, pi) => {
      if (!shaIdx.has(pSha)) return; // parent outside our window
      const parentLane = laneOf.get(pSha) ?? 0;
      edges.push({
        fromSha: lc.sha,
        toSha: pSha,
        fromLane: lc.lane,
        toLane: parentLane,
        color: pi === 0 ? lc.color : (shaColor.get(pSha) ?? FALLBACK),
        isMerge: pi > 0,
      });
    });
  }

  return { laneCommits, edges };
}
