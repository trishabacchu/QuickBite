import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import {
  addToCart,
  loginAgent,
  resetTestDatabase,
  seedFixtures,
  setupTestDatabase,
  teardownTestDatabase,
} from './helpers.js';

let app;
let fixtures;
let agent;

beforeAll(async () => {
  await setupTestDatabase();
  app = createApp();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await resetTestDatabase();
  fixtures = await seedFixtures();
  agent = await loginAgent(app);
});

describe('restaurants, search, and cart', () => {
  it('lists active restaurants with timezone-aware availability, including closed ones', async () => {
    const response = await agent.get('/api/v1/restaurants').expect(200);
    const restaurants = response.body.data.restaurants;
    expect(restaurants).toHaveLength(3);

    const open = restaurants.find((restaurant) => restaurant.name === 'Open Kitchen');
    const closed = restaurants.find((restaurant) => restaurant.name === 'Closed Kitchen');

    expect(open.isOpen).toBe(true);
    expect(open.timezone).toBe('Asia/Kolkata');
    expect(closed.isOpen).toBe(false);
    expect(closed.openingTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it('searches restaurants and dishes case-insensitively', async () => {
    const foodResponse = await agent.get('/api/v1/search?q=BURGER').expect(200);
    expect(foodResponse.body.data.foods.some((food) => food.name === 'Test Burger')).toBe(true);

    const restaurantResponse = await agent.get('/api/v1/search?q=kitchen').expect(200);
    expect(
      restaurantResponse.body.data.restaurants.some(
        (restaurant) => restaurant.name === 'Open Kitchen',
      ),
    ).toBe(true);

    const noMatch = await agent.get('/api/v1/search?q=zzzz-nothing').expect(200);
    expect(noMatch.body.data.foods).toHaveLength(0);
    expect(noMatch.body.data.restaurants).toHaveLength(0);
  });

  it('returns a tokenised menu and rejects an unknown restaurant', async () => {
    const response = await agent
      .get(`/api/v1/restaurants/${fixtures.restaurants.openKitchen._id}`)
      .expect(200);
    expect(response.body.data.restaurant.name).toBe('Open Kitchen');
    expect(response.body.data.menu).toHaveLength(2); // one available, one sold out, both active

    const missing = await agent
      .get('/api/v1/restaurants/64b7f0c2f1a2b3c4d5e6f7a8')
      .expect(404);
    expect(missing.body.error.code).toBe('RESTAURANT_NOT_FOUND');
  });

  it('adds items and computes totals from current server-side prices', async () => {
    const response = await addToCart(agent, fixtures.foods.burger._id, 2).expect(200);
    const { cart } = response.body.data;

    expect(cart.itemCount).toBe(2);
    expect(cart.items[0]).toMatchObject({ name: 'Test Burger', quantity: 2, pricePaise: 25000 });
    expect(cart.subtotalPaise).toBe(50000);
    expect(cart.deliveryFeePaise).toBe(2500);
    expect(cart.totalPaise).toBe(52500);
    expect(cart.canCheckout).toBe(true);
    expect(cart.restaurant.name).toBe('Open Kitchen');
  });

  it('enforces one restaurant per cart and only replaces after explicit confirmation', async () => {
    await addToCart(agent, fixtures.foods.burger._id, 1).expect(200);

    const conflict = await addToCart(agent, fixtures.foods.secondFood._id, 1).expect(409);
    expect(conflict.body.error.code).toBe('CART_RESTAURANT_CONFLICT');
    expect(conflict.body.error.details[0]).toMatchObject({
      currentRestaurantName: 'Open Kitchen',
      requestedRestaurantName: 'Second Kitchen',
    });

    const unchanged = await agent.get('/api/v1/cart').expect(200);
    expect(unchanged.body.data.cart.items).toHaveLength(1);
    expect(unchanged.body.data.cart.items[0].name).toBe('Test Burger');

    const replaced = await addToCart(agent, fixtures.foods.secondFood._id, 1, {
      replaceCart: true,
    }).expect(200);
    expect(replaced.body.data.cart.items).toHaveLength(1);
    expect(replaced.body.data.cart.items[0].name).toBe('Second Pizza');
    expect(replaced.body.data.cart.restaurant.name).toBe('Second Kitchen');
  });

  it('caps a single dish at ten and validates quantity changes', async () => {
    await addToCart(agent, fixtures.foods.burger._id, 10).expect(200);

    const overLimit = await addToCart(agent, fixtures.foods.burger._id, 1).expect(409);
    expect(overLimit.body.error.code).toBe('CART_QUANTITY_LIMIT');

    const invalid = await agent
      .patch(`/api/v1/cart/items/${fixtures.foods.burger._id}`)
      .send({ quantity: 0 })
      .expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const updated = await agent
      .patch(`/api/v1/cart/items/${fixtures.foods.burger._id}`)
      .send({ quantity: 4 })
      .expect(200);
    expect(updated.body.data.cart.items[0].quantity).toBe(4);
    expect(updated.body.data.cart.subtotalPaise).toBe(100000);
  });

  it('rejects unavailable dishes and dishes from a closed kitchen', async () => {
    const unavailable = await addToCart(agent, fixtures.foods.unavailableFood._id, 1).expect(409);
    expect(unavailable.body.error.code).toBe('FOOD_UNAVAILABLE');

    const closed = await addToCart(agent, fixtures.foods.closedFood._id, 1).expect(409);
    expect(closed.body.error.code).toBe('RESTAURANT_CLOSED');
  });

  it('removes an item and empties the cart when the last item goes', async () => {
    await addToCart(agent, fixtures.foods.burger._id, 2).expect(200);

    const removed = await agent
      .delete(`/api/v1/cart/items/${fixtures.foods.burger._id}`)
      .expect(200);
    expect(removed.body.data.cart.items).toHaveLength(0);
    expect(removed.body.data.cart.itemCount).toBe(0);
    expect(removed.body.data.cart.restaurant).toBeNull();
    expect(removed.body.data.cart.canCheckout).toBe(false);
  });
});
