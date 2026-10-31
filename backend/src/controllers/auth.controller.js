import {
  authenticateCustomer,
  changeCustomerPassword,
  clearAuthCookie,
  registerCustomer,
  setAuthCookie,
  signAuthToken,
  updateCustomerProfile,
} from '../services/auth.service.js';
import { serializeCustomer } from '../utils/serializers.js';

export async function register(req, res) {
  const customer = await registerCustomer(req.body);
  setAuthCookie(res, signAuthToken(customer));
  res.status(201).json({ data: { customer: serializeCustomer(customer) } });
}

export async function login(req, res) {
  const customer = await authenticateCustomer(req.body);
  setAuthCookie(res, signAuthToken(customer));
  res.json({ data: { customer: serializeCustomer(customer) } });
}

export async function logout(_req, res) {
  clearAuthCookie(res);
  res.json({ data: { message: 'Signed out.' } });
}

export async function me(req, res) {
  res.json({ data: { customer: serializeCustomer(req.customer) } });
}

export async function getProfile(req, res) {
  res.json({ data: { customer: serializeCustomer(req.customer) } });
}

export async function updateProfile(req, res) {
  const customer = await updateCustomerProfile(req.customer._id, req.body);
  res.json({ data: { customer: serializeCustomer(customer) } });
}

export async function changePassword(req, res) {
  await changeCustomerPassword(req.customer._id, req.body);
  // Password changes increment tokenVersion and clear this login cookie, so
  // every previous session must sign in again.
  clearAuthCookie(res);
  res.json({ data: { message: 'Password changed. Please sign in again.' } });
}
