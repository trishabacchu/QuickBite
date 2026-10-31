import { useState } from 'react';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';

export function CartConflictModal() {
  const { restaurantConflict, confirmRestaurantSwitch, dismissRestaurantConflict } = useCart();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const open = Boolean(restaurantConflict);
  const current = restaurantConflict?.currentRestaurantName || 'another restaurant';
  const requested = restaurantConflict?.requestedRestaurantName || 'this restaurant';

  async function handleConfirm() {
    setBusy(true);
    try {
      await confirmRestaurantSwitch();
      toast.success(`Cart replaced with items from ${requested}.`);
    } catch (error) {
      toast.error(error.message || 'Could not replace the cart. Please try again.');
      dismissRestaurantConflict();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title="Replace your cart?"
      message={`Your cart currently has dishes from ${current}. Adding an item from ${requested} will clear that cart and start a new one. This cannot be undone.`}
      confirmLabel="Replace cart"
      cancelLabel="Keep current cart"
      onConfirm={handleConfirm}
      onCancel={dismissRestaurantConflict}
      busy={busy}
      danger={false}
    />
  );
}
