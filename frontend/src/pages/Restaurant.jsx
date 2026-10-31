import {
  ArrowLeft,
  Bike,
  Clock,
  Info,
  MapPin,
  ShoppingBag,
  Star,
  Timer,
  UtensilsCrossed,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, PageLoader } from '../components/Feedback.jsx';
import { FoodCard } from '../components/FoodCard.jsx';
import { SmartImage } from '../components/SmartImage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAddToCart } from '../hooks/useAddToCart.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../services/api.js';
import { formatClockTime, formatCurrency, formatPrepTime } from '../utils/format.js';

function categoryId(category) {
  return `menu-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function Restaurant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cart } = useCart();
  const { addingId, addToCart } = useAddToCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  usePageTitle(data?.restaurant?.name || 'Restaurant');

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError('');
      try {
        const result = await api.get(`/restaurants/${id}`, { signal });
        setData(result);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message || 'Could not load this restaurant.');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const groups = useMemo(() => {
    if (!data) return [];
    const map = new Map();
    for (const food of data.menu) {
      if (!map.has(food.category)) map.set(food.category, []);
      map.get(food.category).push(food);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }, [data]);

  function scrollToCategory(category) {
    document.getElementById(categoryId(category))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) {
    return (
      <div className="page-shell py-10">
        <PageLoader label="Opening the menu…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell py-10">
        <ErrorState
          title="This restaurant is out of reach"
          message={error}
          onRetry={() => void load()}
        />
        <div className="mt-5 text-center">
          <Link to="/" className="btn-secondary">
            <ArrowLeft size={15} /> Back to restaurants
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { restaurant, menu } = data;
  const closed = !restaurant.isOpen;
  const cartMatches = cart?.restaurant?.id === restaurant.id && cart.items.length > 0;
  const cartFromElsewhere = cart?.restaurant && cart.restaurant.id !== restaurant.id && cart.items.length > 0;

  return (
    <div className="page-shell py-6 sm:py-8">
      <button type="button" onClick={() => navigate(-1)} className="btn-ghost -ml-2 mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <section className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[var(--shadow-soft)]">
        <div className="relative h-64 sm:h-80">
          <SmartImage
            src={restaurant.imageUrl}
            alt={restaurant.name}
            eager
            className="h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/70">
                  {restaurant.cuisine}
                </p>
                <h1 className="mt-1.5 font-display text-4xl font-bold text-white sm:text-5xl">
                  {restaurant.name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
                  {restaurant.description}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] ${
                  closed ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${closed ? 'bg-red-500' : 'bg-emerald-500'}`} />
                {closed ? 'Closed now' : 'Open now'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
          <div className="flex items-center gap-3 rounded-2xl bg-cream-100 px-4 py-3">
            <Star size={18} className="fill-amber-400 text-amber-400" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-500">Rating</p>
              <p className="text-sm font-extrabold text-ink-950">{restaurant.rating.toFixed(1)} / 5</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-cream-100 px-4 py-3">
            <Clock size={18} className="text-brand-500" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-500">Delivery</p>
              <p className="text-sm font-extrabold text-ink-950">
                {formatPrepTime(restaurant.deliveryTimeMinutes)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-cream-100 px-4 py-3">
            <Bike size={18} className="text-brand-500" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-500">Delivery fee</p>
              <p className="text-sm font-extrabold text-ink-950">
                {restaurant.deliveryFeePaise === 0
                  ? 'Free'
                  : formatCurrency(restaurant.deliveryFeePaise)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-cream-100 px-4 py-3">
            <MapPin size={18} className="text-brand-500" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-ink-500">
                Open hours
              </p>
              <p className="text-sm font-extrabold text-ink-950">
                {formatClockTime(restaurant.openingTime)} – {formatClockTime(restaurant.closingTime)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {closed ? (
        <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 font-semibold">
            <Info size={17} className="mt-0.5 shrink-0" />
            {restaurant.name} is closed right now. The menu is browsable, but items can&apos;t be
            added until the kitchen opens at {formatClockTime(restaurant.openingTime)}.
          </p>
          <span className="shrink-0 text-xs font-bold text-amber-700">
            Kitchen clock: {restaurant.localTime || '—'}
          </span>
        </div>
      ) : null}

      {cartMatches ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3.5 text-sm">
          <p className="inline-flex items-center gap-2 font-bold text-brand-800">
            <ShoppingBag size={16} /> {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} from this
            restaurant are already in your cart.
          </p>
          <Link to="/cart" className="text-xs font-extrabold text-brand-700 hover:underline">
            View cart →
          </Link>
        </div>
      ) : null}

      {cartFromElsewhere ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-sm font-semibold text-amber-900">
          Your cart currently has food from {cart.restaurant.name}. Adding a dish here will ask you
          to confirm replacing it.
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="surface p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-500">
                On this menu
              </p>
              <nav className="mt-3 space-y-1" aria-label="Menu categories">
                {groups.map((group) => (
                  <button
                    key={group.category}
                    type="button"
                    onClick={() => scrollToCategory(group.category)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    <span>{group.category}</span>
                    <span className="text-[10px] font-extrabold text-ink-500">{group.items.length}</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/70 p-4 text-xs leading-5 text-ink-500">
              <p className="inline-flex items-center gap-1.5 font-bold text-ink-700">
                <Timer size={14} className="text-brand-500" /> One restaurant per cart
              </p>
              <p className="mt-1.5">
                Mixing kitchens is disabled. You can switch restaurants at any time — we&apos;ll ask
                before clearing your current cart.
              </p>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
            {groups.map((group) => (
              <button
                key={group.category}
                type="button"
                onClick={() => scrollToCategory(group.category)}
                className="shrink-0 rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs font-bold text-ink-700"
              >
                {group.category}
              </button>
            ))}
          </div>

          {menu.length === 0 ? (
            <div className="surface px-6 py-12 text-center">
              <UtensilsCrossed size={28} className="mx-auto text-brand-400" />
              <h2 className="mt-3 font-display text-2xl font-bold text-ink-950">
                This menu is being refreshed
              </h2>
              <p className="mt-1.5 text-sm text-ink-500">
                There are no active dishes to show right now. Please check back shortly.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {groups.map((group) => (
                <section
                  key={group.category}
                  id={categoryId(group.category)}
                  className="scroll-mt-24"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-2xl font-bold text-ink-950">{group.category}</h2>
                    <span className="text-xs font-bold text-ink-500">
                      {group.items.length} dish{group.items.length === 1 ? '' : 'es'}
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((food) => (
                      <FoodCard
                        key={food.id}
                        food={food}
                        restaurantOpen={!closed}
                        busy={addingId === food.id}
                        onAdd={addToCart}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
