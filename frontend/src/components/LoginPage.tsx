import { Github, GitBranch } from 'lucide-react';

interface Props {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafaf8] gap-8 px-4">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
          <GitBranch size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 font-hand">repo-viz</h1>
        <p className="text-gray-400 text-center max-w-sm">
          Visualize and edit your GitHub repository structure as an interactive diagram
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl w-full">
        {[
          { icon: '🗂️', title: 'Visual File Tree', desc: 'See your project structure as an interactive diagram' },
          { icon: '✏️', title: 'Edit & Create', desc: 'Create .md, .ts, .js files directly in the diagram' },
          { icon: '🚀', title: 'Push & Pull', desc: 'Commit changes back to GitHub without leaving the app' },
        ].map((f) => (
          <div key={f.title} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="text-2xl mb-2">{f.icon}</div>
            <h3 className="font-semibold text-gray-700 text-sm">{f.title}</h3>
            <p className="text-xs text-gray-400 mt-1">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Login button */}
      <button
        onClick={onLogin}
        className="flex items-center gap-3 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-medium text-sm shadow-lg transition-colors"
      >
        <Github size={20} />
        Sign in with GitHub
      </button>

      <p className="text-xs text-gray-300">
        Requires <code className="bg-gray-100 px-1 rounded text-gray-500">repo</code> scope to read/write files
      </p>
    </div>
  );
}
