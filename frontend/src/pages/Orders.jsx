import {
  Activity,
  ArrowRight,
  ClipboardList,
  Clock,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, PageLoader } from '../components/Feedback.jsx';
import { SmartImage } from '../components/SmartImage.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../services/api.js';
import {
  ACTIVE_ORDER_STATUSES,
  STATUS_META,
  formatCurrency,
  formatDate,
} from '../utils/format.js';

const FILTERS = [
  { id: 'all', label: 'All orders' },
  { id: 'active', label: 'Active' },
  { id: 'past', label: 'Past' },
];

export function Orders() {
  usePageTitle('My orders');
  const [orders, setOrders] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activityError, setActivityError] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async ({ silent = false, signal } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    setActivityError('');

    const [ordersResult, activityResult] = await Promise.allSettled([
      api.get('/orders', { signal }),
      api.get('/orders/activity?limit=20', { signal }),
    ]);

    if (signal?.aborted) return;

    if (ordersResult.status === 'fulfilled') {
      setOrders(ordersResult.value.orders);
    } else if (ordersResult.reason?.name !== 'AbortError') {
      setError(ordersResult.reason?.message || 'Could not load your orders.');
    }

    if (activityResult.status === 'fulfilled') {
      setActivity(activityResult.value.activity);
      setActivityError('');
    } else if (activityResult.reason?.name !== 'AbortError') {
      setActivityError(
        activityResult.reason?.message || 'Order activity is temporarily unavailable.',
      );
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load({ signal: controller.signal });
    return () => controller.abort();
  }, [load]);

  const counts = useMemo(
    () => ({
      all: orders.length,
      active: orders.filter((order) => ACTIVE_ORDER_STATUSES.has(order.status)).length,
      past: orders.filter((order) => !ACTIVE_ORDER_STATUSES.has(order.status)).length,
    }),
    [orders],
  );

  const visibleOrders = useMemo(() => {
    if (filter === 'active') return orders.filter((order) => ACTIVE_ORDER_STATUSES.has(order.status));
    if (filter === 'past') return orders.filter((order) => !ACTIVE_ORDER_STATUSES.has(order.status));
    return orders;
  }, [orders, filter]);

  const activityNewestFirst = useMemo(
    () => [...activity].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [activity],
  );

  return (
    <div className="page-shell py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">History</p>
          <h1 className="mt-1 font-display text-4xl font-bold text-ink-950">My orders</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Live delivery is simulated every few seconds. Open an order to follow its Cassandra event
            timeline.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load({ silent: true })}
          disabled={refreshing || loading}
          className="btn-secondary !px-4 !py-2.5"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_340px]">
        <div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const selected = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={selected}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-extrabold transition ${
                    selected
                      ? 'border-ink-950 bg-ink-950 text-white'
                      : 'border-black/10 bg-white text-ink-700 hover:border-brand-300'
                  }`}
                >
                  {item.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                      selected ? 'bg-white/15 text-white' : 'bg-cream-200 text-ink-700'
                    }`}
                  >
                    {counts[item.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-4">
            {loading ? (
              <PageLoader label="Gathering your orders…" />
            ) : error ? (
              <ErrorState
                title="Orders did not load"
                message={error}
                onRetry={() => void load()}
              />
            ) : orders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No orders yet"
                description="Once you place an order, it will appear here with its live delivery status and full event timeline."
                action={
                  <Link to="/" className="btn-primary">
                    Find something to eat <ArrowRight size={16} />
                  </Link>
                }
              />
            ) : visibleOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title={filter === 'active' ? 'No active orders' : 'No past orders'}
                description={
                  filter === 'active'
                    ? 'Everything has been delivered or cancelled. Your complete history is under All orders.'
                    : 'You have no completed or cancelled orders yet.'
                }
                action={
                  <button type="button" onClick={() => setFilter('all')} className="btn-secondary">
                    View all orders
                  </button>
                }
              />
            ) : (
              visibleOrders.map((order) => {
                const active = ACTIVE_ORDER_STATUSES.has(order.status);
                return (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="surface group block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-32px_rgba(80,39,20,0.5)]"
                  >
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                      <SmartImage
                        src={order.restaurant.imageUrl}
                        alt={order.restaurant.name}
                        className="h-20 w-full shrink-0 rounded-2xl sm:h-20 sm:w-20"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={order.status} />
                          {active ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-600">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                              Live
                            </span>
                          ) : null}
                        </div>
                        <h2 className="mt-1.5 font-display text-xl font-bold text-ink-950 group-hover:text-brand-700">
                          {order.restaurant.name}
                        </h2>
                        <p className="mt-0.5 text-xs font-semibold text-ink-500">
                          {order.orderNumber} · {formatDate(order.createdAt)}
                        </p>
                        <p className="mt-1.5 line-clamp-1 text-xs text-ink-500">
                          {order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-5 sm:flex-col sm:items-end sm:gap-1.5">
                        <p className="font-display text-xl font-bold text-ink-950">
                          {formatCurrency(order.totalPaise)}
                        </p>
                        <p className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} item
                          {order.items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? '' : 's'}
                          <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <aside className="h-fit xl:sticky xl:top-24">
          <div className="surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Activity size={17} />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-ink-950">Activity</h2>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-500">
                    Cassandra feed
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="mt-5 space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-xl bg-stone-100" />
                ))}
              </div>
            ) : activityError ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                <p className="font-bold">Activity is temporarily unavailable.</p>
                <p className="mt-1">{activityError}</p>
                <button
                  type="button"
                  onClick={() => void load({ silent: true })}
                  className="mt-2 font-extrabold underline"
                >
                  Try again
                </button>
              </div>
            ) : activity.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-cream-100 px-4 py-3 text-xs leading-5 text-ink-500">
                Order events will appear here after your first checkout. This feed is served from the
                Cassandra customer activity table.
              </p>
            ) : (
              <ol className="mt-5 space-y-0">
                {activityNewestFirst.map((event) => {
                  const meta = STATUS_META[event.status] || { tone: 'amber' };
                  const toneDot = {
                    amber: 'bg-amber-400',
                    blue: 'bg-sky-400',
                    orange: 'bg-brand-400',
                    violet: 'bg-violet-400',
                    indigo: 'bg-indigo-400',
                    green: 'bg-emerald-500',
                    red: 'bg-red-500',
                  }[meta.tone];
                  return (
                    <li key={event.eventId} className="timeline-line relative flex gap-3 pb-4">
                      <span
                        className={`relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ${toneDot}`}
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/orders/${event.orderId}`}
                          className="text-xs font-bold text-ink-900 hover:text-brand-700"
                        >
                          {event.orderNumber}
                        </Link>
                        <p className="mt-0.5 text-[11px] leading-4 text-ink-500">{event.description}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-ink-500">
                          <Clock size={10} /> {formatDate(event.timestamp)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
