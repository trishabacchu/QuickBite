import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api, ApiError } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

const EMPTY_CART = {
  items: [],
  restaurant: null,
  itemCount: 0,
  subtotalPaise: 0,
  deliveryFeePaise: 0,
  totalPaise: 0,
  canCheckout: false,
  blockingReasons: [],
  updatedAt: null,
};

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [restaurantConflict, setRestaurantConflict] = useState(null);
  const requestVersion = useRef(0);

  const refreshCart = useCallback(
    async ({ silent = false } = {}) => {
      if (!user) {
        setCart(null);
        return null;
      }
      const version = ++requestVersion.current;
      if (!silent) setLoading(true);
      setError('');
      try {
        const data = await api.get('/cart');
        if (version === requestVersion.current) setCart(data.cart);
        return data.cart;
      } catch (err) {
        if (version === requestVersion.current) {
          setError(err.message || 'Could not load your cart.');
        }
        return null;
      } finally {
        if (version === requestVersion.current && !silent) setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (user) {
      void refreshCart();
    } else {
      requestVersion.current += 1;
      setCart(null);
      setRestaurantConflict(null);
      setLoading(false);
    }
  }, [user, refreshCart]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setCart(null);
      setRestaurantConflict(null);
    };
    window.addEventListener('quickbite:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('quickbite:unauthorized', handleUnauthorized);
  }, []);

  const addItem = useCallback(
    async (foodItemId, quantity = 1, { replaceCart = false } = {}) => {
      try {
        const data = await api.post('/cart/items', { foodItemId, quantity, replaceCart });
        setCart(data.cart);
        setRestaurantConflict(null);
        return { cart: data.cart, conflict: false };
      } catch (err) {
        if (err instanceof ApiError && err.code === 'CART_RESTAURANT_CONFLICT') {
          setRestaurantConflict({
            ...(err.details?.[0] || {}),
            foodItemId,
            quantity,
            message: err.message,
          });
          return { conflict: true };
        }
        throw err;
      }
    },
    [],
  );

  const confirmRestaurantSwitch = useCallback(async () => {
    if (!restaurantConflict) return null;
    const data = await api.post('/cart/items', {
      foodItemId: restaurantConflict.foodItemId,
      quantity: restaurantConflict.quantity,
      replaceCart: true,
    });
    setCart(data.cart);
    setRestaurantConflict(null);
    return data.cart;
  }, [restaurantConflict]);

  const dismissRestaurantConflict = useCallback(() => setRestaurantConflict(null), []);

  const updateQuantity = useCallback(async (foodItemId, quantity) => {
    const data = await api.patch(`/cart/items/${foodItemId}`, { quantity });
    setCart(data.cart);
    return data.cart;
  }, []);

  const removeItem = useCallback(async (foodItemId) => {
    const data = await api.delete(`/cart/items/${foodItemId}`);
    setCart(data.cart);
    return data.cart;
  }, []);

  const clearCart = useCallback(async () => {
    const data = await api.delete('/cart');
    setCart(data.cart);
    return data.cart;
  }, []);

  const value = useMemo(
    () => ({
      cart: cart || (user ? null : EMPTY_CART),
      loading,
      error,
      restaurantConflict,
      refreshCart,
      addItem,
      confirmRestaurantSwitch,
      dismissRestaurantConflict,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      cart,
      user,
      loading,
      error,
      restaurantConflict,
      refreshCart,
      addItem,
      confirmRestaurantSwitch,
      dismissRestaurantConflict,
      updateQuantity,
      removeItem,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
