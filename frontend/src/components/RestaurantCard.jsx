import { Bike, Clock, MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatClockTime, formatCurrency, formatPrepTime } from '../utils/format.js';
import { SmartImage } from './SmartImage.jsx';

export function RestaurantCard({ restaurant, eager = false }) {
  const closed = !restaurant.isOpen;

  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      className="surface group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-32px_rgba(80,39,20,0.5)]"
    >
      <div className="relative h-44 overflow-hidden">
        <SmartImage
          src={restaurant.imageUrl}
          alt={restaurant.name}
          eager={eager}
          className="h-full w-full"
          imgClassName="transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ink-950/55 to-transparent" />
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] backdrop-blur ${
            closed
              ? 'bg-red-50/95 text-red-700'
              : 'bg-emerald-50/95 text-emerald-700'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${closed ? 'bg-red-500' : 'bg-emerald-500'}`} />
          {closed ? 'Closed now' : 'Open now'}
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-extrabold text-ink-900 backdrop-blur">
          <Star size={12} className="fill-amber-400 text-amber-400" />
          {restaurant.rating.toFixed(1)}
        </span>
        <p className="absolute bottom-2.5 left-3 text-xs font-bold text-white/90">
          {restaurant.cuisine}
        </p>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-xl font-bold leading-tight text-ink-950 transition group-hover:text-brand-700">
            {restaurant.name}
          </h3>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-ink-500">{restaurant.description}</p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4 text-[11px] font-bold text-ink-700">
          <span className="inline-flex items-center gap-1">
            <Clock size={13} className="text-brand-500" /> {formatPrepTime(restaurant.deliveryTimeMinutes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Bike size={13} className="text-brand-500" />
            {restaurant.deliveryFeePaise === 0 ? 'Free delivery' : `${formatCurrency(restaurant.deliveryFeePaise)} delivery`}
          </span>
          <span className="inline-flex items-center gap-1 text-ink-500">
            <MapPin size={13} className="text-brand-500" />
            {closed
              ? `Opens ${formatClockTime(restaurant.openingTime)}`
              : `Until ${formatClockTime(restaurant.closingTime)}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
