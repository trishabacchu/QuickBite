import { AlertTriangle, X } from 'lucide-react';
import { useEffect } from 'react';
import { Spinner } from './Feedback.jsx';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Keep it',
  onConfirm,
  onCancel,
  busy = false,
  danger = true,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/45 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="animate-rise w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <span
            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${danger ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand-500'}`}
          >
            <AlertTriangle size={20} />
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close dialog"
            className="btn-ghost -mr-2 -mt-2 p-2"
          >
            <X size={17} />
          </button>
        </div>
        <h2 id="confirm-title" className="mt-4 font-display text-2xl font-bold text-ink-950">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-500">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn-primary !bg-red-600 hover:!bg-red-700' : 'btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <Spinner className="h-4 w-4" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
