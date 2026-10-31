import {
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress,
} from '../services/address.service.js';

export async function getAddresses(req, res) {
  const addresses = await listAddresses(req.customer._id);
  res.json({ data: { addresses } });
}

export async function postAddress(req, res) {
  const address = await createAddress(req.customer._id, req.body);
  res.status(201).json({ data: { address } });
}

export async function patchAddress(req, res) {
  const address = await updateAddress(req.customer._id, req.params.id, req.body);
  res.json({ data: { address } });
}

export async function removeAddress(req, res) {
  await deleteAddress(req.customer._id, req.params.id);
  res.json({ data: { message: 'Address deleted.' } });
}
