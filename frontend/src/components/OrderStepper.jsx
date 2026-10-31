import { Check } from 'lucide-react';
import { STATUS_META } from '../utils/format.js';

const steps = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

const shortLabels = {
  PENDING: 'Placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready',
  OUT_FOR_DELIVERY: 'On the way',
  DELIVERED: 'Delivered',
};

export function OrderStepper({ status }) {
  if (status === 'CANCELLED') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
        This order was cancelled while it was still pending. No further delivery updates will occur.
      </div>
    );
  }

  const currentIndex = steps.indexOf(status);

  return (
    <div className="grid grid-cols-6 gap-1.5" aria-label="Order progress">
      {steps.map((step, index) => {
        const complete = index < currentIndex;
        const active = index === currentIndex;
        return (
          <div key={step} className="relative flex flex-col items-center text-center">
            {index > 0 ? (
              <div
                className={`absolute right-1/2 top-[13px] h-0.5 w-full ${complete || active ? 'bg-brand-400' : 'bg-stone-200'}`}
                aria-hidden="true"
              />
            ) : null}
            <div
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black transition ${
                complete
                  ? 'bg-brand-500 text-white'
                  : active
                    ? 'bg-brand-500 text-white ring-4 ring-brand-100'
                    : 'bg-stone-100 text-ink-500'
              }`}
            >
              {complete ? <Check size={13} strokeWidth={3} /> : index + 1}
            </div>
            <span
              className={`mt-2 text-[10px] font-bold leading-tight sm:text-[11px] ${
                active ? 'text-brand-700' : complete ? 'text-ink-700' : 'text-ink-500'
              }`}
            >
              {shortLabels[step]}
            </span>
            {active ? (
              <span className="sr-only">Current status: {STATUS_META[step]?.label}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
