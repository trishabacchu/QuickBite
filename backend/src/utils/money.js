export function paiseToRupees(paise) {
  return Number((Number(paise) / 100).toFixed(2));
}

export function formatInr(paise) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paiseToRupees(paise));
}

export function toSafeInteger(value, fieldName) {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${fieldName} must be a safe integer amount in paise.`);
  }
  return value;
}
