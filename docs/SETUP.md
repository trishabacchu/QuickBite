# QuickBite Setup Guide

This guide covers local installation, environment configuration, manual startup, testing, data reset and production-build notes.

## 1. Prerequisites

| Requirement | Details |
| --- | --- |
| Node.js | **20.19 or newer** (uses `process.loadEnvFile`, Node watch mode and Vite 8) |
| npm | Bundled with Node; npm 10+ recommended |
| Docker | Docker Desktop on Windows/macOS, or Docker Engine + Compose v2 on Linux |
| Docker daemon | Must be running before `npm run dev` or `npm test` |
| Free ports | `5173`, `4000`, `27017`, `9042` |
| Network | Needed once to install packages and to load seeded Unsplash images |

Check your tools:

```bash
node --version
npm --version
docker --version
docker compose version
```

If Docker reports a missing pipe or cannot connect, start Docker Desktop and wait for it to finish starting before retrying.

## 2. First run — one command

From the project root:

```bash
npm install
npm run dev
```

`npm run dev` performs the full local bootstrap:

1. Creates `.env` from `.env.example` if `.env` is missing.
2. Loads the root environment file.
3. Verifies `node`, `npm`, `docker` and `docker compose`.
4. Runs `docker compose up -d` for MongoDB 7.0 and Cassandra 5.0.
5. Polls MongoDB and Cassandra until they are actually usable.
6. Ensures MongoDB indexes and Cassandra keyspace/tables exist.
7. Seeds the demo catalogue, customer and address because `AUTO_SEED=true`.
8. Starts the API (`:4000`) and Vite (`:5173`).
9. Prints the demo credentials and shutdown instructions.

The first Cassandra start can take one to two minutes. The startup script waits patiently and prints progress dots. It is not frozen.

### Open the app

| Service | URL |
| --- | --- |
| Storefront | <http://localhost:5173> |
| API root | <http://localhost:4000> |
| Liveness | <http://localhost:4000/health> |
| Readiness | <http://localhost:4000/ready> |

### Demo login

```text
Email:    demo@quickbite.local
Password: Demo@123
```

The account includes a **Home** address in Bengaluru, so checkout works immediately.

## 3. What gets created

Docker Compose creates two containers and two named volumes:

| Container | Image | Port | Volume |
| --- | --- | --- | --- |
| `quickbite-mongo` | `mongo:7.0` | 27017 | `quickbite-mongo-data` |
| `quickbite-cassandra` | `cassandra:5.0` | 9042 | `quickbite-cassandra-data` |

Application data:

- MongoDB database `quickbite`.
- Cassandra keyspace `quickbite`.
- MongoDB root user `quickbite` / `quickbite_dev_password` (local only).
- Cassandra has authentication disabled locally.
- 5 restaurants, 35 dishes, 1 demo customer, 1 saved address.

MongoDB container credentials are applied **only when the volume is first initialized**. Changing `MONGO_ROOT_USERNAME` or `MONGO_ROOT_PASSWORD` later does not change the existing database user. Keep `MONGODB_URI` in sync with the values that created the volume, or reset the volume destructively.

## 4. Environment variables

The root `.env` is shared by the API, Compose and the startup scripts. It is ignored by Git. `.env.example` contains working local-only values.

```bash
cp .env.example .env       # macOS/Linux
Copy-Item .env.example .env  # PowerShell
```

`npm run dev` creates it automatically if it is missing.

### Runtime

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | Enables dev behaviour and production safety checks |
| `PORT` | `4000` | API port |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS/cookie origin; must match the browser URL exactly |

### MongoDB

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGO_ROOT_USERNAME` | `quickbite` | Compose root user (first initialization only) |
| `MONGO_ROOT_PASSWORD` | `quickbite_dev_password` | Compose root password (first initialization only) |
| `MONGO_PORT` | `27017` | Host port mapped to MongoDB |
| `MONGODB_URI` | `mongodb://quickbite:quickbite_dev_password@localhost:27017/quickbite?authSource=admin` | Driver connection string |
| `MONGODB_DB_NAME` | `quickbite` | Database selected via Mongoose `dbName` |

### Cassandra

| Variable | Default | Purpose |
| --- | --- | --- |
| `CASSANDRA_CONTACT_POINTS` | `127.0.0.1` | Comma-separated contact points |
| `CASSANDRA_PORT` | `9042` | CQL native transport port |
| `CASSANDRA_LOCAL_DATACENTER` | `datacenter1` | Must match the Compose DC |
| `CASSANDRA_KEYSPACE` | `quickbite` | Keyspace; lowercase CQL identifier |
| `CASSANDRA_USERNAME` | blank | Optional auth |
| `CASSANDRA_PASSWORD` | blank | Optional auth |

### Authentication and cookies

| Variable | Default | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | local placeholder | At least 32 characters; replace outside local use |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `AUTH_COOKIE_NAME` | `quickbite_token` | HttpOnly cookie name |
| `COOKIE_SECURE` | `false` | Must be `true` in production (HTTPS) |
| `COOKIE_SAME_SITE` | `lax` | `lax`, `strict` or `none` |

### Workers and demo timing

| Variable | Default | Purpose |
| --- | --- | --- |
| `ENABLE_WORKERS` | `true` | Start status and outbox workers |
| `ORDER_STATUS_INTERVAL_MS` | `12000` | Time between simulated status transitions |
| `ORDER_WORKER_POLL_INTERVAL_MS` | `2000` | How often due orders are checked |
| `ORDER_WORKER_BATCH_SIZE` | `20` | Maximum orders advanced per poll |
| `OUTBOX_WORKER_POLL_INTERVAL_MS` | `2000` | How often pending events are checked |
| `OUTBOX_BASE_DELAY_MS` | `2000` | First retry backoff |
| `OUTBOX_MAX_DELAY_MS` | `120000` | Backoff ceiling |
| `OUTBOX_BATCH_SIZE` | `20` | Maximum orders scanned per dispatch |

### Demo data

| Variable | Default | Purpose |
| --- | --- | --- |
| `AUTO_SEED` | `true` in `.env.example` | Seed during `npm run dev` |
| `DEMO_CUSTOMER_NAME` | `Demo Customer` | Seeded name |
| `DEMO_CUSTOMER_EMAIL` | `demo@quickbite.local` | Seeded login |
| `DEMO_CUSTOMER_PASSWORD` | `Demo@123` | Seeded password |

### Frontend

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | blank | Optional absolute API origin for a production build; blank uses the Vite proxy/same origin |

The API's Zod configuration rejects invalid values at startup. In production mode it also rejects placeholder-looking secrets, non-secure cookies, and `SameSite=None` without `Secure`.

## 5. Manual startup

Use this when you want separate terminals, clearer logs, or to skip the orchestrator.

### Terminal 0 — install and configure

```bash
npm install
cp .env.example .env
```

### Terminal 1 — databases

```bash
npm run db:up
```

Wait until both are healthy if you are doing this by hand:

```bash
docker compose ps
```

### Terminal 2 — schema and seed

```bash
npm run init:db
npm run seed
```

Both commands are idempotent.

### Terminal 3 — API

```bash
npm run backend
```

This runs `node --watch src/server.js` from the backend workspace. It loads the root `.env`.

### Terminal 4 — frontend

```bash
npm run frontend
```

Vite listens on `http://localhost:5173` and proxies `/api` to `http://127.0.0.1:4000`.

## 6. Seeding

```bash
npm run seed
```

The seed:

- Upserts restaurants by unique `slug`.
- Upserts dishes by `(restaurantId, name)`.
- Upserts the demo customer by email and resets the configured demo password hash.
- Upserts the Home address by `(customerId, label, line1)`.
- Ensures indexes.
- Never deletes orders, outbox events or Cassandra history.

Running it twice does not duplicate catalogue rows. It does restore the demo password to `DEMO_CUSTOMER_PASSWORD`, which is useful after testing the password-change flow.

## 7. Tests and verification

### Backend tests

```bash
npm test
```

- 41 Vitest + Supertest integration tests.
- Uses `quickbite_test` for both MongoDB and Cassandra.
- Sets `ENABLE_WORKERS=false`; tests invoke workers explicitly.
- Runs files sequentially to avoid cross-file database interference.
- Requires the Docker containers to be running.

The test environment is defined in `backend/tests/setup-env.js`. Tests never touch the `quickbite` development database or keyspace.

### Full verification

```bash
npm run verify
```

This:

1. Starts Compose.
2. Waits for both databases.
3. Ensures indexes/schema (no seeding).
4. Runs the backend tests.
5. Builds the frontend.

### Frontend build only

```bash
npm run build
```

Output: `frontend/dist`.

## 8. Database access

### MongoDB shell

```bash
docker compose exec mongo mongosh --username quickbite --password quickbite_dev_password --authenticationDatabase admin quickbite
```

Useful commands inside the shell:

```js
db.customers.countDocuments()
db.restaurants.find({}, { name: 1, openingTime: 1, closingTime: 1 })
db.orders.find().sort({ createdAt: -1 }).limit(3)
db.carts.find()
```

### Cassandra shell

```bash
docker compose exec cassandra cqlsh
```

Inside:

```sql
USE quickbite;
DESCRIBE TABLES;
SELECT order_id, new_status, event_timestamp FROM order_events_by_order LIMIT 10;
SELECT customer_id, order_number, status, description FROM customer_order_activity_by_customer LIMIT 10;
```

## 9. Reset procedures

### Stop the app

Press `Ctrl+C` in the `npm run dev` terminal. Databases keep running.

### Stop containers, keep data

```bash
npm run db:down
```

### Wipe both databases

```bash
npm run db:down
docker compose down -v
npm run dev
```

`-v` deletes `quickbite-mongo-data` and `quickbite-cassandra-data`. This is destructive and resets the demo to a clean seed.

### Restore just the demo content

```bash
npm run seed
```

### Clear the test databases

Tests manage their own data. If a test run is interrupted and leaves state behind, you can drop them explicitly:

```bash
docker compose exec mongo mongosh --username quickbite --password quickbite_dev_password --authenticationDatabase admin --eval "db.getSiblingDB('quickbite_test').dropDatabase()"
docker compose exec cassandra cqlsh -e "DROP KEYSPACE IF EXISTS quickbite_test;"
```

They are recreated on the next test run.

## 10. Production build notes

`npm run build` verifies that the SPA compiles. This project is configured for local development, not production deployment.

If you deploy the build:

- Set `VITE_API_URL` to the public API origin **at build time**, rebuild, and serve `frontend/dist` from a static host.
- Serve the API over HTTPS and set `COOKIE_SECURE=true`.
- Set `COOKIE_SAME_SITE` appropriately for your topology.
- Set `FRONTEND_ORIGIN` to the exact public frontend origin.
- Use a strong, random `JWT_SECRET` (32+ characters, not a placeholder).
- Use MongoDB/Cassandra credentials that are not the local demo values.
- Use a Cassandra network topology strategy with multiple nodes for real workloads.
- Put the API behind a reverse proxy and coordinate CORS/cookies.
- Run workers as a separately managed process or add leader election before scaling the API horizontally.

`vite preview` is useful for checking the built assets, but it is not a production server and does not provide the development API proxy.

## 11. Windows notes

- The startup code avoids `shell: true` for Docker exec calls so CQL text such as `SELECT ... FROM system.local` is passed as one argument.
- `Ctrl+C` stops the frontend and API process trees; containers remain.
- Docker Desktop must be running. If the daemon stops, the API will log database connection errors until Docker returns.
- Use `localhost` consistently for the browser. If you use `127.0.0.1`, update `FRONTEND_ORIGIN` to match.
- If a command is shown with bash `\` line continuations, use PowerShell backticks or put it on one line.

## 12. No Git repository

This workspace is not initialized as a Git repository. There are no commits, tags or branches. The `.gitignore` is provided for future use.
