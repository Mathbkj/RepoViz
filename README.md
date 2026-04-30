<div align="center">

# 🗂️ Repo Viz

**A visual GitHub repository explorer with a hand-drawn aesthetic.**  
Browse your project structure, manage branches, edit files and push commits — all inside an interactive canvas.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **GitHub OAuth** | Sign in with your GitHub account — no passwords stored |
| 🗺️ **Visual File Tree** | Hand-drawn canvas built with roughjs + React Flow. Branches appear as diamonds at the first level; files and folders hang below |
| 🌿 **Branch Management** | Create, switch and delete branches directly from the UI |
| ✏️ **In-canvas Editor** | Open `.md`, `.js`, `.jsx`, `.ts` or `.tsx` files in a CodeMirror editor with syntax highlighting |
| 📤 **Push to GitHub** | Stage local changes, write a commit message and push — all without leaving the app |
| 📊 **Git Graph** | SVG-based commit graph showing branch divergence, merges and the full first-parent chain |
| 🔍 **File Search** | Instant search highlighting matching nodes on the canvas |

---

## 📸 Screenshots

> _Add screenshots or a GIF here once the app is deployed._

---

## 🏗️ Architecture

```
repo-visualizer/               ← npm workspaces monorepo
├── shared/                    ← @repo-viz/shared — TypeScript types (shared between frontend & backend)
│   └── src/index.ts
├── backend/                   ← Node.js + Express API
│   └── src/
│       ├── index.ts           ← App entry, CORS, static serving in prod
│       ├── routes/
│       │   ├── authRoutes.ts  ← GitHub OAuth flow
│       │   └── repoRoutes.ts  ← REST endpoints for repo operations
│       └── services/
│           └── githubService.ts  ← Octokit wrapper
└── frontend/                  ← React + Vite SPA
    └── src/
        ├── App.tsx            ← Root state & orchestration
        ├── hooks/
        │   ├── useAuth.ts     ← Token storage + user session
        │   └── useRepo.ts     ← API calls + pending-file state
        ├── components/
        │   ├── FileTreeCanvas.tsx     ← React Flow canvas
        │   ├── BranchDiamondNode.tsx  ← roughjs diamond node for branches
        │   ├── FileRoughNode.tsx      ← roughjs rectangle node for files/dirs
        │   ├── GitGraphView.tsx       ← SVG commit graph
        │   ├── GitBar.tsx             ← Toolbar (branch selector, push/pull)
        │   ├── BranchPanel.tsx        ← Branch create / delete panel
        │   ├── FileEditorPanel.tsx    ← CodeMirror editor panel
        │   ├── CreateFileModal.tsx    ← New file dialog
        │   ├── LoginPage.tsx          ← Landing / sign-in screen
        │   └── RepoSelector.tsx       ← Repo picker
        └── utils/
            ├── treeLayout.ts   ← Dagre-based layout (branches + file tree)
            └── gitLanes.ts     ← Git lane-assignment algorithm for the graph
```

### Data flow

```
GitHub API ──► GitHubService (backend) ──► REST API ──► useRepo hook ──► React state ──► Canvas / Editor
     ▲                                                                                         │
     └──────────────────────────── pushFile / createBranch / deleteBranch ───────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+**
- A **GitHub OAuth App** (see [OAuth Setup](#github-oauth-app-setup) below)

### 1 — Clone & install

```bash
git clone https://github.com/your-username/repo-viz.git
cd repo-viz
npm install
```

### 2 — Environment variables

Create `backend/.env` (copy from the example):

```bash
cp backend/.env.example backend/.env
```

Then fill in the values:

```env
# GitHub OAuth App credentials (see setup guide below)
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here

# URLs
ALLOWED_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

Optionally, create `frontend/.env.local` if your backend runs on a different port:

```env
VITE_API_URL=http://localhost:3001
```

### 3 — Run in development mode

```bash
npm run dev
```

This starts both servers concurrently:

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express) | http://localhost:3001 |

---

## 🔑 GitHub OAuth App Setup

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:
   - **Application name**: `Repo Viz` (or any name)
   - **Homepage URL**: `http://localhost:5173` (or your production URL)
   - **Authorization callback URL**: `http://localhost:3001/api/auth/github/callback`
3. Click **Register application**
4. Copy the **Client ID** and generate a **Client Secret**
5. Paste both into `backend/.env`

> ⚠️ For production, update the callback URL to your deployed backend URL.

---

## 📦 Tech Stack

### Frontend

| Package | Purpose |
|---|---|
| [React 18](https://react.dev/) | UI framework |
| [TypeScript 5](https://www.typescriptlang.org/) | Type safety |
| [Vite 5](https://vitejs.dev/) | Build tool & dev server |
| [TailwindCSS 3](https://tailwindcss.com/) | Utility-first styling |
| [@xyflow/react 12](https://reactflow.dev/) | Interactive node-graph canvas |
| [roughjs 4](https://roughjs.com/) | Hand-drawn SVG/canvas rendering |
| [dagre](https://github.com/dagrejs/dagre) | Directed-graph layout algorithm |
| [@uiw/react-codemirror](https://uiwjs.github.io/react-codemirror/) | Code editor |
| [lucide-react](https://lucide.dev/) | Icon set |

### Backend

| Package | Purpose |
|---|---|
| [Express 4](https://expressjs.com/) | HTTP server |
| [@octokit/rest 22](https://github.com/octokit/rest.js) | GitHub REST API client |
| [dotenv](https://github.com/motdotla/dotenv) | Environment variable loading |
| [cors](https://github.com/expressjs/cors) | Cross-origin resource sharing |
| [axios](https://axios-http.com/) | HTTP client for OAuth token exchange |

---

## 🌐 API Reference

Base URL: `/api`

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/auth/github` | Redirects the user to GitHub to authorize |
| `GET` | `/auth/github/callback` | OAuth callback — exchanges code for token and redirects to frontend |

### Repository

All endpoints require `Authorization: Bearer <github_token>`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/repo/me` | Authenticated user info |
| `GET` | `/repo/list` | List authenticated user's repos |
| `GET` | `/repo/tree?owner&repo&branch` | Recursive file tree (up to 600 nodes) |
| `GET` | `/repo/file?owner&repo&path&branch` | File content (decoded UTF-8) |
| `PUT` | `/repo/file` | Create or update a file (commit) |
| `DELETE` | `/repo/file` | Delete a file (commit) |
| `GET` | `/repo/branches?owner&repo` | List branches |
| `POST` | `/repo/branches` | Create a new branch |
| `DELETE` | `/repo/branches/:branch` | Delete a branch |
| `GET` | `/repo/git-graph?owner&repo` | Commit history + branch colors for graph view |

---

## ☁️ Deployment

The project ships with configuration files for the most common free-tier platforms.

### Frontend → Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

1. Connect your GitHub repo on Netlify
2. Netlify auto-detects `netlify.toml` — no manual settings needed
3. Add an environment variable: `VITE_API_URL=https://your-backend.onrender.com`

### Backend → Render

1. Create a **Web Service** pointing to your repo on [render.com](https://render.com)
2. Render detects `render.yaml` automatically
3. Set the following environment variables in the Render dashboard:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `ALLOWED_ORIGIN` → your Netlify URL (e.g. `https://repo-viz.netlify.app`)
   - `FRONTEND_URL` → same Netlify URL

### Backend → Railway (Docker)

1. Create a new project from your repo on [railway.app](https://railway.app)
2. Railway detects `railway.toml` and the `Dockerfile`
3. Add the same environment variables as above

> **Production OAuth callback URL**: update your GitHub OAuth App's callback URL to `https://your-backend.onrender.com/api/auth/github/callback`.

---

## 🛠️ Development Scripts

Run from the **monorepo root**:

```bash
npm run dev           # Start frontend + backend concurrently (watches for changes)
npm run build         # Build shared → frontend → backend
npm run build:backend # Build shared + backend only
npm run start         # Run the production build (backend serves the frontend)
```

Run inside a specific workspace:

```bash
npm run dev --workspace=frontend
npm run dev --workspace=backend
npm run build --workspace=shared
```

---

## 📁 Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_CLIENT_ID` | ✅ | — | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | — | GitHub OAuth App client secret |
| `ALLOWED_ORIGIN` | ✅ | `http://localhost:5173` | Comma-separated list of allowed CORS origins |
| `FRONTEND_URL` | ✅ | `http://localhost:5173` | URL to redirect back to after OAuth |
| `PORT` | ❌ | `3001` | Port the Express server listens on |
| `NODE_ENV` | ❌ | `development` | Set to `production` to enable static file serving |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | ❌ | `http://localhost:3001` | Backend base URL |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m "feat: add your feature"`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
Made with ☕ and roughjs
</div>
