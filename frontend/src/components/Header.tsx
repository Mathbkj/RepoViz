export function Header() {
  return (
    <header className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" fill="#6366f1" stroke="#312e81" strokeWidth="1.5" />
        <rect x="18" y="2" width="12" height="12" rx="2" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
        <rect x="10" y="18" width="12" height="12" rx="2" fill="#10b981" stroke="#064e3b" strokeWidth="1.5" />
        <line x1="8" y1="14" x2="16" y2="18" stroke="#555" strokeWidth="1.5" />
        <line x1="24" y1="14" x2="16" y2="18" stroke="#555" strokeWidth="1.5" />
      </svg>
      <div>
        <h1 className="font-bold text-lg leading-none tracking-tight text-gray-900">RepoViz</h1>
        <p className="text-xs text-gray-400 leading-none mt-0.5">GitHub Architecture Visualizer</p>
      </div>
    </header>
  );
}
