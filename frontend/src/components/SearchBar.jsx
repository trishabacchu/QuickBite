import { Search, X } from 'lucide-react';

export function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = 'Search restaurants, dishes, or cuisines…',
  autoFocus = false,
  size = 'lg',
}) {
  const large = size === 'lg';
  const inputId = 'quickbite-search';

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit?.(value.trim());
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={`flex w-full items-center gap-2 rounded-full border border-black/10 bg-white shadow-[var(--shadow-soft)] ${
        large ? 'p-2 pl-5' : 'p-1.5 pl-4'
      }`}
    >
      <label htmlFor={inputId} className="sr-only">
        Search restaurants, dishes, or cuisines
      </label>
      <Search size={large ? 19 : 17} className="shrink-0 text-ink-500" aria-hidden="true" />
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        className={`min-w-0 flex-1 bg-transparent font-semibold text-ink-950 placeholder:font-medium placeholder:text-ink-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden ${
          large ? 'py-2 text-sm sm:text-base' : 'py-1.5 text-sm'
        }`}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            onClear?.();
          }}
          aria-label="Clear search"
          className="rounded-full p-2 text-ink-500 transition hover:bg-stone-100 hover:text-ink-950"
        >
          <X size={16} />
        </button>
      ) : null}
      <button
        type="submit"
        className={`btn-primary shrink-0 ${large ? '!px-5 !py-2.5' : '!px-4 !py-2'}`}
      >
        {large ? 'Search' : <Search size={15} />}
      </button>
    </form>
  );
}
