# QuickBite Troubleshooting

This guide covers the issues most likely to occur during local setup or a demo.

## 1. First checks

Run these before changing anything:

```bash
docker compose ps
```

Both `quickbite-mongo` and `quickbite-cassandra` should be `running` and eventually `healthy`.

```bash
curl http://localhost:4000/health
curl http://localhost:4000/ready
```

Expected:

- `/health` returns `200` with `"status":"ok"` even if databases are down.
- `/ready` returns `200` only when both dependencies are reachable.

If the API is not responding at all, check the `npm run dev` terminal for startup errors.

Useful logs:

```bash
npm run db:logs
```

```bash
docker compose logs mongo --tail 100
docker compose logs cassandra --tail 100
```

The API also logs worker and database errors to the terminal that started it.

## 2. Docker Desktop is not running

**Symptoms**

- `failed to connect to the docker API at npipe:...`
- `Cannot connect to the Docker daemon`
- `npm run dev` fails during `requireTools()` or `composeUp()`.
- API logs show `connection <monitor> to [::1]:27017 closed` and then `Authentication failed.`

**Fix**

1. Start Docker Desktop.
2. Wait until it reports the engine is running (not just the window opening).
3. Verify:

```bash
docker info
docker compose ps
```

4. Restart the app:

```bash
npm run dev
```

If Docker stopped while the API was running, Mongoose may briefly retry against a container that is still starting and surface `Authentication failed.` Restarting `npm run dev` (or the backend) after both containers are healthy clears the stale connection.

If the Docker daemon is healthy but containers are stopped:

```bash
npm run db:up
```

## 3. Ports are already in use

**Symptoms**

- `EADDRINUSE` for port 4000 or 5173.
- MongoDB/Cassandra container fails to start with a port binding error.
- Vite exits because `strictPort` is enabled.

**Check on Windows**

```powershell
netstat -ano | findstr :4000
netstat -ano | findstr :5173
netstat -ano | findstr :27017
netstat -ano | findstr :9042
```

On macOS/Linux:

```bash
lsof -i :4000
```

**Fix**

Stop the conflicting process or change ports deliberately:

- API port: set `PORT` in `.env`. **Also update the Vite proxy target** in `frontend/vite.config.js` (it points at `127.0.0.1:4000`) and `FRONTEND_ORIGIN` if the frontend port changes.
- Frontend port: change `server.port` in `frontend/vite.config.js`, then set `FRONTEND_ORIGIN` to the new URL.
- MongoDB host port: set `MONGO_PORT` and update the port inside `MONGODB_URI`.
- Cassandra host port: set `CASSANDRA_PORT`. The API reads the same variable.

Use matching hosts in the browser. `localhost` and `127.0.0.1` are different origins for cookies and CORS.

## 4. MongoDB authentication fails

**Symptoms**

- `MongoServerSelectionError: Authentication failed.`
- `/ready` reports MongoDB `down`.
- The API cannot log in or read data.

**Common cause**

MongoDB's root user is created **only when the data volume is first initialized**. Changing `MONGO_ROOT_USERNAME` or `MONGO_ROOT_PASSWORD` later does not update the existing user, but `MONGODB_URI` may now use the new password.

**Fix — keep existing data**

Restore the credentials that originally created the volume in both:

- `MONGO_ROOT_USERNAME` / `MONGO_ROOT_PASSWORD` (Compose initialization values)
- the username/password inside `MONGODB_URI`

Then restart:

```bash
npm run db:down
npm run db:up
npm run dev
```

**Fix — reset local data (destructive)**

If this is disposable demo data:

```bash
npm run db:down
docker compose down -v
npm run dev
```

This deletes both database volumes. Use it only when losing local orders is acceptable.

## 5. Cassandra is slow to start

**Symptoms**

- Startup hangs at `Waiting for Cassandra...`.
- `docker compose ps` shows `health: starting`.
- Outbox deliveries time out immediately after startup.

**Reality**

A first Cassandra start commonly takes **60–120 seconds**. The startup script waits up to 150 attempts at three seconds each (about 7.5 minutes) and prints progress dots.

**Checks**

```bash
docker compose logs cassandra --tail 100
docker compose exec cassandra cqlsh -e "SELECT release_version FROM system.local"
```

If the container is unhealthy or restarting:

- Ensure Docker Desktop has enough memory (4 GB+ recommended).
- On Windows, confirm WSL 2 is healthy.
- Restart the container:

```bash
docker compose restart cassandra
```

The API reconnects on demand. `/ready` will stay `503` until Cassandra responds.

## 6. Timeline events are pending or delayed

**Symptoms**

- Order detail shows “N events waiting in the Mongo outbox”.
- The timeline is empty or missing the latest event.
- Logs show `Cassandra event delivery failed; will retry` or a write timeout.

**What is happening**

This is the outbox doing its job. Events are durable in MongoDB and are retried with capped exponential backoff (2 s base, 120 s maximum). Checkout is not rolled back.

**What to do**

1. Wait a few seconds. The UI polls while `pendingEvents > 0`.
2. Check `/ready`.
3. Check the outbox count:

```bash
docker compose exec mongo mongosh --username quickbite --password quickbite_dev_password --authenticationDatabase admin quickbite --eval "db.orders.countDocuments({ 'eventOutbox.status': 'pending' })"
```

4. If Cassandra was down, bring it back and wait for retries. Do not edit or delete outbox entries.
5. Confirm Cassandra tables are readable:

```bash
docker compose exec cassandra cqlsh -e "SELECT order_id, new_status FROM quickbite.order_events_by_order LIMIT 5;"
```

Events with high attempt counts may wait up to two minutes between retries. Restarting the API does not lose them; the dispatcher resumes from MongoDB.

## 7. “Order cannot be cancelled”

The API allows cancellation only while the order is `PENDING`. The demo advances to `CONFIRMED` after roughly 12 seconds. Once advanced, `cancel` returns:

```json
{
  "error": {
    "code": "ORDER_CANNOT_CANCEL",
    "message": "This order has already moved beyond Pending and can no longer be cancelled."
  }
}
```

This is expected. Place a new order and cancel within the first few seconds, or demonstrate the lifecycle instead.

## 8. Cart conflict, quantity limit or closed restaurant

These are intentional product rules, not bugs.

| Response | Meaning | What to do |
| --- | --- | --- |
| `409 CART_RESTAURANT_CONFLICT` | Cart already holds another restaurant's food | Confirm **Replace cart**, or clear the cart first |
| `409 CART_QUANTITY_LIMIT` | Same dish would exceed 10 units | Reduce the quantity |
| `409 RESTAURANT_CLOSED` | Kitchen is outside its stored hours | Wait until it opens or choose another restaurant |
| `409 FOOD_UNAVAILABLE` | Dish is marked unavailable | Choose another dish; seeded examples are Burger Barn wings and Wok & Roll spring rolls |
| `409 CART_BUSY` | Six optimistic-lock retries lost to concurrent writes | Retry the action |
| `409 CART_ITEMS_UNAVAILABLE` | One or more checkout items became unavailable | Remove/update them and retry; the cart is preserved |

`Sugar & Spice` is deliberately open only 03:00–03:15 IST, so it will normally show as closed. This is the demo case for “browsable but not orderable.”

## 9. 401 Unauthorized

**Symptoms**

- `/auth/me` or a protected page returns `401`.
- The navbar shows signed out after a reload.

**Checks**

- Sign in again.
- Did you change the password? That invalidates every earlier session by design.
- Did the JWT expire? Default lifetime is 7 days.
- Are you using the same host for the app and API? Use `http://localhost:5173` consistently.
- Is `COOKIE_SECURE=true` while running over plain HTTP? Cookies marked Secure will not be sent over `http://localhost` in some browser configurations. Keep it `false` locally.
- Is the cookie blocked by browser privacy settings? Allow cookies for `localhost`.
- Did the API restart with a different `JWT_SECRET`? Old cookies become invalid.

A `401` on the initial `/auth/me` probe while signed out is **normal**; the frontend treats it as “no session”. It appears in DevTools as a failed network response, not as an application crash.

## 10. 403 Origin or CORS errors

**Symptoms**

- `403 FORBIDDEN` with “Request origin is not allowed.”
- `403 ORIGIN_NOT_ALLOWED`.
- Browser console CORS errors on state-changing requests.

**Cause**

`FRONTEND_ORIGIN` must exactly match the browser origin, including scheme and port:

- `http://localhost:5173` is not the same as `http://127.0.0.1:5173`.
- `https` is not the same as `http`.
- A custom port must match.

**Fix**

Set `FRONTEND_ORIGIN` to the URL in the address bar, then restart the API. Open the app at that exact origin.

Requests without `Origin`/`Referer` (cURL, server-to-server) are allowed. Browser unsafe requests must come from the configured origin.

## 11. 429 Too Many Requests

Auth endpoints allow 30 attempts per 15 minutes per IP; password changes allow 20 per 10 minutes. The limiter is in-memory.

**Fix**

- Wait for the window to pass.
- Restart the backend to clear the in-memory counters.
- Do not loop login attempts during a demo; use the **Fill demo credentials** button.

## 12. Validation or identifier errors

| Code | Meaning |
| --- | --- |
| `VALIDATION_ERROR` | A field failed Zod validation; read `details[].field` and `details[].message` |
| `INVALID_ID` | An id is not a 24-character hexadecimal ObjectId |
| `INVALID_JSON` | The request body is malformed |
| `PAYLOAD_TOO_LARGE` | JSON body exceeds 100 KB |

Use the seeded ids returned by the API rather than inventing them.

## 13. Frontend will not start or is blank

**Checks**

```bash
node --version
npm --version
```

Node must be **20.19+**. Vite 8 and the startup script rely on modern Node APIs.

- If PowerShell blocks `npm` with “running scripts is disabled”, use `npm.cmd run dev` or run from Command Prompt.
- If port 5173 is occupied, Vite exits because `strictPort` is enabled. Free the port or change it and update `FRONTEND_ORIGIN`.
- Hard-refresh the browser (`Ctrl+Shift+R`) after large changes.
- Check the Vite terminal for compile errors.
- If only images are broken, the image CDN may be blocked; the app shows a fallback.

## 14. Tests fail

**Checks**

1. Docker is running and both databases are healthy.
2. Run from the project root:

```bash
npm test
```

3. The suite expects `quickbite_test` for both databases. It does not touch development data.
4. Tests run sequentially by design; avoid running two suites at once.
5. If a previous interrupted run left state, drop the test databases:

```bash
docker compose exec mongo mongosh --username quickbite --password quickbite_dev_password --authenticationDatabase admin --eval "db.getSiblingDB('quickbite_test').dropDatabase()"
docker compose exec cassandra cqlsh -e "DROP KEYSPACE IF EXISTS quickbite_test;"
```

Then rerun the tests; the test setup recreates what it needs.

6. If test timeouts occur, check Docker resources and Cassandra readiness. The suite has a 60-second hook timeout and 30-second test timeout.

7. If `npm run verify` fails during the build, run `npm run build` alone to see the frontend error clearly.

## 15. Seed does not restore the demo password

The seed resets the demo customer's password hash to `DEMO_CUSTOMER_PASSWORD`, but it does **not** increment `tokenVersion`. Existing sessions remain valid.

If login fails after a password-change test:

```bash
npm run seed
```

Then sign in with the credentials from `.env` (default `demo@quickbite.local` / `Demo@123`).

If the seed itself fails, check `/ready` and the database logs. It requires both databases because it ensures the Cassandra schema as part of the connection.

## 16. Orders are missing from “My orders”

Orders are scoped to the signed-in customer. Orders placed by a different account are not visible. Sign in with the same account used to place them.

If you reset the database volumes, order history is gone by design. The seed only restores catalogue/customer/address data, not past orders.

## 17. Data reset and clean slate

Stop the app, then:

```bash
npm run db:down
docker compose down -v
npm run dev
```

This removes both named volumes and re-seeds everything.

To keep data but refresh demo content:

```bash
npm run seed
```

To rebuild the frontend only:

```bash
npm run build
```

## 18. Still stuck — collection checklist

Run this sequence and note the first failure:

```bash
node --version
npm --version
docker info
docker compose ps
docker compose logs mongo --tail 50
docker compose logs cassandra --tail 50
curl http://localhost:4000/health
curl http://localhost:4000/ready
```

Then check:

- Is `FRONTEND_ORIGIN` exactly the browser origin?
- Are you signed in as the customer who owns the data?
- Is the restaurant outside its persisted hours?
- Is the order already past `PENDING`?
- Is the outbox retry banner visible?
- Does `/ready` show both dependencies up?

Most local failures are one of four things: Docker not running, a port conflict, mismatched origin/cookie settings, or an intentional business rule such as a closed kitchen or a cart conflict.
