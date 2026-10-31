import { Sparkles } from 'lucide-react';

export function CategoryChips({ categories = [], active = '', onSelect }) {
  if (categories.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={() => onSelect('')}
        aria-pressed={!active}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition ${
          !active
            ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-200'
            : 'border-black/10 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700'
        }`}
      >
        <Sparkles size={14} /> All cravings
      </button>
      {categories.map((category) => {
        const selected = active.toLowerCase() === category.toLowerCase();
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            aria-pressed={selected}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
              selected
                ? 'border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-200'
                : 'border-black/10 bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700'
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
