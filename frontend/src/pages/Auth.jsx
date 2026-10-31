import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PageLoader, Spinner } from '../components/Feedback.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

const DEMO = { email: 'demo@quickbite.local', password: 'Demo@123' };

export function Auth() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  usePageTitle(mode === 'register' ? 'Create account' : 'Sign in');

  const { user, loading, login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from;
  const destination = from
    ? `${from.pathname || '/'}${from.search || ''}${from.hash || ''}`
    : '/';

  useEffect(() => {
    setError('');
    setFieldErrors({});
    setShowPassword(false);
  }, [mode]);

  if (loading) {
    return (
      <div className="page-shell py-10">
        <PageLoader label="Checking your session…" />
      </div>
    );
  }

  if (user) return <Navigate to={destination} replace />;

  function switchMode(next) {
    setSearchParams(next === 'register' ? { mode: 'register' } : {});
  }

  function validateLogin() {
    const errors = {};
    if (!/^\S+@\S+\.\S+$/.test(loginForm.email.trim())) errors.email = 'Enter a valid email address.';
    if (!loginForm.password) errors.password = 'Enter your password.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateRegister() {
    const errors = {};
    if (registerForm.name.trim().length < 2) errors.name = 'Enter at least 2 characters.';
    if (!/^\S+@\S+\.\S+$/.test(registerForm.email.trim())) errors.email = 'Enter a valid email address.';
    if (registerForm.password.length < 6) errors.password = 'Use at least 6 characters.';
    if (registerForm.password.length > 72) errors.password = 'Use 72 characters or fewer.';
    if (registerForm.confirmPassword !== registerForm.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    if (!validateLogin()) return;
    setSubmitting(true);
    try {
      await login({ email: loginForm.email.trim(), password: loginForm.password });
      toast.success('Welcome back.');
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in.');
      if (Array.isArray(err.details)) {
        setFieldErrors(
          Object.fromEntries(
            err.details.filter((detail) => detail.field).map((detail) => [detail.field, detail.message]),
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError('');
    if (!validateRegister()) return;
    setSubmitting(true);
    try {
      await register({
        name: registerForm.name.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
      });
      toast.success('Account created. Welcome to QuickBite.');
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create your account.');
      if (Array.isArray(err.details)) {
        setFieldErrors(
          Object.fromEntries(
            err.details.filter((detail) => detail.field).map((detail) => [detail.field, detail.message]),
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (field) => `field pl-11 ${fieldErrors[field] ? '!border-red-300' : ''}`;

  return (
    <div className="page-shell py-8 sm:py-12">
      <div className="grid overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[var(--shadow-soft)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative hidden overflow-hidden bg-ink-950 p-10 text-white lg:flex lg:flex-col">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/80">
              <Sparkles size={12} /> QuickBite
            </span>
            <h1 className="mt-8 font-display text-4xl font-bold leading-tight">
              Your next good meal
              <br />
              is a few clicks away.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
              Sign in to keep a persistent cart, save delivery addresses, and follow every order
              from the kitchen to your door.
            </p>
          </div>

          <div className="relative mt-10 space-y-4">
            {[
              {
                icon: UtensilsCrossed,
                title: 'One cart, one kitchen',
                text: 'Clear prompts before switching restaurants — no accidental cart mix-ups.',
              },
              {
                icon: Bike,
                title: 'Watch it move',
                text: 'A visible six-step delivery lifecycle with a Cassandra event timeline.',
              },
              {
                icon: BadgeCheck,
                title: 'Honest checkout',
                text: 'Server-validated prices, availability, and delivery addresses.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-300">
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-white/55">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative mt-auto rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/50">
              Local demo account
            </p>
            <p className="mt-1.5 font-mono text-xs text-white/90">{DEMO.email}</p>
            <p className="font-mono text-xs text-white/90">{DEMO.password}</p>
            <p className="mt-2 text-[10px] leading-4 text-white/40">
              Demo credentials are stored only in your local development environment.
            </p>
          </div>
        </aside>

        <div className="p-6 sm:p-10">
          <div className="mx-auto max-w-md">
            <div className="flex items-center gap-2.5 lg:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
                <UtensilsCrossed size={17} />
              </span>
              <span className="font-display text-xl font-bold text-ink-950">
                Quick<span className="text-brand-600">Bite</span>
              </span>
            </div>

            <div className="mt-6 flex rounded-full bg-cream-200/80 p-1 lg:mt-0" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => switchMode('login')}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-extrabold transition ${
                  mode === 'login' ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => switchMode('register')}
                className={`flex-1 rounded-full px-4 py-2.5 text-sm font-extrabold transition ${
                  mode === 'register' ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                Create account
              </button>
            </div>

            <h2 className="mt-7 font-display text-3xl font-bold text-ink-950">
              {mode === 'login' ? 'Welcome back' : 'Join QuickBite'}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-ink-500">
              {mode === 'login'
                ? 'Sign in to see your cart, addresses, and order history.'
                : 'A name and email are all you need. You can add a phone number later.'}
            </p>

            {error ? (
              <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : null}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="mt-6 space-y-4" noValidate>
                <div>
                  <label className="field-label" htmlFor="login-email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                    <input
                      id="login-email"
                      type="email"
                      className={inputClass('email')}
                      placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={(event) => {
                        setLoginForm((current) => ({ ...current, email: event.target.value }));
                        setFieldErrors((current) => ({ ...current, email: undefined }));
                      }}
                      autoComplete="email"
                    />
                  </div>
                  {fieldErrors.email ? (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.email}</p>
                  ) : null}
                </div>

                <div>
                  <label className="field-label" htmlFor="login-password">
                    Password
                  </label>
                  <div className="relative">
                    <LockKeyhole size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className={`${inputClass('password')} !pr-11`}
                      placeholder="Your password"
                      value={loginForm.password}
                      onChange={(event) => {
                        setLoginForm((current) => ({ ...current, password: event.target.value }));
                        setFieldErrors((current) => ({ ...current, password: undefined }));
                      }}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-500 transition hover:bg-stone-100"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.password}</p>
                  ) : null}
                </div>

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? <Spinner className="h-4 w-4" /> : null}
                  {submitting ? 'Signing in…' : 'Sign in'}
                  {!submitting ? <ArrowRight size={16} /> : null}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoginForm({ ...DEMO });
                    setFieldErrors({});
                    setError('');
                  }}
                  className="w-full rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 px-4 py-3 text-xs font-bold text-brand-800 transition hover:bg-brand-50"
                >
                  Fill demo credentials
                  <span className="ml-2 font-mono font-medium text-brand-600">{DEMO.email}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="mt-6 space-y-4" noValidate>
                <div>
                  <label className="field-label" htmlFor="register-name">
                    Full name
                  </label>
                  <div className="relative">
                    <UserRound size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                    <input
                      id="register-name"
                      className={inputClass('name')}
                      placeholder="Ada Lovelace"
                      value={registerForm.name}
                      onChange={(event) => {
                        setRegisterForm((current) => ({ ...current, name: event.target.value }));
                        setFieldErrors((current) => ({ ...current, name: undefined }));
                      }}
                      autoComplete="name"
                    />
                  </div>
                  {fieldErrors.name ? (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.name}</p>
                  ) : null}
                </div>

                <div>
                  <label className="field-label" htmlFor="register-email">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                    <input
                      id="register-email"
                      type="email"
                      className={inputClass('email')}
                      placeholder="you@example.com"
                      value={registerForm.email}
                      onChange={(event) => {
                        setRegisterForm((current) => ({ ...current, email: event.target.value }));
                        setFieldErrors((current) => ({ ...current, email: undefined }));
                      }}
                      autoComplete="email"
                    />
                  </div>
                  {fieldErrors.email ? (
                    <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.email}</p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="register-password">
                      Password
                    </label>
                    <div className="relative">
                      <LockKeyhole size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                      <input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        className={`${inputClass('password')} !pr-11`}
                        placeholder="At least 6 chars"
                        value={registerForm.password}
                        onChange={(event) => {
                          setRegisterForm((current) => ({ ...current, password: event.target.value }));
                          setFieldErrors((current) => ({ ...current, password: undefined }));
                        }}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-500 transition hover:bg-stone-100"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {fieldErrors.password ? (
                      <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.password}</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="field-label" htmlFor="register-confirm">
                      Confirm password
                    </label>
                    <div className="relative">
                      <LockKeyhole size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
                      <input
                        id="register-confirm"
                        type={showPassword ? 'text' : 'password'}
                        className={inputClass('confirmPassword')}
                        placeholder="Repeat password"
                        value={registerForm.confirmPassword}
                        onChange={(event) => {
                          setRegisterForm((current) => ({ ...current, confirmPassword: event.target.value }));
                          setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
                        }}
                        autoComplete="new-password"
                      />
                    </div>
                    {fieldErrors.confirmPassword ? (
                      <p className="mt-1.5 text-xs font-semibold text-red-600">
                        {fieldErrors.confirmPassword}
                      </p>
                    ) : null}
                  </div>
                </div>

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? <Spinner className="h-4 w-4" /> : null}
                  {submitting ? 'Creating account…' : 'Create account'}
                  {!submitting ? <ArrowRight size={16} /> : null}
                </button>
                <p className="text-center text-[11px] leading-5 text-ink-500">
                  By creating an account you agree to this local demo storing your cart, addresses,
                  and order history in the lab databases.
                </p>
              </form>
            )}

            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-cream-100 px-4 py-3 text-[11px] leading-5 text-ink-500 lg:hidden">
              <BadgeCheck size={15} className="shrink-0 text-brand-500" />
              Demo login: <span className="font-mono font-bold text-ink-800">{DEMO.email}</span> /{' '}
              <span className="font-mono font-bold text-ink-800">{DEMO.password}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
