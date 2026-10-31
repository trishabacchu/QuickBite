import { Plus, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/format.js';
import { SmartImage } from './SmartImage.jsx';
import { Spinner } from './Feedback.jsx';

export function FoodCard({ food, onAdd, busy = false, restaurantOpen = true, showRestaurant = false }) {
  const soldOut = !food.isAvailable;
  const closed = !restaurantOpen;
  const disabled = soldOut || closed || busy;

  return (
    <article className="surface flex flex-col overflow-hidden transition hover:shadow-[0_18px_44px_-28px_rgba(80,39,20,0.5)]">
      <div className="relative h-40 overflow-hidden">
        <Link to={`/food/${food.id}`} aria-label={`View ${food.name}`} className="block h-full w-full">
          <SmartImage
            src={food.imageUrl}
            alt={food.name}
            className="h-full w-full"
            imgClassName="transition duration-500 hover:scale-105"
          />
        </Link>
        {soldOut ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink-950/85 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white">
            Sold out
          </span>
        ) : null}
        <span className="absolute bottom-2.5 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-700 backdrop-blur">
          {food.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Link to={`/food/${food.id}`} className="group">
          <h3 className="line-clamp-1 font-bold text-ink-950 transition group-hover:text-brand-700">
            {food.name}
          </h3>
        </Link>
        {showRestaurant && food.restaurant ? (
          <Link
            to={`/restaurants/${food.restaurant.id}`}
            className="mt-0.5 text-[11px] font-bold text-brand-600 hover:underline"
          >
            {food.restaurant.name}
          </Link>
        ) : null}
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-500">{food.description}</p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="font-extrabold text-ink-950">{formatCurrency(food.pricePaise)}</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-ink-500">
              <Timer size={11} /> {food.preparationTimeMinutes} min prep
            </p>
          </div>
          <button
            type="button"
            onClick={() => onAdd(food)}
            disabled={disabled}
            title={
              closed
                ? 'The restaurant is closed right now'
                : soldOut
                  ? 'This item is currently unavailable'
                  : `Add ${food.name} to cart`
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-500 px-3.5 text-xs font-extrabold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-ink-500"
          >
            {busy ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <>
                <Plus size={14} strokeWidth={3} /> Add
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
