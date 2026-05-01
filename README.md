<div align="center">

# 🗂️ Repo Viz

**A visual GitHub repository explorer with a hand-drawn aesthetic.**  
Browse your project structure, manage branches, edit files and push commits — all inside an interactive canvas.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**[→ Open the app](https://repoviz.onrender.com)**

</div>

---

## What is this?

Repo Viz lets you explore any GitHub repository as an interactive, hand-drawn canvas. Instead of navigating folders in a list, you see the entire project structure laid out as a diagram — branches as diamonds, files and folders as nodes connected by edges.

You can also edit files and push commits without ever leaving the browser.

## Features

- 🔐 **Sign in with GitHub** — OAuth, no passwords stored
- 🗺️ **Visual file tree** — hand-drawn canvas built with roughjs + React Flow; branches appear as diamonds at the first depth level
- 🌿 **Branch management** — create, switch and delete branches from the UI
- ✏️ **File editor** — open `.md`, `.js`, `.jsx`, `.ts` or `.tsx` files in a CodeMirror editor with syntax highlighting
- 📤 **Push to GitHub** — stage local changes, write a commit message and push
- 📊 **Git graph** — SVG commit graph showing branch divergence, merges and history
- 🔍 **File search** — instant search highlighting matching nodes on the canvas

---

## Contributing

Contributions are very welcome — bug fixes, new features, UI improvements, anything.

### 1. Fork & clone

```bash
git clone https://github.com/your-username/repo-viz.git
cd repo-viz
npm install
```

### 2. Set up environment variables

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in your own [GitHub OAuth App](https://github.com/settings/applications/new) credentials:

```
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
ALLOWED_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

When creating the OAuth App, set the callback URL to `http://localhost:3001/api/auth/github/callback`.

### 3. Run locally

```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3001 |

### 4. Open a Pull Request

- Branch off `main`: `git checkout -b fix/your-fix` or `git checkout -b feat/your-feature`
- Follow [Conventional Commits](https://www.conventionalcommits.org/) (`fix:`, `feat:`, `chore:`, etc.)
- Open a PR with a clear description of what changed and why

---

## Project structure

```
repo-visualizer/
├── shared/      # @repo-viz/shared — TypeScript types used by both sides
├── backend/     # Node.js + Express — GitHub API proxy + OAuth flow
└── frontend/    # React + Vite SPA — canvas, editor, graph
```

### Tech stack

**Frontend:** React 18 · TypeScript · Vite · TailwindCSS · React Flow · roughjs · dagre · CodeMirror · Lucide

**Backend:** Node.js · Express · @octokit/rest · dotenv

---

## License

[MIT](LICENSE)
