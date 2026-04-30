import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative flex items-center">
      <Search size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search nodes…"
        className="pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-300 w-48 bg-gray-50 transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 text-gray-300 hover:text-gray-500"
          aria-label="Clear search"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
