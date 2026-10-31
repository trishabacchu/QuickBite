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
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, PageLoader } from '../components/Feedback.jsx';
import { QuantityStepper } from '../components/QuantityStepper.jsx';
import { SmartImage } from '../components/SmartImage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAddToCart } from '../hooks/useAddToCart.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../services/api.js';
import { formatClockTime, formatCurrency, formatPrepTime } from '../utils/format.js';

export function FoodDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cart } = useCart();
  const { addingId, addToCart } = useAddToCart();
  const [food, setFood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);

  usePageTitle(food?.name || 'Dish');

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get(`/food/${id}`, { signal });
        setFood(data.food);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message || 'Could not load this dish.');
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

  if (loading) {
    return (
      <div className="page-shell py-10">
        <PageLoader label="Plating the details…" />
      </div>
    );
  }

  if (error || !food) {
    return (
      <div className="page-shell py-10">
        <ErrorState
          title="This dish is not on the menu"
          message={error || 'The dish may have been removed.'}
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

  const closed = food.restaurant ? !food.restaurant.isOpen : false;
  const soldOut = !food.isAvailable;
  const disabled = closed || soldOut;
  const busy = addingId === food.id;
  const cartMatches = food.restaurant && cart?.restaurant?.id === food.restaurant.id;

  async function handleAdd() {
    const added = await addToCart(food, quantity);
    if (added) setQuantity(1);
  }

  return (
    <div className="page-shell py-6 sm:py-8">
      <button type="button" onClick={() => navigate(-1)} className="btn-ghost -ml-2 mb-4">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[var(--shadow-soft)]">
          <SmartImage
            src={food.imageUrl}
            alt={food.name}
            eager
            className="aspect-[4/3] w-full"
          />
          <div className="absolute left-4 top-4 flex gap-2">
            <span className="rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink-700 backdrop-blur">
              {food.category}
            </span>
            {soldOut ? (
              <span className="rounded-full bg-ink-950/85 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white">
                Sold out
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col">
          <p className="eyebrow">Dish details</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink-950">
            {food.name}
          </h1>
          <p className="mt-3 text-base leading-7 text-ink-500">{food.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="font-display text-3xl font-bold text-brand-700">
              {formatCurrency(food.pricePaise)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-200 px-3 py-1.5 text-xs font-bold text-ink-700">
              <Timer size={13} className="text-brand-500" />
              {food.preparationTimeMinutes} min prep
            </span>
          </div>

          {food.restaurant ? (
            <div className="surface mt-6 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-500">
                    From the kitchen
                  </p>
                  <Link
                    to={`/restaurants/${food.restaurant.id}`}
                    className="mt-1 inline-flex items-center gap-1.5 font-display text-xl font-bold text-ink-950 hover:text-brand-700"
                  >
                    <UtensilsCrossed size={18} className="text-brand-500" />
                    {food.restaurant.name}
                  </Link>
                  <p className="mt-1 text-xs font-semibold text-ink-500">
                    {food.restaurant.cuisine}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${
                    closed ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${closed ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  {closed ? 'Closed' : 'Open'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-semibold text-ink-700">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={13} className="text-brand-500" />
                  {formatPrepTime(food.restaurant.deliveryTimeMinutes)} delivery
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Bike size={13} className="text-brand-500" />
                  {formatCurrency(food.restaurant.deliveryFeePaise)} fee
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13} className="text-brand-500" />
                  {formatClockTime(food.restaurant.openingTime)} –{' '}
                  {formatClockTime(food.restaurant.closingTime)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  Kitchen availability
                </span>
              </div>
            </div>
          ) : null}

          {closed ? (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              <Info size={17} className="mt-0.5 shrink-0" />
              The kitchen is closed right now. You can browse the details, but ordering opens at{' '}
              {formatClockTime(food.restaurant.openingTime)}.
            </div>
          ) : null}

          {soldOut ? (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <Info size={17} className="mt-0.5 shrink-0" />
              This dish is currently unavailable. Try another dish from the same kitchen.
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={10}
              disabled={disabled}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={disabled || busy}
              className="btn-primary min-w-44"
            >
              <ShoppingBag size={17} />
              {busy ? 'Adding…' : `Add ${quantity > 1 ? `${quantity} ` : ''}to cart`}
            </button>
          </div>
          <p className="mt-2.5 text-xs font-semibold text-ink-500">
            Maximum 10 of the same dish per order. Prices are confirmed again at checkout.
          </p>

          {cartMatches ? (
            <Link
              to="/cart"
              className="mt-4 inline-flex w-fit items-center gap-1.5 text-sm font-extrabold text-brand-700 hover:underline"
            >
              <ShoppingBag size={15} /> View your cart ({cart.itemCount})
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
