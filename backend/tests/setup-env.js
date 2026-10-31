// Runs before every test file. Keeping the test database and keyspace separate
// makes it impossible to wipe the demo data by running the test suite.
process.env.NODE_ENV = 'test';
process.env.MONGODB_DB_NAME = 'quickbite_test';
process.env.CASSANDRA_KEYSPACE = 'quickbite_test';
process.env.ENABLE_WORKERS = 'false';
process.env.AUTO_SEED = 'false';
process.env.JWT_SECRET = 'quickbite_test_jwt_secret_with_more_than_32_chars';
process.env.ORDER_STATUS_INTERVAL_MS = '1000';
process.env.ORDER_WORKER_POLL_INTERVAL_MS = '500';
process.env.OUTBOX_WORKER_POLL_INTERVAL_MS = '500';
process.env.OUTBOX_BASE_DELAY_MS = '500';
process.env.OUTBOX_MAX_DELAY_MS = '2000';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
