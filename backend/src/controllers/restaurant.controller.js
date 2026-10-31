import {
  getFoodItem,
  getRestaurantWithMenu,
  listCategories,
  listRestaurants,
  unifiedSearch,
} from '../services/restaurant.service.js';

export async function getRestaurants(req, res) {
  const restaurants = await listRestaurants({ limit: req.query.limit });
  res.json({ data: { restaurants } });
}

export async function getRestaurant(req, res) {
  const result = await getRestaurantWithMenu(req.params.id);
  res.json({ data: result });
}

export async function getFood(req, res) {
  const food = await getFoodItem(req.params.id);
  res.json({ data: { food } });
}

export async function search(req, res) {
  const result = await unifiedSearch({ query: req.query.q, limit: req.query.limit });
  res.json({ data: result });
}

export async function getCategories(_req, res) {
  const categories = await listCategories();
  res.json({ data: { categories } });
}
