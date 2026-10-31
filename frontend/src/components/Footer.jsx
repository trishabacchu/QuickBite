import { Bike, CreditCard, Database, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Footer() {
  const { user } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-black/5 bg-cream-200/60">
      <div className="page-shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link to="/" className="flex items-center gap-2.5" aria-label="QuickBite home">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-200">
              <UtensilsCrossed size={20} strokeWidth={2.2} />
            </span>
            <span className="font-display text-2xl font-bold tracking-tight text-ink-950">
              Quick<span className="text-brand-600">Bite</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-ink-500">
            A small, complete food-ordering demonstration built with React, Express, MongoDB, and
            Apache Cassandra. Browse a curated menu, build a cart, and watch your order move through
            the kitchen.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {['React + Vite', 'Express', 'MongoDB', 'Cassandra'].map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-bold text-ink-700"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-ink-700">Order</h3>
          <ul className="mt-4 space-y-2.5 text-sm font-semibold text-ink-500">
            <li>
              <Link className="transition hover:text-brand-700" to="/">
                Discover restaurants
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-brand-700" to="/cart">
                Your cart
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-brand-700" to={user ? '/orders' : '/auth'}>
                {user ? 'Order history' : 'Sign in'}
              </Link>
            </li>
            {user ? (
              <li>
                <Link className="transition hover:text-brand-700" to="/addresses">
                  Saved addresses
                </Link>
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-ink-700">
            Demo details
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-ink-500">
            <li className="flex items-start gap-2.5">
              <CreditCard size={16} className="mt-0.5 shrink-0 text-brand-500" />
              Cash on Delivery only. Payment status is tracked separately from delivery status.
            </li>
            <li className="flex items-start gap-2.5">
              <Bike size={16} className="mt-0.5 shrink-0 text-brand-500" />
              Status updates are simulated every few seconds for the lab demonstration.
            </li>
            <li className="flex items-start gap-2.5">
              <Database size={16} className="mt-0.5 shrink-0 text-brand-500" />
              Operational data lives in MongoDB; the order timeline lives in Cassandra.
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-black/5">
        <div className="page-shell flex flex-col items-start justify-between gap-2 py-5 text-xs text-ink-500 sm:flex-row sm:items-center">
          <p>© {year} QuickBite · NoSQL laboratory project · Local development only.</p>
          <p>Prices in INR · Local demo credentials available on the sign-in page.</p>
        </div>
      </div>
    </footer>
  );
}
