import { ArrowRight, Compass, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

export function NotFound() {
  usePageTitle('Page not found');
  const { user } = useAuth();

  return (
    <div className="page-shell py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-brand-50 text-brand-500">
          <Compass size={36} strokeWidth={1.4} />
        </span>
        <p className="mt-6 font-display text-7xl font-bold text-brand-500">404</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink-950">
          This table isn&apos;t set
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-500">
          The page you asked for doesn&apos;t exist, or it may have moved. The kitchens are still
          open — head back and find something good.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link to="/" className="btn-primary">
            <UtensilsCrossed size={16} /> Browse restaurants
          </Link>
          {user ? (
            <Link to="/orders" className="btn-secondary">
              My orders <ArrowRight size={15} />
            </Link>
          ) : (
            <Link to="/auth" className="btn-secondary">
              Sign in <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
