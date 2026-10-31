import { FoodItem } from '../models/FoodItem.js';
import { Restaurant } from '../models/Restaurant.js';
import { ApiError } from '../utils/api-error.js';
import { serializeFood, serializeRestaurant } from '../utils/serializers.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listRestaurants({ limit = 20 } = {}) {
  const restaurants = await Restaurant.find({ isActive: true })
    .sort({ rating: -1, name: 1 })
    .limit(limit);
  const now = new Date();
  return restaurants.map((restaurant) => serializeRestaurant(restaurant, now));
}

export async function getRestaurantWithMenu(id) {
  const restaurant = await Restaurant.findById(id);
  if (!restaurant || !restaurant.isActive) {
    throw ApiError.notFound('RESTAURANT_NOT_FOUND', 'Restaurant not found.');
  }

  const foods = await FoodItem.find({ restaurantId: restaurant._id, isActive: true }).sort({
    category: 1,
    name: 1,
  });
  const now = new Date();

  return {
    restaurant: serializeRestaurant(restaurant, now),
    menu: foods.map((food) => serializeFood(food, restaurant, now)),
  };
}

export async function getFoodItem(id) {
  const food = await FoodItem.findById(id);
  if (!food || !food.isActive) {
    throw ApiError.notFound('FOOD_NOT_FOUND', 'Food item not found.');
  }
  const restaurant = await Restaurant.findById(food.restaurantId);
  if (!restaurant || !restaurant.isActive) {
    throw ApiError.notFound('FOOD_NOT_FOUND', 'This dish is not currently available.');
  }
  return serializeFood(food, restaurant, new Date());
}

export async function listCategories() {
  const categories = await FoodItem.distinct('category', { isActive: true });
  return categories.sort((a, b) => a.localeCompare(b));
}

/**
 * Substring search with escaped regular expressions. The seeded data set is
 * small and bounded; MongoDB would get a text index once catalogue search grows.
 */
export async function unifiedSearch({ query, limit = 8 }) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { query: '', restaurants: [], foods: [] };
  }

  const regex = new RegExp(escapeRegex(trimmed), 'i');
  const now = new Date();

  const [restaurants, foods] = await Promise.all([
    Restaurant.find({
      isActive: true,
      $or: [{ name: regex }, { cuisine: regex }, { description: regex }],
    })
      .sort({ rating: -1, name: 1 })
      .limit(limit),
    FoodItem.find({
      isActive: true,
      $or: [{ name: regex }, { description: regex }, { category: regex }],
    })
      .sort({ name: 1 })
      .limit(limit),
  ]);

  const restaurantIds = [...new Set(foods.map((food) => food.restaurantId.toString()))];
  const foodRestaurants = await Restaurant.find({
    _id: { $in: restaurantIds },
    isActive: true,
  });
  const restaurantMap = new Map(
    foodRestaurants.map((restaurant) => [restaurant._id.toString(), restaurant]),
  );

  return {
    query: trimmed,
    restaurants: restaurants.map((restaurant) => serializeRestaurant(restaurant, now)),
    foods: foods
      .filter((food) => restaurantMap.has(food.restaurantId.toString()))
      .map((food) => serializeFood(food, restaurantMap.get(food.restaurantId.toString()), now)),
  };
}
