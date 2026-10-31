import { AlertTriangle, LoaderCircle, PackageOpen, RefreshCcw } from 'lucide-react';

export function Spinner({ className = '' }) {
  return <LoaderCircle aria-hidden="true" className={`animate-spin ${className}`} />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-ink-500">
      <Spinner className="h-8 w-8 text-brand-500" />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

export function LoadingCards({ count = 4 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="surface overflow-hidden">
          <div className="h-44 animate-pulse bg-stone-100" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-stone-100" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-stone-100" />
            <div className="h-3 w-full animate-pulse rounded-full bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
        <AlertTriangle size={22} />
      </span>
      <h3 className="text-lg font-extrabold text-ink-950">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
        {message || 'Please try again in a moment.'}
      </p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-secondary mt-5">
          <RefreshCcw size={15} /> Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, description, action, icon: Icon = PackageOpen }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-500">
        <Icon size={28} strokeWidth={1.6} />
      </span>
      <h3 className="font-display text-2xl font-bold text-ink-950">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
