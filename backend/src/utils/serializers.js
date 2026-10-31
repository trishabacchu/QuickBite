import { ORDER_STATUS } from '../constants/order.js';
import { getRestaurantAvailability } from './time.js';

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

export function serializeCustomer(customer) {
  return {
    id: customer._id.toString(),
    name: customer.name,
    email: customer.email,
    phone: customer.phone || '',
    createdAt: iso(customer.createdAt),
    updatedAt: iso(customer.updatedAt),
  };
}

export function serializeRestaurant(restaurant, now = new Date()) {
  const availability = getRestaurantAvailability(restaurant, now);
  return {
    id: restaurant._id.toString(),
    slug: restaurant.slug,
    name: restaurant.name,
    description: restaurant.description,
    imageUrl: restaurant.imageUrl,
    cuisine: restaurant.cuisine,
    rating: restaurant.rating,
    deliveryTimeMinutes: restaurant.deliveryTimeMinutes,
    deliveryFeePaise: restaurant.deliveryFeePaise,
    isActive: restaurant.isActive,
    openingTime: restaurant.openingTime,
    closingTime: restaurant.closingTime,
    timezone: restaurant.timezone,
    isOpen: availability.isOpen,
    localTime: availability.localTime,
  };
}

export function serializeFood(food, restaurant = null, now = new Date()) {
  return {
    id: food._id.toString(),
    restaurantId: food.restaurantId.toString(),
    name: food.name,
    description: food.description,
    pricePaise: food.pricePaise,
    imageUrl: food.imageUrl,
    category: food.category,
    isAvailable: food.isAvailable,
    isActive: food.isActive,
    preparationTimeMinutes: food.preparationTimeMinutes,
    ...(restaurant
      ? {
          restaurant: {
            id: restaurant._id.toString(),
            name: restaurant.name,
            cuisine: restaurant.cuisine,
            isOpen: getRestaurantAvailability(restaurant, now).isOpen,
            openingTime: restaurant.openingTime,
            closingTime: restaurant.closingTime,
            timezone: restaurant.timezone,
            deliveryTimeMinutes: restaurant.deliveryTimeMinutes,
            deliveryFeePaise: restaurant.deliveryFeePaise,
          },
        }
      : {}),
  };
}

export function serializeAddress(address) {
  return {
    id: address._id.toString(),
    label: address.label || '',
    line1: address.line1,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    createdAt: iso(address.createdAt),
    updatedAt: iso(address.updatedAt),
  };
}

export function serializeOrderItem(item) {
  return {
    foodItemId: item.foodItemId.toString(),
    name: item.name,
    imageUrl: item.imageUrl,
    category: item.category,
    unitPricePaise: item.unitPricePaise,
    quantity: item.quantity,
    lineTotalPaise: item.lineTotalPaise,
  };
}

export function serializeOrder(order) {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    restaurant: {
      id: order.restaurantSnapshot.restaurantId.toString(),
      name: order.restaurantSnapshot.name,
      cuisine: order.restaurantSnapshot.cuisine,
      imageUrl: order.restaurantSnapshot.imageUrl,
    },
    items: order.items.map(serializeOrderItem),
    subtotalPaise: order.subtotalPaise,
    deliveryFeePaise: order.deliveryFeePaise,
    totalPaise: order.totalPaise,
    deliveryAddress: {
      label: order.deliveryAddressSnapshot.label || '',
      line1: order.deliveryAddressSnapshot.line1,
      city: order.deliveryAddressSnapshot.city,
      state: order.deliveryAddressSnapshot.state,
      postalCode: order.deliveryAddressSnapshot.postalCode,
    },
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
    canCancel: order.status === ORDER_STATUS.PENDING,
    nextStatusAt: iso(order.nextStatusAt),
    cancelledAt: iso(order.cancelledAt),
    deliveredAt: iso(order.deliveredAt),
    createdAt: iso(order.createdAt),
    updatedAt: iso(order.updatedAt),
  };
}
