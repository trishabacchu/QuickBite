import request from 'supertest';
import config from '../src/config/env.js';
import {
  connectCassandra,
  disconnectCassandra,
  getCassandraClientForTests,
} from '../src/database/cassandra.js';
import { connectMongo, disconnectMongo } from '../src/database/mongodb.js';
import { Address } from '../src/models/Address.js';
import { Cart } from '../src/models/Cart.js';
import { Customer } from '../src/models/Customer.js';
import { FoodItem } from '../src/models/FoodItem.js';
import { Order } from '../src/models/Order.js';
import { Restaurant } from '../src/models/Restaurant.js';
import { hashPassword } from '../src/services/auth.service.js';

export const TEST_CUSTOMER = {
  name: 'Test Customer',
  email: 'test.customer@quickbite.local',
  password: 'Test@123',
};

const allModels = [Order, Cart, Address, Customer, Restaurant, FoodItem];

export async function setupTestDatabase() {
  if (!config.isTest || !config.MONGODB_DB_NAME.endsWith('_test')) {
    throw new Error('Refusing to run tests outside the dedicated quickbite_test database.');
  }
  if (!config.CASSANDRA_KEYSPACE.endsWith('_test')) {
    throw new Error('Refusing to run tests outside the dedicated quickbite_test keyspace.');
  }

  await connectMongo({ retries: 3, baseDelayMs: 250 });
  await connectCassandra({ retries: 3, baseDelayMs: 250 });
  await Promise.all(allModels.map((model) => model.createIndexes()));
}

export async function teardownTestDatabase() {
  await Promise.allSettled([disconnectMongo(), disconnectCassandra()]);
}

export async function resetTestDatabase() {
  await Promise.all(allModels.map((model) => model.deleteMany({})));

  const client = getCassandraClientForTests();
  if (!client) throw new Error('Cassandra client is not connected.');
  await client.execute(`TRUNCATE ${config.CASSANDRA_KEYSPACE}.order_events_by_order`);
  await client.execute(`TRUNCATE ${config.CASSANDRA_KEYSPACE}.customer_order_activity_by_customer`);
}

function clockForMinutes(totalMinutes) {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function currentIstMinutes(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  return (
    Number(parts.find((part) => part.type === 'hour').value) * 60 +
    Number(parts.find((part) => part.type === 'minute').value)
  );
}

function restaurantFields(overrides = {}) {
  return {
    slug: `test-restaurant-${Math.random().toString(36).slice(2, 9)}`,
    name: 'Test Kitchen',
    description: 'A test kitchen used by the integration suite.',
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
    cuisine: 'Test cuisine',
    rating: 4.6,
    deliveryTimeMinutes: 25,
    deliveryFeePaise: 2500,
    isActive: true,
    openingTime: '00:00',
    closingTime: '00:00',
    timezone: 'Asia/Kolkata',
    ...overrides,
  };
}

function foodFields(restaurantId, overrides = {}) {
  return {
    restaurantId,
    name: 'Test Burger',
    description: 'A juicy test burger with crisp lettuce.',
    pricePaise: 25000,
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    category: 'Burgers',
    isAvailable: true,
    isActive: true,
    preparationTimeMinutes: 15,
    ...overrides,
  };
}

/**
 * Creates a predictable catalogue for each test:
 * - openKitchen: always open, one available dish
 * - secondKitchen: always open, used for cross-restaurant conflicts
 * - closedKitchen: a short window placed a few hours after the current IST time
 */
export async function seedFixtures() {
  const openKitchen = await Restaurant.create(
    restaurantFields({ name: 'Open Kitchen', slug: 'open-kitchen', rating: 4.9 }),
  );
  const secondKitchen = await Restaurant.create(
    restaurantFields({
      name: 'Second Kitchen',
      slug: 'second-kitchen',
      deliveryFeePaise: 3500,
      rating: 4.8,
    }),
  );

  const closedStart = currentIstMinutes() + 180;
  const closedKitchen = await Restaurant.create(
    restaurantFields({
      name: 'Closed Kitchen',
      slug: 'closed-kitchen',
      rating: 4.1,
      openingTime: clockForMinutes(closedStart),
      closingTime: clockForMinutes(closedStart + 30),
    }),
  );

  const burger = await FoodItem.create(foodFields(openKitchen._id));
  const secondFood = await FoodItem.create(
    foodFields(secondKitchen._id, { name: 'Second Pizza', pricePaise: 30000, category: 'Pizza' }),
  );
  const unavailableFood = await FoodItem.create(
    foodFields(openKitchen._id, {
      name: 'Sold Out Wings',
      pricePaise: 19900,
      category: 'Sides',
      isAvailable: false,
    }),
  );
  const closedFood = await FoodItem.create(
    foodFields(closedKitchen._id, { name: 'Closed Dessert', pricePaise: 14900, category: 'Desserts' }),
  );

  const passwordHash = await hashPassword(TEST_CUSTOMER.password);
  const customer = await Customer.create({
    name: TEST_CUSTOMER.name,
    email: TEST_CUSTOMER.email,
    passwordHash,
    phone: '9876543210',
  });
  const address = await Address.create({
    customerId: customer._id,
    label: 'Home',
    line1: '12 Test Lane, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
  });

  return {
    restaurants: { openKitchen, secondKitchen, closedKitchen },
    foods: { burger, secondFood, unavailableFood, closedFood },
    customer,
    address,
  };
}

export async function loginAgent(app, { email = TEST_CUSTOMER.email, password = TEST_CUSTOMER.password } = {}) {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password }).expect(200);
  return agent;
}

// Deliberately synchronous: tests chain `.expect(...)` on the supertest
// request. An async wrapper would return a plain Promise without that method.
export function addToCart(agent, foodItemId, quantity = 1, options = {}) {
  return agent.post('/api/v1/cart/items').send({ foodItemId, quantity, ...options });
}

export async function createOrder(agent, addressId) {
  const response = await agent
    .post('/api/v1/orders')
    .send({ addressId, paymentMethod: 'COD' })
    .expect(201);
  return response.body.data.order;
}
