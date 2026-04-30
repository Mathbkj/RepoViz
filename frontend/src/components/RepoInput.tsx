import { useState, type FormEvent } from 'react';

interface Props {
  onAnalyze: (url: string) => void;
  loading: boolean;
}

const EXAMPLES = [
  'https://github.com/vitejs/vite',
  'https://github.com/expressjs/express',
  'https://github.com/facebook/react',
];

export function RepoInput({ onAnalyze, loading }: Props) {
  const [url, setUrl] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed) onAnalyze(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl gap-2">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://github.com/owner/repo"
        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-400 transition-colors"
        disabled={loading}
        list="example-repos"
      />
      <datalist id="example-repos">
        {EXAMPLES.map((ex) => <option key={ex} value={ex} />)}
      </datalist>
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {loading ? 'Analyzing…' : 'Analyze'}
      </button>
    </form>
  );
}
