import { Cart } from '../models/Cart.js';
import { FoodItem } from '../models/FoodItem.js';
import { Restaurant } from '../models/Restaurant.js';
import { ApiError } from '../utils/api-error.js';
import { getRestaurantAvailability } from '../utils/time.js';

const MAX_ITEM_QUANTITY = 10;
const CART_RETRY_LIMIT = 6;

function plainItems(cart) {
  return cart.items.map((item) => ({
    foodItemId: item.foodItemId.toString(),
    quantity: item.quantity,
  }));
}

function assertQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
    throw ApiError.badRequest(
      'INVALID_QUANTITY',
      `Quantity must be a whole number from 1 to ${MAX_ITEM_QUANTITY}.`,
    );
  }
}

function assertRestaurantOpen(restaurant) {
  const availability = getRestaurantAvailability(restaurant);
  if (!restaurant.isActive || !availability.isOpen) {
    throw ApiError.conflict(
      'RESTAURANT_CLOSED',
      `${restaurant.name} is currently closed, so items cannot be added or changed.`,
    );
  }
}

async function addToCart(customerId, { foodItemId, quantity, replaceCart }) {
  assertQuantity(quantity);
  const [food, requestedRestaurant] = await Promise.all([
    FoodItem.findById(foodItemId),
    FoodItem.findById(foodItemId).then((item) =>
      item ? Restaurant.findById(item.restaurantId) : null,
    ),
  ]);

  if (!food || !food.isActive) {
    throw ApiError.notFound('FOOD_NOT_FOUND', 'Food item not found.');
  }
  if (!requestedRestaurant || !requestedRestaurant.isActive) {
    throw ApiError.notFound('RESTAURANT_NOT_FOUND', 'Restaurant not found.');
  }
  if (!food.isAvailable) {
    throw ApiError.conflict(
      'FOOD_UNAVAILABLE',
      `${food.name} is currently unavailable and cannot be added to the cart.`,
      [{ foodItemId: food._id.toString(), name: food.name, reason: 'Unavailable' }],
    );
  }
  assertRestaurantOpen(requestedRestaurant);

  for (let attempt = 0; attempt < CART_RETRY_LIMIT; attempt += 1) {
    const cart = await Cart.findOne({ customerId });

    if (!cart) {
      try {
        await Cart.create({
          customerId,
          restaurantId: requestedRestaurant._id,
          items: [{ foodItemId: food._id, quantity }],
        });
        return;
      } catch (error) {
        // Another request created the cart between our read and insert. Retry
        // against the existing unique customer cart instead of creating two.
        if (error.code === 11000) continue;
        throw error;
      }
    }

    const items = plainItems(cart);
    const differentRestaurant =
      cart.restaurantId &&
      cart.restaurantId.toString() !== requestedRestaurant._id.toString() &&
      items.length > 0;

    if (differentRestaurant && !replaceCart) {
      const currentRestaurant = await Restaurant.findById(cart.restaurantId);
      throw ApiError.conflict(
        'CART_RESTAURANT_CONFLICT',
        'Your cart contains food from another restaurant. Confirm before replacing it.',
        [
          {
            currentRestaurantId: cart.restaurantId.toString(),
            currentRestaurantName: currentRestaurant?.name || 'Current restaurant',
            requestedRestaurantId: requestedRestaurant._id.toString(),
            requestedRestaurantName: requestedRestaurant.name,
          },
        ],
      );
    }

    let nextItems;
    let nextRestaurantId;

    if (differentRestaurant) {
      // Explicit switch: the user confirmed replacing the previous cart.
      nextItems = [{ foodItemId: food._id.toString(), quantity }];
      nextRestaurantId = requestedRestaurant._id;
    } else {
      nextRestaurantId = requestedRestaurant._id;
      const existing = items.find((item) => item.foodItemId === food._id.toString());
      if (existing) {
        const nextQuantity = existing.quantity + quantity;
        if (nextQuantity > MAX_ITEM_QUANTITY) {
          throw ApiError.conflict(
            'CART_QUANTITY_LIMIT',
            `You can order at most ${MAX_ITEM_QUANTITY} of the same item.`,
            [{ foodItemId: food._id.toString(), maximum: MAX_ITEM_QUANTITY }],
          );
        }
        nextItems = items.map((item) =>
          item.foodItemId === food._id.toString()
            ? { ...item, quantity: nextQuantity }
            : item,
        );
      } else {
        nextItems = [...items, { foodItemId: food._id.toString(), quantity }];
      }
    }

    // Compare-and-swap on the document version. If another request changed the
    // cart since our read, retry instead of silently overwriting its changes.
    const updated = await Cart.findOneAndUpdate(
      { _id: cart._id, __v: cart.__v },
      {
        $set: {
          restaurantId: nextRestaurantId,
          items: nextItems,
          updatedAt: new Date(),
        },
        $inc: { __v: 1 },
      },
      { new: true, runValidators: true },
    );

    if (updated) return;
  }

  throw ApiError.conflict('CART_BUSY', 'Your cart changed at the same time. Please try again.');
}

async function updateCartItem(customerId, foodItemId, quantity) {
  assertQuantity(quantity);

  const [food, restaurant] = await Promise.all([
    FoodItem.findById(foodItemId),
    FoodItem.findById(foodItemId).then((item) =>
      item ? Restaurant.findById(item.restaurantId) : null,
    ),
  ]);

  if (!food || !food.isActive) throw ApiError.notFound('FOOD_NOT_FOUND', 'Food item not found.');
  if (!restaurant || !restaurant.isActive) {
    throw ApiError.notFound('RESTAURANT_NOT_FOUND', 'Restaurant not found.');
  }
  if (!food.isAvailable) {
    throw ApiError.conflict('FOOD_UNAVAILABLE', `${food.name} is currently unavailable.`);
  }
  assertRestaurantOpen(restaurant);

  for (let attempt = 0; attempt < CART_RETRY_LIMIT; attempt += 1) {
    const cart = await Cart.findOne({ customerId });
    if (!cart) throw ApiError.notFound('CART_EMPTY', 'Your cart is empty.');

    const items = plainItems(cart);
    const existing = items.find((item) => item.foodItemId === foodItemId);
    if (!existing) {
      throw ApiError.notFound('CART_ITEM_NOT_FOUND', 'That item is not in your cart.');
    }

    const nextItems = items.map((item) =>
      item.foodItemId === foodItemId ? { ...item, quantity } : item,
    );

    const updated = await Cart.findOneAndUpdate(
      { _id: cart._id, __v: cart.__v },
      {
        $set: { items: nextItems, updatedAt: new Date() },
        $inc: { __v: 1 },
      },
      { new: true, runValidators: true },
    );
    if (updated) return;
  }

  throw ApiError.conflict('CART_BUSY', 'Your cart changed at the same time. Please try again.');
}

async function removeCartItem(customerId, foodItemId) {
  for (let attempt = 0; attempt < CART_RETRY_LIMIT; attempt += 1) {
    const cart = await Cart.findOne({ customerId });
    if (!cart) return;

    const items = plainItems(cart);
    const nextItems = items.filter((item) => item.foodItemId !== foodItemId);
    if (nextItems.length === items.length) return;

    const updated = await Cart.findOneAndUpdate(
      { _id: cart._id, __v: cart.__v },
      {
        $set: {
          items: nextItems,
          restaurantId: nextItems.length === 0 ? null : cart.restaurantId,
          updatedAt: new Date(),
        },
        $inc: { __v: 1 },
      },
      { new: true, runValidators: true },
    );
    if (updated) return;
  }

  throw ApiError.conflict('CART_BUSY', 'Your cart changed at the same time. Please try again.');
}

async function clearCart(customerId) {
  for (let attempt = 0; attempt < CART_RETRY_LIMIT; attempt += 1) {
    const cart = await Cart.findOne({ customerId });
    if (!cart) return;

    const updated = await Cart.findOneAndUpdate(
      { _id: cart._id, __v: cart.__v },
      {
        $set: { items: [], restaurantId: null, updatedAt: new Date() },
        $inc: { __v: 1 },
      },
      { new: true },
    );
    if (updated) return;
  }

  throw ApiError.conflict('CART_BUSY', 'Your cart changed at the same time. Please try again.');
}

/**
 * Builds the client-facing cart from current catalogue data. Stored item refs
 * are not trusted to contain prices; prices always come from MongoDB.
 */
export async function getCartResponse(customerId) {
  const cart = await Cart.findOne({ customerId });
  if (!cart || cart.items.length === 0) {
    return {
      items: [],
      restaurant: null,
      itemCount: 0,
      subtotalPaise: 0,
      deliveryFeePaise: 0,
      totalPaise: 0,
      canCheckout: false,
      blockingReasons: [],
      updatedAt: cart?.updatedAt ? new Date(cart.updatedAt).toISOString() : null,
    };
  }

  const [foods, restaurant] = await Promise.all([
    FoodItem.find({ _id: { $in: cart.items.map((item) => item.foodItemId) } }),
    Restaurant.findById(cart.restaurantId),
  ]);

  const foodMap = new Map(foods.map((food) => [food._id.toString(), food]));
  const now = new Date();
  const isOpen = Boolean(restaurant && getRestaurantAvailability(restaurant, now).isOpen);

  const items = cart.items.map((cartItem) => {
    const food = foodMap.get(cartItem.foodItemId.toString());
    const available = Boolean(food && food.isActive && food.isAvailable);
    return {
      foodItemId: cartItem.foodItemId.toString(),
      name: food?.name || 'Unavailable item',
      description: food?.description || '',
      imageUrl: food?.imageUrl || '',
      category: food?.category || '',
      pricePaise: food?.pricePaise || 0,
      preparationTimeMinutes: food?.preparationTimeMinutes || 0,
      quantity: cartItem.quantity,
      lineTotalPaise: (food?.pricePaise || 0) * cartItem.quantity,
      isAvailable: available,
    };
  });

  const blockingReasons = [];
  if (!restaurant || !restaurant.isActive) blockingReasons.push('The restaurant is no longer active.');
  else if (!isOpen) blockingReasons.push(`${restaurant.name} is currently closed.`);
  if (items.some((item) => !item.isAvailable)) {
    blockingReasons.push('One or more items are unavailable. Remove them to continue.');
  }

  const subtotalPaise = items.reduce((sum, item) => sum + item.lineTotalPaise, 0);
  const deliveryFeePaise = restaurant?.deliveryFeePaise || 0;
  const totalPaise = subtotalPaise > 0 ? subtotalPaise + deliveryFeePaise : 0;

  return {
    items,
    restaurant: restaurant
      ? {
          id: restaurant._id.toString(),
          name: restaurant.name,
          cuisine: restaurant.cuisine,
          imageUrl: restaurant.imageUrl,
          deliveryTimeMinutes: restaurant.deliveryTimeMinutes,
          deliveryFeePaise: restaurant.deliveryFeePaise,
          isOpen,
          openingTime: restaurant.openingTime,
          closingTime: restaurant.closingTime,
          timezone: restaurant.timezone,
        }
      : null,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalPaise,
    deliveryFeePaise,
    totalPaise,
    canCheckout: items.length > 0 && isOpen && blockingReasons.length === 0,
    blockingReasons,
    updatedAt: new Date(cart.updatedAt).toISOString(),
  };
}

export async function addItem(customerId, input) {
  await addToCart(customerId, input);
  return getCartResponse(customerId);
}

export async function changeItemQuantity(customerId, foodItemId, quantity) {
  await updateCartItem(customerId, foodItemId, quantity);
  return getCartResponse(customerId);
}

export async function removeItem(customerId, foodItemId) {
  await removeCartItem(customerId, foodItemId);
  return getCartResponse(customerId);
}

export async function emptyCart(customerId) {
  await clearCart(customerId);
  return getCartResponse(customerId);
}
