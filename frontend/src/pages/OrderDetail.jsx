import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  RefreshCw,
  Sparkles,
  Timer,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { ErrorState, PageLoader, Spinner } from '../components/Feedback.jsx';
import { OrderStepper } from '../components/OrderStepper.jsx';
import { SmartImage } from '../components/SmartImage.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../services/api.js';
import {
  ACTIVE_ORDER_STATUSES,
  STATUS_META,
  formatCurrency,
  formatDate,
} from '../utils/format.js';

const EMPTY_TIMELINE = { events: [], pendingEvents: 0, loading: true, error: '' };

const dotTone = {
  amber: 'bg-amber-400',
  blue: 'bg-sky-400',
  orange: 'bg-brand-400',
  violet: 'bg-violet-400',
  indigo: 'bg-indigo-400',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
};

export function OrderDetail() {
  const { id } = useParams();
  const location = useLocation();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeline, setTimeline] = useState(EMPTY_TIMELINE);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [timelineRefreshing, setTimelineRefreshing] = useState(false);

  usePageTitle(order ? `Order ${order.orderNumber}` : 'Order details');
  const justPlaced = Boolean(location.state?.justPlaced);

  const loadOrder = useCallback(
    async ({ silent = false, signal } = {}) => {
      if (!silent) setLoading(true);
      try {
        const data = await api.get(`/orders/${id}`, { signal });
        if (signal?.aborted) return;
        setOrder(data.order);
        setError('');
      } catch (err) {
        if (err.name === 'AbortError') return;
        if (!silent) setError(err.message || 'Could not load this order.');
      } finally {
        if (!signal?.aborted && !silent) setLoading(false);
      }
    },
    [id],
  );

  const loadTimeline = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setTimeline((current) => ({ ...current, loading: true, error: '' }));
      }
      try {
        const data = await api.get(`/orders/${id}/events?limit=100`);
        setTimeline({
          events: data.events || [],
          pendingEvents: data.pendingEvents || 0,
          loading: false,
          error: '',
        });
      } catch (err) {
        setTimeline((current) => ({
          ...current,
          loading: false,
          error: err.message || 'The timeline is temporarily unavailable.',
        }));
      }
    },
    [id],
  );

  useEffect(() => {
    const controller = new AbortController();
    setOrder(null);
    setTimeline(EMPTY_TIMELINE);
    setError('');
    void loadOrder({ signal: controller.signal });
    void loadTimeline();
    return () => controller.abort();
  }, [id, loadOrder, loadTimeline]);

  const status = order?.status;
  useEffect(() => {
    if (!status || !ACTIVE_ORDER_STATUSES.has(status)) return undefined;
    const timer = window.setInterval(() => {
      void loadOrder({ silent: true });
      void loadTimeline({ silent: true });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [status, loadOrder, loadTimeline]);

  // The final timeline event travels through the outbox, so allow it a moment
  // to land in Cassandra after the order reaches a terminal status.
  useEffect(() => {
    if (!status || ACTIVE_ORDER_STATUSES.has(status)) return undefined;
    const timer = window.setTimeout(() => void loadTimeline({ silent: true }), 3500);
    return () => window.clearTimeout(timer);
  }, [status, loadTimeline]);

  // If the outbox is retrying a delivery (for example after a Cassandra
  // timeout), keep the timeline fresh until every staged event lands.
  useEffect(() => {
    if (timeline.pendingEvents <= 0) return undefined;
    const timer = window.setInterval(() => void loadTimeline({ silent: true }), 3000);
    return () => window.clearInterval(timer);
  }, [timeline.pendingEvents, loadTimeline]);

  async function refreshTimeline() {
    setTimelineRefreshing(true);
    await loadTimeline({ silent: true });
    setTimelineRefreshing(false);
  }

  async function cancelOrder() {
    setCancelling(true);
    try {
      const data = await api.post(`/orders/${id}/cancel`);
      setOrder(data.order);
      setConfirmCancel(false);
      toast.success('Order cancelled.');
      window.setTimeout(() => void loadTimeline({ silent: true }), 1800);
    } catch (err) {
      toast.error(err.message || 'Could not cancel this order.');
      setConfirmCancel(false);
      void loadOrder({ silent: true });
    } finally {
      setCancelling(false);
    }
  }

  const eventsNewestFirst = useMemo(
    () => [...timeline.events].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [timeline.events],
  );

  if (loading && !order) {
    return (
      <div className="page-shell py-10">
        <PageLoader label="Finding your order…" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="page-shell py-10">
        <ErrorState title="Order not found" message={error} onRetry={() => void loadOrder()} />
        <div className="mt-5 text-center">
          <Link to="/orders" className="btn-secondary">
            <ArrowLeft size={15} /> Back to my orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const active = ACTIVE_ORDER_STATUSES.has(order.status);
  const paymentLabel = order.paymentStatus === 'PENDING' ? 'Pending on delivery' : order.paymentStatus;
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="page-shell py-8">
      <Link to="/orders" className="btn-ghost -ml-2 mb-4">
        <ArrowLeft size={16} /> Back to my orders
      </Link>

      {justPlaced ? (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
          <Sparkles size={19} className="mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-extrabold">Order placed successfully.</p>
            <p className="mt-0.5 text-sm text-emerald-800">
              {order.orderNumber} is now pending restaurant confirmation. This page refreshes
              automatically while the kitchen works.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            {active ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live
              </span>
            ) : null}
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold text-ink-950">
            {order.restaurant.name}
          </h1>
          <p className="mt-1 text-sm font-semibold text-ink-500">
            Order {order.orderNumber} · placed {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order.canCancel ? (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="btn-secondary !text-red-600 hover:!border-red-200 hover:!bg-red-50"
            >
              Cancel order
            </button>
          ) : null}
          <Link to={`/restaurants/${order.restaurant.id}`} className="btn-secondary">
            View restaurant
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <div className="surface p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-ink-950">Delivery progress</h2>
              <p className="mt-0.5 text-xs text-ink-500">
                Estimated {order.estimatedDeliveryMinutes} minutes from confirmation.
              </p>
            </div>
            {active ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-500">
                <RefreshCw size={12} className="animate-spin text-brand-500" /> Updates every few
                seconds
              </span>
            ) : order.status === 'DELIVERED' ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 size={13} /> Delivered {formatDate(order.deliveredAt)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-red-700">
                <XCircle size={13} /> Cancelled {formatDate(order.cancelledAt)}
              </span>
            )}
          </div>
          <OrderStepper status={order.status} />
          {!order.canCancel && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' ? (
            <p className="mt-5 rounded-xl bg-cream-100 px-4 py-2.5 text-[11px] font-semibold text-ink-500">
              Cancellation closes once the restaurant confirms the order. Reach out to the kitchen
              for changes after that point.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <section className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
              <h2 className="font-display text-xl font-bold text-ink-950">
                {totalQuantity} item{totalQuantity === 1 ? '' : 's'}
              </h2>
              <span className="text-xs font-bold text-ink-500">{order.restaurant.cuisine}</span>
            </div>
            <ul className="divide-y divide-black/5">
              {order.items.map((item) => (
                <li key={item.foodItemId} className="flex items-center gap-4 px-5 py-4">
                  <SmartImage
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-16 w-16 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink-950">{item.name}</p>
                    <p className="mt-0.5 text-xs font-semibold text-ink-500">
                      {item.quantity} × {formatCurrency(item.unitPricePaise)} · {item.category}
                    </p>
                  </div>
                  <p className="shrink-0 font-extrabold text-ink-950">
                    {formatCurrency(item.lineTotalPaise)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="space-y-2.5 border-t border-black/5 bg-cream-50/60 px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="font-bold text-ink-950">{formatCurrency(order.subtotalPaise)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Delivery fee</dt>
                <dd className="font-bold text-ink-950">{formatCurrency(order.deliveryFeePaise)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-black/5 pt-2.5 text-base">
                <dt className="font-extrabold text-ink-950">Total</dt>
                <dd className="font-display text-2xl font-bold text-brand-700">
                  {formatCurrency(order.totalPaise)}
                </dd>
              </div>
            </dl>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="surface p-5">
              <div className="flex items-center gap-2 text-brand-600">
                <MapPin size={17} />
                <h2 className="text-xs font-extrabold uppercase tracking-[0.12em]">Delivering to</h2>
              </div>
              <p className="mt-3 font-bold text-ink-950">
                {order.deliveryAddress.label || 'Saved address'}
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-500">
                {order.deliveryAddress.line1}
                <br />
                {order.deliveryAddress.city}, {order.deliveryAddress.state}{' '}
                {order.deliveryAddress.postalCode}
              </p>
              <p className="mt-3 text-[10px] font-semibold text-ink-500">
                Snapshot captured when the order was placed.
              </p>
            </section>

            <section className="surface p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-brand-600">
                  <Wallet size={17} />
                  <h2 className="text-xs font-extrabold uppercase tracking-[0.12em]">Payment</h2>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-amber-700 ring-1 ring-inset ring-amber-200">
                  {paymentLabel}
                </span>
              </div>
              <p className="mt-3 font-bold text-ink-950">Cash on Delivery</p>
              <p className="mt-1 text-sm leading-6 text-ink-500">
                Pay the delivery partner when the order arrives. Payment status is deliberately
                separate from delivery status in this demo.
              </p>
              <p className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-ink-500">
                <Timer size={11} /> Order lifecycle and payment lifecycle are tracked independently.
              </p>
            </section>
          </div>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <section className="surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-ink-950">Order timeline</h2>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">
                  Cassandra · order_events_by_order
                </p>
              </div>
              <button
                type="button"
                onClick={refreshTimeline}
                disabled={timelineRefreshing}
                aria-label="Refresh order timeline"
                className="rounded-full p-2 text-ink-500 transition hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40"
              >
                <RefreshCw size={15} className={timelineRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {timeline.loading ? (
              <div className="mt-5 space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 animate-pulse rounded-full bg-stone-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 animate-pulse rounded-full bg-stone-100" />
                      <div className="h-2.5 w-1/2 animate-pulse rounded-full bg-stone-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : timeline.error ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                <p className="font-bold">Timeline is temporarily unavailable.</p>
                <p className="mt-1">{timeline.error}</p>
                <button
                  type="button"
                  onClick={refreshTimeline}
                  className="mt-2 font-extrabold underline"
                >
                  Retry now
                </button>
              </div>
            ) : eventsNewestFirst.length === 0 ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-cream-100 px-4 py-3 text-xs leading-5 text-ink-500">
                <Spinner className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                The first event is being delivered to Cassandra from the outbox. It will appear
                here shortly.
              </div>
            ) : (
              <ol className="mt-5 space-y-0">
                {eventsNewestFirst.map((event, index) => {
                  const meta = STATUS_META[event.newStatus] || { tone: 'amber' };
                  const cancelled = event.newStatus === 'CANCELLED';
                  return (
                    <li key={event.eventId} className="timeline-line relative flex gap-3 pb-5 last:pb-0">
                      <span
                        className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white ${
                          cancelled ? 'bg-red-500' : dotTone[meta.tone]
                        }`}
                      >
                        {cancelled ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-extrabold text-ink-950">
                            {STATUS_META[event.newStatus]?.label || event.newStatus}
                          </p>
                          {index === 0 ? (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-brand-700">
                              Latest
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs leading-5 text-ink-500">{event.description}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-ink-500">
                          <Clock size={10} /> {formatDate(event.timestamp)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {timeline.pendingEvents > 0 ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-[11px] leading-5 text-sky-900">
                <Info size={14} className="mt-0.5 shrink-0" />
                {timeline.pendingEvents} event{timeline.pendingEvents === 1 ? '' : 's'} waiting in the
                Mongo outbox for Cassandra delivery. Retries are automatic.
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-black/5 bg-white/60 p-5 text-xs leading-5 text-ink-500">
            <p className="font-bold text-ink-700">A note on this timeline</p>
            <p className="mt-1.5">
              The delivery progress bar is computed from the order in MongoDB. This event log is
              read separately from Cassandra, so it can briefly lag behind while the outbox worker
              catches up.
            </p>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this order?"
        message="You can cancel only while the order is pending. Once confirmed by the kitchen, cancellation closes. The cancellation will also be written to your order timeline."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        onConfirm={cancelOrder}
        onCancel={() => setConfirmCancel(false)}
        busy={cancelling}
        danger
      />
    </div>
  );
}
