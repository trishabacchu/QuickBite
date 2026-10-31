# QuickBite Demo Guide

A practical walkthrough for presenting QuickBite in roughly 8–12 minutes, including the NoSQL talking points an evaluator is likely to ask about.

## 1. Before the demo

Run these at least 10 minutes before presenting:

```bash
npm install
npm run dev
```

Wait for the startup summary and check:

- <http://localhost:4000/ready> shows both dependencies as `up`.
- <http://localhost:5173> loads.
- Demo login works: `demo@quickbite.local` / `Demo@123`.
- The browser is at `http://localhost:5173` (not `127.0.0.1`, unless `FRONTEND_ORIGIN` was changed to match).

Recommended demo setup:

- Desktop browser at 1440×900 or wider.
- One terminal open at the project root for Docker/Cassandra commands.
- Optionally open [docs/images/order-placed.png](images/order-placed.png) and [docs/images/orders-history.png](images/orders-history.png) as visual fallbacks.
- Keep the app zoom at 100%.

If you want a clean order history, reset the local data first (destructive):

```bash
npm run db:down
docker compose down -v
npm run dev
```

Do not do this after the demo has started.

### Deliberate demo data

| Item | Why it matters |
| --- | --- |
| `Sugar & Spice` is open only 03:00–03:15 IST | Shows a closed kitchen that remains browsable but cannot be ordered from |
| `Burger Barn` Peri Peri Chicken Wings | Shows a dish-level unavailable state |
| `Wok & Roll` Vegetable Spring Rolls | Second unavailable dish |
| Demo Home address | Checkout can be completed without data entry |
| 12-second status interval | The full lifecycle finishes in about one minute |

If the demo happens between 03:00 and 03:15 IST, `Sugar & Spice` will be open. In that case, point out the opening-hours logic and use the stored `03:00–03:15` window as the explanation instead of a disabled state.

## 2. Opening talk track (30 seconds)

> “QuickBite is a customer-facing food ordering demo. MongoDB holds the live operational data — customers, catalogue, carts and orders. Cassandra holds append-only order history in two tables shaped for two screens: the order timeline and the customer activity feed. The interesting parts are server-authoritative checkout, atomic status changes, and an outbox that survives Cassandra being unavailable.”

## 3. Walkthrough

### Step 1 — Sign in and discover (1 minute)

1. Open <http://localhost:5173>.
2. Click **Sign in**.
3. On the auth page, click **Fill demo credentials**, then **Sign in**.
4. Land on **Neighbourhood favourites**.

Point out:

- Five seeded kitchens with ratings, delivery time, fee, cuisine and live open/closed state.
- The warm orange/cream design and responsive layout.
- The search bar, category chips and featured restaurant card.

Open **Sugar & Spice**:

- The page is fully browsable.
- A **Closed now** badge and notice explain that ordering is unavailable.
- Every **Add** button is disabled.
- The hours (03:00–03:15 IST) are persisted with the restaurant; availability is derived in the restaurant's timezone.

Go back home.

### Step 2 — Search and browse (45 seconds)

1. Search for `burger`.
2. Show matching restaurants and dishes.
3. Clear the search with the text **Clear search** button.
4. Open **Burger Barn**.
5. Point out **Peri Peri Chicken Wings** labeled **Sold out**; its Add button is disabled.

Talking point:

> “The closed/closed-ish states are computed, not toggled by a cron job. The API formats now in the restaurant's IANA timezone and compares minutes since midnight, including cross-midnight windows like 11:00–02:00.”

### Step 3 — Cart replacement confirmation (1–2 minutes)

1. Add **Classic Cheeseburger** from Burger Barn.
2. Note the cart badge becomes **1 item**.
3. Go home and open **Napoli Slice**.
4. Add **Margherita Pizza**.

The **Replace your cart?** dialog appears with both restaurant names.

Point out:

- The server returned `409 CART_RESTAURANT_CONFLICT`; the client did not guess.
- Nothing is cleared until the customer confirms.
- Click **Replace cart**.

Talking point:

> “A cart is one MongoDB document per customer, with a unique index. Item writes use compare-and-swap on the document version, so two tabs cannot silently overwrite each other. Prices are not stored in the cart; they are joined from the current menu on every read and again at checkout.”

### Step 4 — Cart, limits and checkout (1–2 minutes)

1. Open the cart.
2. Point out the server-priced INR total: pizza + delivery fee.
3. Increase quantity with the stepper; mention the server cap of 10 per dish.
4. Click **Proceed to checkout**.
5. Show the seeded **Home** address preselected.
6. Show **Cash on Delivery** as the only payment option.
7. Click **Place order**.

Point out the confirmation:

- Generated order number in `QB-YYYYMMDD-XXXXXX` format.
- Status **Pending**.
- Payment status is separate from delivery status.
- Order detail polls every 4 seconds while active.

Talking point:

> “Checkout never trusts the client. It re-reads the cart, current food prices, availability, restaurant state and address ownership, then writes immutable item, restaurant and address snapshots. The cart is deleted only after the order insert succeeds.”

### Step 5 — Cancellation (45 seconds)

Do this quickly, while the order is still **Pending** (the first transition is about 12 seconds after placement):

1. Click **Cancel order**.
2. Confirm in the dialog.
3. Wait for the toast and the **Cancelled** badge.
4. Scroll to **Order timeline**.

The timeline should show the cancellation event after the outbox delivers it to Cassandra. If the outbox is briefly retrying, the UI shows a pending-events banner and refreshes automatically.

Point out:

- Cancellation is allowed only from `PENDING`.
- Once the order advances, the button disappears.
- The status update and the cancellation event are one conditional MongoDB update.
- The timeline is read from Cassandra, not Mongo.

### Step 6 — Place a second order and watch the lifecycle (2–3 minutes)

1. Go home and add a dish again (for example, a burger from Burger Barn).
2. Complete checkout.
3. Stay on the order detail page.

At roughly 12-second intervals, watch:

```text
PENDING -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED
```

The stepper, status badge, timestamped timeline and activity feed update as the worker advances the order and the outbox delivers each event.

While waiting, open **My orders**:

- Orders are newest first.
- The Cassandra activity feed is newest first.
- The cancelled order and the active order both appear.

Talking points:

- The worker persists `nextStatusAt`, so progression survives an API restart.
- Each transition uses a conditional update on `_id`, expected `status` and due `nextStatusAt`.
- Duplicate workers cannot apply the same transition twice.
- Each event is staged in the embedded outbox in the same Mongo update as the status change.
- Cassandra delivery is idempotent: stable UUID + timestamp + upsert.

### Step 7 — Show both databases (1–2 minutes)

In a terminal at the project root:

```bash
docker compose exec cassandra cqlsh -e "SELECT order_id, new_status, event_timestamp FROM quickbite.order_events_by_order LIMIT 20;"
```

```bash
docker compose exec cassandra cqlsh -e "SELECT customer_id, order_number, status, description FROM quickbite.customer_order_activity_by_customer LIMIT 20;"
```

Point out:

- `order_events_by_order` is partitioned by `order_id` and clustered ascending by timestamp.
- `customer_order_activity_by_customer` is partitioned by `customer_id` and clustered descending.
- The same logical event is intentionally duplicated into two query-specific tables.
- Both writes use the same event ID and timestamp on every retry.

Optional Mongo checks:

```bash
docker compose exec mongo mongosh --username quickbite --password quickbite_dev_password --authenticationDatabase admin quickbite --eval "db.orders.find({}, {orderNumber:1, status:1, totalPaise:1}).sort({createdAt:-1}).limit(5)"
```

```bash
docker compose exec mongo mongosh --username quickbite --password quickbite_dev_password --authenticationDatabase admin quickbite --eval 'db.orders.aggregate([{ $unwind: "$eventOutbox" }, { $group: { _id: "$eventOutbox.status", count: { $sum: 1 } } }])'
```

The aggregate shows delivered versus pending outbox entries.

### Step 8 — Account and responsive checks (45 seconds)

1. Open the profile menu and point to **Profile**, **Addresses**, **My orders**, **Sign out**.
2. Optionally edit the phone number to show profile updates.
3. Sign out.
4. Resize the browser to ~390 px wide and reload.

Point out:

- The mobile layout has no horizontal page overflow.
- Protected routes redirect to sign-in with a return location.
- Empty/error/loading states exist throughout.

## 4. Likely evaluator questions

### “Why use both MongoDB and Cassandra?”

MongoDB is the source of truth for mutable operational state, where single-document atomicity and flexible documents fit. Cassandra is an append-only history store optimized for high-volume writes and partition-scoped reads. The two Cassandra tables match the two access patterns exactly. See [DATABASE_DESIGN.md](DATABASE_DESIGN.md).

### “How do you keep the databases consistent?”

An embedded outbox. The order state change and event intent are written in one MongoDB update. A dispatcher retries Cassandra until it succeeds. Events have stable IDs and timestamps, and Cassandra inserts are upserts, so retries are idempotent. See [ARCHITECTURE.md](ARCHITECTURE.md).

### “What if Cassandra is down?”

Checkout still succeeds because MongoDB is authoritative. The order timeline/activity endpoints return a temporary `503`, the UI explains that events are waiting, and the outbox retries with capped exponential backoff. Nothing is silently lost.

### “How do you prevent double status transitions?”

The worker updates only when `_id`, `status` and due `nextStatusAt` still match. Cancellation uses the same conditional pattern. A losing update changes nothing.

### “How are prices protected?”

Cart totals are computed from current food documents on every read. Checkout repeats the validation and recomputes line totals and the grand total on the server. Order items store immutable price snapshots. Client-provided totals do not exist in the checkout request.

### “What about cart races?”

Each cart write reads the document, computes the next state, then updates with `{ _id, __v }`. A version mismatch retries up to six times, then returns `CART_BUSY`.

### “Is the session secure?”

JWT is in an HttpOnly `SameSite=Lax` cookie. Password changes increment `tokenVersion` and invalidate all old tokens. Unsafe requests also pass an origin/referer guard. Passwords are bcrypt hashes. Auth endpoints are rate-limited.

### “What is intentionally missing?”

Admin/restaurant/delivery dashboards, reviews, payment gateway, image uploads, GPS and real-time sockets — all out of scope for this lab. Payment is COD only and remains `PENDING`, which is honest about the demo.

## 5. Demo checklist

- [ ] Docker Desktop running
- [ ] `npm run dev` completed
- [ ] `/ready` reports MongoDB and Cassandra up
- [ ] Demo login tested
- [ ] Browser at `http://localhost:5173`
- [ ] Second terminal open for database queries
- [ ] One order placed and cancelled
- [ ] One order left running through all six statuses
- [ ] Both Cassandra tables queried
- [ ] Screenshots available as fallback
- [ ] Sign-out and responsive view shown

## 6. If something goes wrong

| Symptom | Quick response |
| --- | --- |
| Images do not load | The UI falls back gracefully; explain the image CDN dependency. |
| Timeline says events are waiting | This is the outbox working; the UI polls until delivery. Cassandra retries within seconds normally. |
| Order advanced before you could cancel | Place another order and cancel within the first ~12 seconds, or skip cancellation and show the lifecycle. |
| Sugar & Spice is open | It is 03:00–03:15 IST; explain the persisted window and use another demo point. |
| API 401 after idling | Sign in again; the session may have expired or the cookie was cleared. |
| Docker stopped | Restart Docker Desktop, wait for the daemon, then restart `npm run dev`. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md). |
| Rate limited | Wait, or restart the API to clear the in-memory limiter. |

## 7. Closing summary

> “The demo shows a full customer journey backed by two databases with different jobs. MongoDB owns correctness: current prices, carts, atomic status changes and immutable order snapshots. Cassandra owns history: two denormalized tables, idempotent writes, and an outbox that decouples checkout from event delivery. The system is tested end-to-end, seeds safely, and starts with one command.”
