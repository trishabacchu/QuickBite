import { Minus, Plus } from 'lucide-react';

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  disabled = false,
  label = 'Quantity',
  size = 'md',
}) {
  const buttonSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const valueSize = size === 'sm' ? 'min-w-6 text-xs' : 'min-w-8 text-sm';

  return (
    <div
      className="inline-flex items-center rounded-full border border-black/10 bg-white p-1"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
        className={`flex ${buttonSize} items-center justify-center rounded-full text-ink-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-30`}
      >
        <Minus size={size === 'sm' ? 13 : 15} />
      </button>
      <span className={`${valueSize} text-center font-extrabold tabular-nums`} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        className={`flex ${buttonSize} items-center justify-center rounded-full text-ink-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-30`}
      >
        <Plus size={size === 'sm' ? 13 : 15} />
      </button>
    </div>
  );
}
