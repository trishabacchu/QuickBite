import { demoCustomer, restaurants } from '../../../database/seed/seed-data.js';
import config from '../config/env.js';
import { connectCassandra, disconnectCassandra } from '../database/cassandra.js';
import { connectMongo, disconnectMongo } from '../database/mongodb.js';
import { Address } from '../models/Address.js';
import { Customer } from '../models/Customer.js';
import { FoodItem } from '../models/FoodItem.js';
import { Restaurant } from '../models/Restaurant.js';
import { hashPassword, normalizeEmail } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';

async function seed() {
  await connectMongo({ retries: 10 });
  // Connecting also ensures the keyspace and tables exist on a fresh install.
  await connectCassandra({ retries: 10 });

  let restaurantCount = 0;
  let foodCount = 0;

  for (const definition of restaurants) {
    const { foods, ...restaurantFields } = definition;
    const restaurant = await Restaurant.findOneAndUpdate(
      { slug: definition.slug },
      {
        $set: { ...restaurantFields, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    restaurantCount += 1;

    for (const food of foods) {
      await FoodItem.findOneAndUpdate(
        { restaurantId: restaurant._id, name: food.name },
        {
          $set: {
            ...food,
            restaurantId: restaurant._id,
            isActive: true,
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      );
      foodCount += 1;
    }
  }

  const email = normalizeEmail(config.DEMO_CUSTOMER_EMAIL);
  const passwordHash = await hashPassword(config.DEMO_CUSTOMER_PASSWORD);
  const customer = await Customer.findOneAndUpdate(
    { email },
    {
      $set: {
        name: config.DEMO_CUSTOMER_NAME,
        email,
        passwordHash,
        phone: demoCustomer.phone,
      },
      $setOnInsert: { tokenVersion: 0, createdAt: new Date() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await Address.findOneAndUpdate(
    {
      customerId: customer._id,
      label: demoCustomer.address.label,
      line1: demoCustomer.address.line1,
    },
    {
      $set: {
        ...demoCustomer.address,
        customerId: customer._id,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );

  // createIndexes is additive: it does not drop existing collections or user
  // data, and it makes repeated seed runs safe.
  await Promise.all([
    Customer.createIndexes(),
    Restaurant.createIndexes(),
    FoodItem.createIndexes(),
    Address.createIndexes(),
  ]);

  logger.info('Demo seed complete', {
    restaurants: restaurantCount,
    foods: foodCount,
    demoEmail: email,
  });
  console.log('\nDemo account (local development only):');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${config.DEMO_CUSTOMER_PASSWORD}`);
  console.log('  A saved Home address is included for the demo.');
  console.log('  Re-running seed updates demo records by stable keys; it does not delete user data.\n');
}

try {
  await seed();
} catch (error) {
  logger.error('Seed failed', { error: error.message });
  process.exitCode = 1;
} finally {
  await Promise.allSettled([disconnectMongo(), disconnectCassandra()]);
}
