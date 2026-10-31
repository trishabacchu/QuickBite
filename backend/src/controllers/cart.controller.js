import {
  addItem,
  changeItemQuantity,
  emptyCart,
  getCartResponse,
  removeItem,
} from '../services/cart.service.js';

export async function getCart(req, res) {
  const cart = await getCartResponse(req.customer._id);
  res.json({ data: { cart } });
}

export async function addCartItem(req, res) {
  const cart = await addItem(req.customer._id, req.body);
  res.json({ data: { cart } });
}

export async function updateCartItem(req, res) {
  const cart = await changeItemQuantity(
    req.customer._id,
    req.params.itemId,
    req.body.quantity,
  );
  res.json({ data: { cart } });
}

export async function deleteCartItem(req, res) {
  const cart = await removeItem(req.customer._id, req.params.itemId);
  res.json({ data: { cart } });
}

export async function clearCart(req, res) {
  const cart = await emptyCart(req.customer._id);
  res.json({ data: { cart } });
}
