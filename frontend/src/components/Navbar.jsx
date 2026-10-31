import {
  ChevronDown,
  ClipboardList,
  LogOut,
  MapPinned,
  Menu,
  ShoppingBag,
  UserRound,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { initials } from '../utils/format.js';

const navLinkClass = ({ isActive }) =>
  `rounded-full px-4 py-2 text-sm font-bold transition ${
    isActive ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-700 hover:bg-white/70 hover:text-ink-950'
  }`;

export function Navbar() {
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const accountRef = useRef(null);

  const itemCount = cart?.itemCount || 0;

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return undefined;
    const handleClick = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [accountOpen]);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
      toast.success('You are signed out.');
      navigate('/');
    } catch {
      toast.error('Could not sign out cleanly. Please try again.');
    } finally {
      setSigningOut(false);
      setAccountOpen(false);
      setMobileOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-cream-100/85 backdrop-blur-xl">
      <div className="page-shell flex h-[4.5rem] items-center justify-between gap-4">
        <Link to="/" className="group flex items-center gap-2.5" aria-label="QuickBite home">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-200 transition group-hover:rotate-6">
            <UtensilsCrossed size={20} strokeWidth={2.2} />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-ink-950">
            Quick<span className="text-brand-600">Bite</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full bg-cream-200/70 p-1 md:flex" aria-label="Main navigation">
          <NavLink to="/" end className={navLinkClass}>
            Discover
          </NavLink>
          {user ? (
            <NavLink to="/orders" className={navLinkClass}>
              My orders
            </NavLink>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/cart"
            className="relative inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-3 text-sm font-bold text-ink-900 transition hover:border-brand-300 hover:bg-brand-50"
            aria-label={`Cart with ${itemCount} item${itemCount === 1 ? '' : 's'}`}
          >
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white ring-2 ring-cream-100">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            ) : null}
          </Link>

          {user ? (
            <div className="relative hidden md:block" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white py-1 pl-1 pr-2.5 text-sm font-bold text-ink-900 transition hover:border-brand-300"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-black text-brand-700">
                  {initials(user.name)}
                </span>
                <span className="max-w-24 truncate">{user.name.split(' ')[0]}</span>
                <ChevronDown
                  size={14}
                  className={`text-ink-500 transition ${accountOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {accountOpen ? (
                <div
                  role="menu"
                  className="animate-rise absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 shadow-xl"
                >
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-extrabold text-ink-950">{user.name}</p>
                    <p className="truncate text-xs text-ink-500">{user.email}</p>
                  </div>
                  <div className="my-1 h-px bg-black/5" />
                  <Link
                    to="/profile"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    <UserRound size={16} /> Profile
                  </Link>
                  <Link
                    to="/orders"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    <ClipboardList size={16} /> My orders
                  </Link>
                  <Link
                    to="/addresses"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
                  >
                    <MapPinned size={16} /> Saved addresses
                  </Link>
                  <div className="my-1 h-px bg-black/5" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    disabled={signingOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <LogOut size={16} /> {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/auth" className="btn-ghost">
                Sign in
              </Link>
              <Link
                to="/auth?mode=register"
                className="btn-primary !px-4 !py-2.5"
              >
                Create account
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="btn-secondary !h-10 !w-10 !p-0 md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="animate-rise border-t border-black/5 bg-cream-50 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            <NavLink to="/" end className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Discover
            </NavLink>
            <NavLink to="/cart" className={navLinkClass} onClick={() => setMobileOpen(false)}>
              Cart {itemCount > 0 ? `(${itemCount})` : ''}
            </NavLink>
            {user ? (
              <>
                <NavLink to="/orders" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                  My orders
                </NavLink>
                <NavLink to="/profile" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                  Profile
                </NavLink>
                <NavLink to="/addresses" className={navLinkClass} onClick={() => setMobileOpen(false)}>
                  Saved addresses
                </NavLink>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="mt-2 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 disabled:opacity-50"
                >
                  <LogOut size={16} /> {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to="/auth" className="btn-secondary" onClick={() => setMobileOpen(false)}>
                  Sign in
                </Link>
                <Link
                  to="/auth?mode=register"
                  className="btn-primary"
                  onClick={() => setMobileOpen(false)}
                >
                  Create account
                </Link>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
