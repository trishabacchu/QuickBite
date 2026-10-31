import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  LockKeyhole,
  MapPin,
  Plus,
  Store,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AddressForm } from '../components/AddressForm.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { EmptyState, ErrorState, PageLoader, Spinner } from '../components/Feedback.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../services/api.js';
import { formatCurrency } from '../utils/format.js';

const BLANK_ADDRESS = { label: '', line1: '', city: '', state: '', postalCode: '' };

export function Checkout() {
  usePageTitle('Checkout');
  const navigate = useNavigate();
  const toast = useToast();
  const { cart, loading: cartLoading, refreshCart } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressError, setAddressError] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [problemDetails, setProblemDetails] = useState([]);
  const [confirmLeaveCart, setConfirmLeaveCart] = useState(false);

  const loadAddresses = useCallback(async (signal) => {
    setAddressLoading(true);
    setAddressError('');
    try {
      const data = await api.get('/addresses', { signal });
      setAddresses(data.addresses);
      setSelectedId((current) => {
        if (data.addresses.some((address) => address.id === current)) return current;
        return data.addresses[0]?.id || '';
      });
      if (data.addresses.length === 0) setShowForm(true);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setAddressError(error.message || 'Could not load your saved addresses.');
      }
    } finally {
      if (!signal?.aborted) setAddressLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadAddresses(controller.signal);
    return () => controller.abort();
  }, [loadAddresses]);

  async function createAddress(values) {
    setSavingAddress(true);
    try {
      const data = await api.post('/addresses', values);
      setAddresses((current) => [...current, data.address]);
      setSelectedId(data.address.id);
      setShowForm(false);
      toast.success('Delivery address saved.');
    } catch (error) {
      toast.error(error.message || 'Could not save that address.');
    } finally {
      setSavingAddress(false);
    }
  }

  async function placeOrder() {
    if (!selectedId || placing) return;
    setPlacing(true);
    setOrderError('');
    setProblemDetails([]);
    try {
      const data = await api.post('/orders', {
        addressId: selectedId,
        paymentMethod: 'COD',
      });
      await refreshCart({ silent: true });
      toast.success(`Order ${data.order.orderNumber} placed.`);
      navigate(`/orders/${data.order.id}`, { replace: true, state: { justPlaced: true } });
    } catch (error) {
      setOrderError(error.message || 'Could not place the order.');
      setProblemDetails(Array.isArray(error.details) ? error.details : []);
      toast.error(error.message || 'Could not place the order.');
      void refreshCart({ silent: true });
    } finally {
      setPlacing(false);
    }
  }

  if (cartLoading && !cart) {
    return (
      <div className="page-shell py-10">
        <PageLoader label="Preparing checkout…" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="page-shell py-10">
        <h1 className="font-display text-4xl font-bold text-ink-950">Checkout</h1>
        <div className="mt-7">
          <EmptyState
            title="There is nothing to check out"
            description="Your cart is empty. Add a dish from one of the kitchens before reviewing your delivery address."
            action={
              <Link to="/" className="btn-primary">
                Browse restaurants <ArrowRight size={16} />
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  if (!cart.canCheckout) {
    return (
      <div className="page-shell py-10">
        <Link to="/cart" className="btn-ghost -ml-2 mb-4">
          <ArrowLeft size={16} /> Back to cart
        </Link>
        <div className="surface max-w-2xl p-7">
          <p className="eyebrow">Before checkout</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink-950">
            Your cart needs a quick fix
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            The order can&apos;t be placed while these issues remain. Your cart has been kept.
          </p>
          <ul className="mt-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-900">
            {cart.blockingReasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
          <Link to="/cart" className="btn-primary mt-5">
            Review cart <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell py-8">
      <Link to="/cart" className="btn-ghost -ml-2 mb-4">
        <ArrowLeft size={16} /> Back to cart
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Final step</p>
          <h1 className="mt-1 font-display text-4xl font-bold text-ink-950">Checkout</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Review where this order is going. The server will re-price and re-check every dish
            before creating it.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <LockKeyhole size={13} /> Powered by your saved address
        </span>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-950">Delivery address</h2>
                <p className="mt-1 text-sm text-ink-500">
                  Pick from your saved addresses or add a new one.
                </p>
              </div>
              {!showForm ? (
                <button type="button" className="btn-secondary !px-4 !py-2.5" onClick={() => setShowForm(true)}>
                  <Plus size={15} /> Add address
                </button>
              ) : null}
            </div>

            {addressLoading ? (
              <div className="mt-6 flex items-center gap-3 py-6 text-sm font-semibold text-ink-500">
                <Spinner className="h-5 w-5 text-brand-500" /> Loading saved addresses…
              </div>
            ) : addressError ? (
              <div className="mt-5">
                <ErrorState
                  title="Addresses did not load"
                  message={addressError}
                  onRetry={() => void loadAddresses()}
                />
              </div>
            ) : (
              <>
                {addresses.length > 0 ? (
                  <div className="mt-5 grid gap-3">
                    {addresses.map((address) => {
                      const selected = address.id === selectedId;
                      return (
                        <label
                          key={address.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3.5 transition ${
                            selected
                              ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-100'
                              : 'border-black/10 bg-white hover:border-brand-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="delivery-address"
                            value={address.id}
                            checked={selected}
                            onChange={() => setSelectedId(address.id)}
                            className="mt-1 h-4 w-4 accent-brand-500"
                          />
                          <span className="flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-sm font-extrabold text-ink-950">
                                <MapPin size={14} className="text-brand-500" />
                                {address.label || 'Saved address'}
                              </span>
                              {selected ? (
                                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-brand-700">
                                  Selected
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-1 block text-sm leading-5 text-ink-500">
                              {address.line1}, {address.city}, {address.state} {address.postalCode}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl bg-cream-100 px-4 py-3 text-sm font-semibold text-ink-700">
                    No saved addresses yet. Add one below to continue.
                  </p>
                )}
              </>
            )}

            {showForm ? (
              <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/40 p-5">
                <h3 className="font-bold text-ink-950">
                  {addresses.length > 0 ? 'Add another address' : 'Add your delivery address'}
                </h3>
                <p className="mt-1 text-xs text-ink-500">
                  Saved addresses are reusable. The order keeps its own copy at checkout.
                </p>
                <div className="mt-4">
                  <AddressForm
                    initial={BLANK_ADDRESS}
                    onSubmit={createAddress}
                    onCancel={
                      addresses.length > 0
                        ? () => setShowForm(false)
                        : undefined
                    }
                    busy={savingAddress}
                    submitLabel="Save and use"
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className="surface p-6">
            <h2 className="font-display text-2xl font-bold text-ink-950">Payment</h2>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600">
                <Wallet size={19} />
              </span>
              <div>
                <p className="font-extrabold text-ink-950">Cash on Delivery</p>
                <p className="mt-0.5 text-sm leading-5 text-ink-500">
                  Pay the delivery partner when your food arrives. Payment status is tracked
                  separately from the delivery lifecycle and remains pending in this demo.
                </p>
              </div>
              <BadgeCheck size={19} className="ml-auto shrink-0 text-emerald-600" />
            </div>
          </section>

          {orderError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
              <p className="text-sm font-extrabold text-red-800">The order was not placed</p>
              <p className="mt-1 text-sm leading-5 text-red-700">{orderError}</p>
              {problemDetails.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs font-semibold text-red-700">
                  {problemDetails.map((problem, index) => (
                    <li key={`${problem.foodItemId || problem.name}-${index}`}>
                      {problem.name || 'Item'}: {problem.reason || 'No longer available'}
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link to="/cart" className="mt-3 inline-flex text-xs font-extrabold text-red-800 underline">
                Review your cart
              </Link>
            </div>
          ) : null}
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="surface p-6">
            <div className="flex items-center gap-2.5">
              <Store size={17} className="text-brand-500" />
              <h2 className="font-display text-2xl font-bold text-ink-950">Your order</h2>
            </div>
            <p className="mt-1 text-xs font-semibold text-ink-500">{cart.restaurant?.name}</p>

            <ul className="mt-4 space-y-2.5 text-sm">
              {cart.items.map((item) => (
                <li key={item.foodItemId} className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-ink-700">
                    <span className="font-extrabold text-ink-950">{item.quantity}×</span>{' '}
                    <span className="line-clamp-2">{item.name}</span>
                  </span>
                  <span className="shrink-0 font-bold text-ink-900">
                    {formatCurrency(item.lineTotalPaise)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 h-px bg-black/5" />
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="font-bold text-ink-950">{formatCurrency(cart.subtotalPaise)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-500">Delivery fee</dt>
                <dd className="font-bold text-ink-950">{formatCurrency(cart.deliveryFeePaise)}</dd>
              </div>
              <div className="h-px bg-black/5" />
              <div className="flex items-center justify-between text-base">
                <dt className="font-extrabold text-ink-950">Total</dt>
                <dd className="font-display text-2xl font-bold text-brand-700">
                  {formatCurrency(cart.totalPaise)}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={placeOrder}
              disabled={!selectedId || placing}
              className="btn-primary mt-5 w-full"
            >
              {placing ? <Spinner className="h-4 w-4" /> : null}
              {placing ? 'Placing order…' : 'Place order'}
            </button>
            {!selectedId ? (
              <p className="mt-2 text-center text-[11px] font-semibold text-amber-700">
                Select or add a delivery address to continue.
              </p>
            ) : (
              <p className="mt-2 text-center text-[11px] text-ink-500">
                No card needed. You&apos;ll pay cash on delivery.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setConfirmLeaveCart(true)}
            className="mt-3 w-full text-center text-xs font-semibold text-ink-500 underline-offset-2 hover:text-ink-900 hover:underline"
          >
            I want to change my cart
          </button>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmLeaveCart}
        title="Go back to your cart?"
        message="Your cart is already saved. You can edit quantities or remove dishes before coming back to checkout."
        confirmLabel="Edit cart"
        cancelLabel="Stay here"
        onConfirm={() => navigate('/cart')}
        onCancel={() => setConfirmLeaveCart(false)}
        danger={false}
      />
    </div>
  );
}
