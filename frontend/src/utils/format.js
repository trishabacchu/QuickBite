const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(paise) {
  return currencyFormatter.format((Number(paise) || 0) / 100);
}

export function formatDate(value, { withTime = true } = {}) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(value));
}

export function formatClockTime(value) {
  if (!value) return '';
  const [hourString, minute] = value.split(':');
  const hour = Number(hourString);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

export function formatPrepTime(minutes) {
  return `${minutes} min`;
}

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export const STATUS_META = {
  PENDING: { label: 'Pending', tone: 'amber' },
  CONFIRMED: { label: 'Confirmed', tone: 'blue' },
  PREPARING: { label: 'Preparing', tone: 'orange' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', tone: 'violet' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', tone: 'indigo' },
  DELIVERED: { label: 'Delivered', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'red' },
};

export const ACTIVE_ORDER_STATUSES = new Set([
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
]);
