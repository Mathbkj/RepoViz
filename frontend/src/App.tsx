import { useEffect, useState, useCallback } from 'react';
import type { AnalyzeResponse, GraphNode } from '@repo-viz/shared';
import { Header } from './components/Header';
import { RepoInput } from './components/RepoInput';
import { DiagramCanvas } from './components/DiagramCanvas';
import { SidePanel } from './components/SidePanel';
import { SearchBar } from './components/SearchBar';

type AppState = 'idle' | 'loading' | 'done' | 'error';

export default function App() {
  const [state, setState] = useState<AppState>('idle');
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);

  // ── URL hash sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        const url = decodeURIComponent(hash);
        if (url.startsWith('https://github.com/')) handleAnalyze(url);
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Loading step animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'loading') { setLoadingStep(0); return; }
    const id = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
    }, 900);
    return () => clearInterval(id);
  }, [state]);

  const handleAnalyze = useCallback(async (repoUrl: string) => {
    setState('loading');
    setError('');
    setResult(null);
    setSelectedNode(null);
    setSearchQuery('');

    window.location.hash = encodeURIComponent(repoUrl);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: AnalyzeResponse = await res.json();
      setResult(data);
      setState('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
      window.location.hash = '';
    }
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-canvas">
      <Header />

      {/* ── Toolbar row ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex-1">
          <RepoInput onAnalyze={handleAnalyze} loading={state === 'loading'} />
        </div>

        {state === 'done' && result && (
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        )}
      </div>

      {/* ── Status strip ── */}
      {(state === 'done' || state === 'error') && (
        <div className={`px-4 py-1 text-xs border-b ${state === 'error' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
          {state === 'done' && result && (
            <>
              <span className="font-medium text-gray-600">{result.repoName}</span>
              {' · '}{result.filesScanned} files scanned
              {' · '}{result.graph.nodes.length} nodes · {result.graph.edges.length} edges
              {' · '}{result.durationMs}ms
              {result.layers.length > 0 && (
                <> · layers: {result.layers.join(', ')}</>
              )}
            </>
          )}
          {state === 'error' && <>⚠ {error}</>}
        </div>
      )}

      {/* ── Main canvas ── */}
      <div className="flex flex-1 overflow-hidden">
        {state === 'done' && result ? (
          <>
            <DiagramCanvas
              graph={result.graph}
              onNodeClick={setSelectedNode}
              selectedNodeId={selectedNode?.id ?? null}
              searchQuery={searchQuery}
            />
            {selectedNode && (
              <SidePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
            )}
          </>
        ) : (
          <EmptyState state={state} loadingStep={loadingStep} />
        )}
      </div>
    </div>
  );
}

function EmptyState({ state, loadingStep }: { state: AppState; loadingStep: number }) {
  if (state === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center flex-col gap-5">
        {/* animated diagram sketch */}
        <svg width="100" height="80" viewBox="0 0 100 80" className="animate-pulse">
          <rect x="6"  y="6"  width="28" height="20" rx="4" fill="#e0e7ff" stroke="#6366f1" strokeWidth="2"/>
          <rect x="60" y="6"  width="28" height="20" rx="4" fill="#dcfce7" stroke="#16a34a" strokeWidth="2"/>
          <rect x="33" y="48" width="28" height="20" rx="4" fill="#fef3c7" stroke="#d97706" strokeWidth="2"/>
          <path d="M20 26 Q20 58 47 58" stroke="#9ca3af" strokeWidth="1.5" fill="none" markerEnd="url(#arr)"/>
          <path d="M74 26 Q74 58 61 58" stroke="#9ca3af" strokeWidth="1.5" fill="none" markerEnd="url(#arr)"/>
          <defs>
            <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#9ca3af"/>
            </marker>
          </defs>
        </svg>

        <div className="text-center">
          <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"/>
          <p className="font-hand text-lg text-gray-600 transition-all">
            {LOADING_STEPS[loadingStep]}
          </p>
          <p className="text-xs text-gray-400 mt-1">Press Esc to cancel</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center flex-col gap-5 text-gray-300 select-none">
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none" className="opacity-40">
        <rect x="8"  y="8"  width="36" height="26" rx="5" stroke="#999" strokeWidth="2" strokeDasharray="5 3"/>
        <rect x="74" y="8"  width="36" height="26" rx="5" stroke="#999" strokeWidth="2" strokeDasharray="5 3"/>
        <rect x="41" y="56" width="36" height="26" rx="5" stroke="#999" strokeWidth="2" strokeDasharray="5 3"/>
        <path d="M44 34 Q44 56 59 56" stroke="#bbb" strokeWidth="1.5" strokeDasharray="4 3" fill="none"/>
        <path d="M74 34 Q76 56 77 56" stroke="#bbb" strokeWidth="1.5" strokeDasharray="4 3" fill="none"/>
      </svg>
      <div className="text-center">
        <p className="font-hand text-2xl text-gray-400">Visualize any GitHub repo</p>
        <p className="text-sm text-gray-300 mt-1">Paste a URL above and hit Analyze · or try an example below</p>
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {[
          'https://github.com/vitejs/vite',
          'https://github.com/expressjs/express',
          'https://github.com/vercel/next.js',
        ].map((ex) => (
          <button
            key={ex}
            onClick={() => {
              (document.querySelector('input[type="url"]') as HTMLInputElement | null)
                ?.dispatchEvent(new Event('input', { bubbles: true }));
              // Inject URL into input via native setter trick
              const input = document.querySelector('input[type="url"]') as HTMLInputElement | null;
              if (input) {
                const nativeInput = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
                nativeInput?.set?.call(input, ex);
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }}
            className="text-xs font-mono text-indigo-400 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100"
          >
            {ex.replace('https://github.com/', '')}
          </button>
        ))}
      </div>
    </div>
  );
}

const LOADING_STEPS = [
  'Downloading repository zip…',
  'Scanning source files…',
  'Parsing imports & dependencies…',
  'Classifying node types…',
  'Building architecture graph…',
];
