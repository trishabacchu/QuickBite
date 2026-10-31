import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

/**
 * Shared add-to-cart flow: guests are sent to sign in, restaurant conflicts
 * open the global confirmation dialog, and every failure surfaces a toast.
 */
export function useAddToCart() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [addingId, setAddingId] = useState(null);

  const addToCart = useCallback(
    async (food, quantity = 1) => {
      if (!user) {
        toast.info('Sign in to start your cart.');
        navigate('/auth', { state: { from: location } });
        return false;
      }

      setAddingId(food.id);
      try {
        const result = await addItem(food.id, quantity);
        if (result?.conflict) {
          toast.info('This item is from another restaurant. Confirm whether to replace your cart.');
          return false;
        }
        toast.success(`${food.name} added to your cart.`);
        return true;
      } catch (error) {
        toast.error(error.message || 'Could not add that item.');
        return false;
      } finally {
        setAddingId(null);
      }
    },
    [addItem, location, navigate, toast, user],
  );

  return { addingId, addToCart };
}
