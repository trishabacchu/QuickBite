import { Address } from '../models/Address.js';
import { ApiError } from '../utils/api-error.js';
import { serializeAddress } from '../utils/serializers.js';

export async function listAddresses(customerId) {
  const addresses = await Address.find({ customerId }).sort({ createdAt: -1 });
  return addresses.map(serializeAddress);
}

export async function createAddress(customerId, input) {
  const address = await Address.create({
    customerId,
    label: input.label || '',
    line1: input.line1,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
  });
  return serializeAddress(address);
}

export async function updateAddress(customerId, addressId, input) {
  const update = {};
  for (const field of ['label', 'line1', 'city', 'state', 'postalCode']) {
    if (input[field] !== undefined) update[field] = input[field];
  }

  const address = await Address.findOneAndUpdate(
    { _id: addressId, customerId },
    { $set: update },
    { new: true, runValidators: true },
  );
  if (!address) throw ApiError.notFound('ADDRESS_NOT_FOUND', 'Address not found.');
  return serializeAddress(address);
}

export async function deleteAddress(customerId, addressId) {
  const address = await Address.findOneAndDelete({ _id: addressId, customerId });
  if (!address) throw ApiError.notFound('ADDRESS_NOT_FOUND', 'Address not found.');
}
