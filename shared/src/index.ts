// ─── Auth ──────────────────────────────────────────────────────────────────────

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

// ─── File Tree ─────────────────────────────────────────────────────────────────

export type FileType = 'file' | 'dir';

export interface TreeNode {
  type: FileType;
  path: string;      // full path from repo root, e.g. "src/components/Button.tsx"
  name: string;      // just the filename/dirname
  sha: string;
  size?: number;     // bytes, only for files
}

export interface RepoTreeResponse {
  owner: string;
  repo: string;
  branch: string;
  nodes: TreeNode[];
  truncated: boolean;
}

// ─── File Content ──────────────────────────────────────────────────────────────

export interface FileContentResponse {
  path: string;
  content: string;   // decoded text content
  sha: string;       // needed for update operations
  encoding: string;
}

// ─── Push ──────────────────────────────────────────────────────────────────────

export interface PushFileRequest {
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  sha?: string;      // required when updating an existing file
  branch?: string;
}

export interface PushFileResponse {
  path: string;
  sha: string;       // new blob sha
  commitSha: string;
  htmlUrl: string;
}

// ─── Delete ────────────────────────────────────────────────────────────────────

export interface DeleteFileRequest {
  owner: string;
  repo: string;
  path: string;
  sha: string;
  message: string;
  branch?: string;
}

// ─── Branches ─────────────────────────────────────────────────────────────────

export interface BranchInfo {
  name: string;
  sha: string;          // HEAD commit SHA
  protected: boolean;
  isDefault: boolean;
}

export interface CreateBranchRequest {
  owner: string;
  repo: string;
  name: string;         // new branch name
  fromBranch: string;   // base branch to fork from
}

// ─── Git Graph ────────────────────────────────────────────────────────────────

export interface GitCommit {
  sha: string;
  shortSha: string;          // first 7 chars
  message: string;           // first line only
  author: string;
  authorEmail: string;
  date: string;              // ISO 8601
  parents: string[];         // parent SHAs (first = main parent)
  branches: string[];        // branch names whose HEAD == this SHA
}

export interface GitGraphResponse {
  commits: GitCommit[];      // sorted newest → oldest
  branchColors: Record<string, string>;   // branch name → hex color
  defaultBranch: string;
  truncated: boolean;
}

// ─── User Repos ───────────────────────────────────────────────────────────────

export interface RepoInfo {
  full_name: string;   // "owner/repo"
  name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  updated_at: string;
  language: string | null;
}

// ─── API Error ─────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}
