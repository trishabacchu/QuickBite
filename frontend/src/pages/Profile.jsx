import {
  CalendarDays,
  ClipboardList,
  KeyRound,
  Mail,
  MapPinned,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageLoader, Spinner } from '../components/Feedback.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { formatDate, initials } from '../utils/format.js';

export function Profile() {
  usePageTitle('Your profile');
  const { user, updateProfile, changePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [details, setDetails] = useState({ name: '', phone: '' });
  const [detailsError, setDetailsError] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setDetails({ name: user.name, phone: user.phone || '' });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="page-shell py-10">
        <PageLoader label="Loading your profile…" />
      </div>
    );
  }

  async function saveDetails(event) {
    event.preventDefault();
    setDetailsError('');
    if (details.name.trim().length < 2) {
      setDetailsError('Enter a name with at least 2 characters.');
      return;
    }
    if (
      details.phone.trim() &&
      !/^\+?[0-9 ()-]{7,20}$/.test(details.phone.trim())
    ) {
      setDetailsError('Enter a valid phone number, or leave it blank.');
      return;
    }
    setSavingDetails(true);
    try {
      await updateProfile({
        name: details.name.trim(),
        phone: details.phone.trim(),
      });
      toast.success('Profile updated.');
    } catch (error) {
      setDetailsError(error.message || 'Could not update your profile.');
    } finally {
      setSavingDetails(false);
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    setPasswordError('');
    if (!passwords.currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (passwords.newPassword.length < 6) {
      setPasswordError('Your new password must be at least 6 characters.');
      return;
    }
    if (passwords.newPassword.length > 72) {
      setPasswordError('Your new password must be 72 characters or fewer.');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password changed. Please sign in again.');
      navigate('/auth', { replace: true });
    } catch (error) {
      setPasswordError(error.message || 'Could not change your password.');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <div className="page-shell py-8">
      <p className="eyebrow">Your account</p>
      <h1 className="mt-1 font-display text-4xl font-bold text-ink-950">Profile</h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Keep your contact details current. Your email and order history stay tied to this account.
      </p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="surface p-6 text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-brand-200 font-display text-2xl font-bold text-brand-700">
              {initials(user.name)}
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink-950">{user.name}</h2>
            <p className="mt-1 text-sm text-ink-500">{user.email}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1.5 text-[11px] font-bold text-ink-700">
              <CalendarDays size={13} className="text-brand-500" /> Member since{' '}
              {formatDate(user.createdAt, { withTime: false })}
            </div>
          </div>

          <div className="surface p-3">
            <Link
              to="/orders"
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <ClipboardList size={17} />
              </span>
              My orders
            </Link>
            <Link
              to="/addresses"
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <MapPinned size={17} />
              </span>
              Saved addresses
            </Link>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white/60 p-4 text-xs leading-5 text-ink-500">
            <p className="inline-flex items-center gap-1.5 font-bold text-ink-700">
              <ShieldCheck size={14} className="text-brand-500" /> Session security
            </p>
            <p className="mt-1.5">
              You are signed in with an HttpOnly cookie. Changing your password signs out every
              existing session, including this one.
            </p>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="surface p-6">
            <h2 className="font-display text-2xl font-bold text-ink-950">Contact details</h2>
            <p className="mt-1 text-sm text-ink-500">These details are used only in this demo.</p>

            <form onSubmit={saveDetails} className="mt-5 space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="profile-name">
                    Full name
                  </label>
                  <div className="relative">
                    <UserRound
                      size={16}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
                    />
                    <input
                      id="profile-name"
                      className="field pl-11"
                      value={details.name}
                      onChange={(event) => setDetails((current) => ({ ...current, name: event.target.value }))}
                      autoComplete="name"
                    />
                  </div>
                </div>
                <div>
                  <label className="field-label" htmlFor="profile-phone">
                    Phone <span className="font-semibold normal-case tracking-normal text-ink-500">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
                    />
                    <input
                      id="profile-phone"
                      className="field pl-11"
                      value={details.phone}
                      onChange={(event) => setDetails((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="9876543210"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="field-label" htmlFor="profile-email">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
                  />
                  <input
                    id="profile-email"
                    className="field cursor-not-allowed bg-stone-50 pl-11 text-ink-500"
                    value={user.email}
                    readOnly
                    disabled
                  />
                </div>
                <p className="mt-1.5 text-xs text-ink-500">
                  Email changes aren&apos;t supported in this demo. Register a new account to use a
                  different address.
                </p>
              </div>

              {detailsError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {detailsError}
                </div>
              ) : null}

              <button type="submit" className="btn-primary" disabled={savingDetails}>
                {savingDetails ? <Spinner className="h-4 w-4" /> : <Save size={16} />}
                {savingDetails ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </section>

          <section className="surface p-6">
            <h2 className="font-display text-2xl font-bold text-ink-950">Change password</h2>
            <p className="mt-1 text-sm text-ink-500">
              After changing your password you will be signed out and asked to sign in again.
            </p>

            <form onSubmit={submitPassword} className="mt-5 space-y-4" noValidate>
              <div>
                <label className="field-label" htmlFor="current-password">
                  Current password
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500"
                  />
                  <input
                    id="current-password"
                    type="password"
                    className="field pl-11"
                    value={passwords.currentPassword}
                    onChange={(event) =>
                      setPasswords((current) => ({ ...current, currentPassword: event.target.value }))
                    }
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="new-password">
                    New password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    className="field"
                    value={passwords.newPassword}
                    onChange={(event) =>
                      setPasswords((current) => ({ ...current, newPassword: event.target.value }))
                    }
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="confirm-password">
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    className="field"
                    value={passwords.confirmPassword}
                    onChange={(event) =>
                      setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>

              {passwordError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {passwordError}
                </div>
              ) : null}

              <button type="submit" className="btn-secondary" disabled={changingPassword}>
                {changingPassword ? <Spinner className="h-4 w-4" /> : <KeyRound size={16} />}
                {changingPassword ? 'Updating…' : 'Change password'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
