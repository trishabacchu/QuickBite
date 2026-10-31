import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Info,
  ShoppingBag,
  Store,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { EmptyState, ErrorState, PageLoader } from '../components/Feedback.jsx';
import { QuantityStepper } from '../components/QuantityStepper.jsx';
import { SmartImage } from '../components/SmartImage.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { formatCurrency } from '../utils/format.js';

export function Cart() {
  usePageTitle('Your cart');
  const { cart, loading, error, refreshCart, updateQuantity, removeItem, clearCart } = useCart();
  const toast = useToast();
  const [busyItem, setBusyItem] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  async function changeQuantity(foodItemId, quantity) {
    setBusyItem(foodItemId);
    try {
      await updateQuantity(foodItemId, quantity);
    } catch (err) {
      toast.error(err.message || 'Could not update that quantity.');
      void refreshCart({ silent: true });
    } finally {
      setBusyItem(null);
    }
  }

  async function handleRemove(foodItemId) {
    setBusyItem(foodItemId);
    try {
      await removeItem(foodItemId);
      toast.success('Item removed from your cart.');
    } catch (err) {
      toast.error(err.message || 'Could not remove that item.');
    } finally {
      setBusyItem(null);
    }
  }

  async function handleClear() {
    setClearing(true);
    try {
      await clearCart();
      toast.success('Cart cleared.');
      setConfirmClear(false);
    } catch (err) {
      toast.error(err.message || 'Could not clear the cart.');
    } finally {
      setClearing(false);
    }
  }

  if (loading && !cart) {
    return (
      <div className="page-shell py-10">
        <PageLoader label="Fetching your cart…" />
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="page-shell py-10">
        <ErrorState title="Your cart did not load" message={error} onRetry={() => void refreshCart()} />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="page-shell py-10">
        <h1 className="font-display text-4xl font-bold text-ink-950">Your cart</h1>
        <p className="mt-1.5 text-sm text-ink-500">A little planning goes a long way.</p>
        <div className="mt-7">
          <EmptyState
            icon={ShoppingBag}
            title="Your cart is empty"
            description="Find a kitchen you like, add a dish or two, and your cart will be waiting here when you come back."
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

  const restaurant = cart.restaurant;
  const blocked = !cart.canCheckout;

  return (
    <div className="page-shell py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Almost there</p>
          <h1 className="mt-1 font-display text-4xl font-bold text-ink-950">Your cart</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} · from{' '}
            {restaurant ? restaurant.name : 'one kitchen'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/" className="btn-secondary !px-4 !py-2.5">
            <ArrowLeft size={15} /> Keep browsing
          </Link>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="btn-ghost !text-red-600 hover:!bg-red-50"
          >
            <Trash2 size={15} /> Clear cart
          </button>
        </div>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {restaurant ? (
            <div className="surface flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <Link
                to={`/restaurants/${restaurant.id}`}
                className="flex items-center gap-3 font-bold text-ink-950 hover:text-brand-700"
              >
                <SmartImage
                  src={restaurant.imageUrl}
                  alt={restaurant.name}
                  className="h-11 w-11 rounded-xl"
                />
                <span>
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-ink-500">
                    Ordering from
                  </span>
                  {restaurant.name}
                  <span className="ml-2 text-[11px] font-semibold text-ink-500">
                    {restaurant.cuisine}
                  </span>
                </span>
              </Link>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 text-ink-700">
                  <Bike size={14} className="text-brand-500" />
                  {formatCurrency(restaurant.deliveryFeePaise)} delivery
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                    restaurant.isOpen
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      restaurant.isOpen ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  {restaurant.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>
          ) : null}

          {cart.blockingReasons.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="flex items-start gap-2 text-sm font-extrabold text-amber-900">
                <Info size={17} className="mt-0.5 shrink-0" /> Checkout is paused
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-900">
                {cart.blockingReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {!restaurant?.isOpen ? (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  Your cart is kept while the kitchen is closed. Come back during opening hours.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            {cart.items.map((item) => (
              <div
                key={item.foodItemId}
                className={`surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${
                  !item.isAvailable ? 'border-red-200' : ''
                }`}
              >
                <SmartImage
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-24 w-full shrink-0 rounded-2xl sm:h-20 sm:w-20"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/food/${item.foodItemId}`}
                        className="font-bold text-ink-950 hover:text-brand-700"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-xs font-semibold text-ink-500">
                        {formatCurrency(item.pricePaise)} each · {item.category}
                      </p>
                    </div>
                    <p className="font-extrabold text-ink-950">
                      {formatCurrency(item.lineTotalPaise)}
                    </p>
                  </div>

                  {!item.isAvailable ? (
                    <p className="mt-2 inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-red-700">
                      Unavailable — remove to continue
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <QuantityStepper
                        value={item.quantity}
                        onChange={(quantity) => changeQuantity(item.foodItemId, quantity)}
                        min={1}
                        max={10}
                        size="sm"
                        disabled={busyItem === item.foodItemId}
                        label={`Quantity for ${item.name}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemove(item.foodItemId)}
                        disabled={busyItem === item.foodItemId}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-ink-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  )}

                  {!item.isAvailable ? (
                    <button
                      type="button"
                      onClick={() => handleRemove(item.foodItemId)}
                      disabled={busyItem === item.foodItemId}
                      className="mt-3 inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-40"
                    >
                      <Trash2 size={13} /> Remove unavailable item
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-black/5 bg-white/60 px-5 py-4 text-xs leading-5 text-ink-500">
            <p className="inline-flex items-center gap-1.5 font-bold text-ink-700">
              <Store size={14} className="text-brand-500" /> One restaurant per checkout
            </p>
            <p className="mt-1">
              Prices shown are the current menu prices. They are checked again on the server when
              you place the order.
            </p>
          </div>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="surface p-6">
            <h2 className="font-display text-2xl font-bold text-ink-950">Order summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
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

            <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-cream-100 px-4 py-3 text-xs leading-5 text-ink-700">
              <Wallet size={16} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                <strong className="font-extrabold">Cash on Delivery.</strong> Payment is a separate
                status from delivery and stays pending in this demo.
              </span>
            </div>

            {blocked ? (
              <>
                <button type="button" disabled className="btn-primary mt-5 w-full">
                  Proceed to checkout <ArrowRight size={16} />
                </button>
                <p className="mt-2 text-center text-[11px] font-semibold text-amber-700">
                  Resolve the items above to continue.
                </p>
              </>
            ) : (
              <Link to="/checkout" className="btn-primary mt-5 w-full">
                Proceed to checkout <ArrowRight size={16} />
              </Link>
            )}

            <p className="mt-3 text-center text-[11px] text-ink-500">
              You&apos;ll review your address before placing the order.
            </p>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear your cart?"
        message="Every item will be removed. You can always rebuild it from the menu."
        confirmLabel="Clear cart"
        cancelLabel="Keep items"
        onConfirm={handleClear}
        onCancel={() => setConfirmClear(false)}
        busy={clearing}
        danger
      />
    </div>
  );
}
