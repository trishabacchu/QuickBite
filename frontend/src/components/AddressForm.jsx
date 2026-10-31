import { useEffect, useId, useState } from 'react';
import { Spinner } from './Feedback.jsx';

const EMPTY = { label: '', line1: '', city: '', state: '', postalCode: '' };

function validate(values) {
  const errors = {};
  if (values.label.trim().length > 30) errors.label = 'Use 30 characters or fewer.';
  if (values.line1.trim().length < 5) errors.line1 = 'Enter a full street address (at least 5 characters).';
  if (values.line1.trim().length > 200) errors.line1 = 'Use 200 characters or fewer.';
  if (values.city.trim().length < 2) errors.city = 'Enter a city.';
  if (values.city.trim().length > 60) errors.city = 'Use 60 characters or fewer.';
  if (values.state.trim().length < 2) errors.state = 'Enter a state.';
  if (values.state.trim().length > 60) errors.state = 'Use 60 characters or fewer.';
  if (!/^\d{6}$/.test(values.postalCode.trim())) errors.postalCode = 'Enter a 6-digit Indian postal code.';
  return errors;
}

export function AddressForm({
  initial,
  onSubmit,
  onCancel,
  busy = false,
  submitLabel = 'Save address',
}) {
  const formId = useId();
  const [values, setValues] = useState(() => ({ ...EMPTY, ...initial }));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setValues({ ...EMPTY, ...initial });
    setErrors({});
  }, [initial]);

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit({
      label: values.label.trim(),
      line1: values.line1.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      postalCode: values.postalCode.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`${formId}-label`}>
            Label <span className="font-semibold normal-case tracking-normal text-ink-500">(optional)</span>
          </label>
          <input
            id={`${formId}-label`}
            className="field"
            placeholder="Home, Work, Hostel…"
            value={values.label}
            onChange={(event) => setField('label', event.target.value)}
            maxLength={30}
            autoComplete="off"
          />
          {errors.label ? <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.label}</p> : null}
        </div>
        <div>
          <label className="field-label" htmlFor={`${formId}-postal`}>
            Postal code
          </label>
          <input
            id={`${formId}-postal`}
            className="field"
            placeholder="560038"
            inputMode="numeric"
            maxLength={6}
            value={values.postalCode}
            onChange={(event) => setField('postalCode', event.target.value.replace(/\D/g, ''))}
            autoComplete="postal-code"
          />
          {errors.postalCode ? (
            <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.postalCode}</p>
          ) : null}
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor={`${formId}-line1`}>
          Street address
        </label>
        <input
          id={`${formId}-line1`}
          className="field"
          placeholder="Flat / house number, street, area"
          value={values.line1}
          onChange={(event) => setField('line1', event.target.value)}
          maxLength={200}
          autoComplete="address-line1"
        />
        {errors.line1 ? <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.line1}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor={`${formId}-city`}>
            City
          </label>
          <input
            id={`${formId}-city`}
            className="field"
            placeholder="Bengaluru"
            value={values.city}
            onChange={(event) => setField('city', event.target.value)}
            maxLength={60}
            autoComplete="address-level2"
          />
          {errors.city ? <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.city}</p> : null}
        </div>
        <div>
          <label className="field-label" htmlFor={`${formId}-state`}>
            State
          </label>
          <input
            id={`${formId}-state`}
            className="field"
            placeholder="Karnataka"
            value={values.state}
            onChange={(event) => setField('state', event.target.value)}
            maxLength={60}
            autoComplete="address-level1"
          />
          {errors.state ? <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.state}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        {onCancel ? (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        ) : null}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : null}
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
