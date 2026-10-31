# QuickBite — Project Requirements and Plan (PRP)

## 1. Purpose

Build a demonstrable **Online Food Ordering and Delivery System** that satisfies a NoSQL laboratory brief while remaining a coherent, usable product. QuickBite must show meaningful use of two different database families:

- **MongoDB** for operational, mutable, document-shaped data (customers, catalogue, carts, addresses, orders).
- **Apache Cassandra** for append-only, query-first event history (order timeline and customer activity).

The result must run locally with one command, be testable without manual setup, and be presentable end-to-end through a polished customer interface.

## 2. Scope

### In scope

- Customer registration, login, logout, profile editing and password changes.
- Restaurant discovery, search, categories, restaurant menus and dish details.
- Timezone-aware opening hours with closed restaurants still browsable.
- A persistent server-side cart that holds items from one restaurant at a time.
- Explicit confirmation before replacing a cart with items from another restaurant.
- Quantity limits and server-authoritative prices.
- Checkout with a saved address and Cash on Delivery.
- Immutable order snapshots for items, restaurant and delivery address.
- Simulated six-stage delivery lifecycle driven by a persisted worker.
- Customer cancellation while an order is still `PENDING`.
- Per-order timeline and customer activity feed stored in Cassandra.
- A retryable, idempotent MongoDB outbox for Cassandra delivery.
- Responsive warm orange/cream UI with loading, error, empty and success states.
- Seed data, tests, production build, Docker setup and documentation.

### Out of scope

- Admin, restaurant-owner or delivery-partner dashboards.
- Reviews, ratings workflow or user-submitted images.
- Payment gateway integration; only Cash on Delivery is supported.
- Real-time updates over WebSockets/SSE.
- GPS/live rider tracking.
- Real kitchen, dispatch or logistics integrations.
- Multi-currency, taxes, coupons, refunds or tips.
- Horizontal scaling and production hardening.

## 3. Users and goals

| User | Goal |
| --- | --- |
| Customer | Find food quickly, build a cart without surprises, and follow an order from placement to delivery. |
| Lab evaluator / instructor | Verify NoSQL modelling choices, concurrency safety, event delivery, tests and documentation without guesswork. |
| Student author | Demonstrate a complete full-stack system with clear architecture and repeatable local setup. |

## 4. Functional requirements

### FR1 — Authentication and session security

- Customers can register with name, email and password.
- Passwords are hashed with bcrypt and never returned by the API.
- Login issues a JWT stored in an **HttpOnly** cookie (`quickbite_token`).
- The cookie uses `SameSite=Lax`; `Secure` is configurable and required in production mode.
- State-changing requests are checked against the configured frontend origin as defence in depth against CSRF.
- Changing a password increments a `tokenVersion`, invalidating every earlier session.
- Logout clears the cookie.
- Auth endpoints are rate-limited.

### FR2 — Catalogue and availability

- Customers can list active restaurants, view a restaurant menu, view a dish, list categories, and search restaurants/dishes case-insensitively.
- Restaurant availability is derived at request time from persisted opening and closing times in the restaurant's IANA timezone.
- Opening is inclusive and closing is exclusive.
- Cross-midnight periods such as `11:00–02:00` are supported.
- Identical opening and closing times mean a 24-hour period.
- Inactive restaurants, invalid hours and invalid timezones fail closed.
- Closed restaurants remain visible and browsable; their dishes cannot be added or ordered.

### FR3 — Persistent cart

- Each customer has at most one persisted cart.
- A cart may contain dishes from only one restaurant.
- Adding a dish from a different restaurant returns a conflict with both restaurant names unless the client explicitly confirms replacement.
- A dish may be added in quantities from 1 to 10, and the total quantity of that dish may not exceed 10.
- Cart prices and availability are recomputed from the current catalogue on every read.
- Cart writes use optimistic compare-and-swap on the Mongoose version key to avoid lost updates.
- Removing the last item clears the restaurant association.
- The cart survives reloads and sessions.

### FR4 — Checkout and orders

- Checkout requires an authenticated customer, a non-empty cart, an owned saved address, an open restaurant, and `paymentMethod: "COD"`.
- The server re-reads current prices, availability and restaurant state; client totals are never trusted.
- Unavailable items or a closed restaurant block checkout and preserve the cart.
- Successful checkout creates an order with immutable item, restaurant and address snapshots, then clears the cart.
- Order numbers follow `QB-YYYYMMDD-XXXXXX` using an IST date stamp and a random suffix protected by a unique index and retries.
- Payment status is separate from delivery status and remains `PENDING` because no payment is collected.
- Customers can list and read only their own orders.
- A customer can cancel only while the order is `PENDING`.
- Cancellation is a conditional atomic update; it cannot race the status worker into an invalid transition.

### FR5 — Simulated lifecycle

- Orders progress through `PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED`.
- A persisted worker advances due orders and records `nextStatusAt`.
- The demo interval defaults to 12 seconds and is configurable.
- Each transition is guarded by the expected current status and due time, so duplicate workers cannot apply the same transition twice.
- Cancelled orders never advance.
- Delivered orders have no next transition.

### FR6 — Event history and activity

- Every order event is staged in an embedded outbox on the order document in the same MongoDB write as the state change.
- An outbox dispatcher copies pending events to two Cassandra tables:
  - all events for an order, ordered oldest first;
  - a customer's activity, ordered newest first.
- Each event has a stable UUID and timestamp generated once; retries reuse them.
- Cassandra inserts are upserts, making retries idempotent.
- Failed deliveries are retried with capped exponential backoff and are never discarded.
- The UI surfaces pending outbox events and keeps refreshing until they land.
- Cassandra failures do not roll back an order; they degrade timeline/activity reads with a clear temporary-unavailable error.

### FR7 — User experience

- Warm orange/cream visual identity, desktop-first but responsive.
- Every async view has loading, error and empty states.
- No dead controls: actions either work or are explicitly disabled with a reason.
- Restaurant switch confirmation is an accessible modal dialog.
- Closed or unavailable items are visibly disabled.
- The order detail view polls while the order is active and refreshes after terminal events.
- INR is formatted for India from integer paise.
- Signed-out users attempting protected actions are redirected to sign in and returned afterwards.

### FR8 — Operations and documentation

- `npm run dev` starts databases, initialization, seed, API and frontend.
- Docker Compose defines MongoDB 7.0 and Cassandra 5.0 with named volumes.
- Seed is safe to run repeatedly and never deletes user orders.
- `npm test` runs against isolated test databases.
- `npm run build` produces a production bundle.
- `npm run verify` runs tests and the build.
- Documentation covers architecture, database design, API, setup, demo and troubleshooting.

## 5. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Correctness | Server is authoritative for prices, availability, totals and status transitions. |
| Concurrency | Cart writes use compare-and-swap; checkout deletion is idempotent; status/cancel use conditional updates. |
| Security | Hashed passwords, HttpOnly cookie, origin guard, input validation, ownership checks, security headers, rate limits, no internal error leakage. |
| Reliability | Cassandra outage is tolerated; outbox retries forever with backoff; API liveness is independent of database health. |
| Performance | Bounded list limits, indexed Mongo queries, partition-scoped Cassandra reads. |
| Maintainability | Layered backend, small React components, centralized API wrapper, validated environment, documented decisions. |
| Portability | Windows/macOS/Linux via Docker Compose and npm workspaces. |
| Accessibility | Semantic headings, labelled controls, keyboard-usable dialogs, visible disabled states. |
| Testability | Injectable outbox writer, isolated test DB/keyspace, time-injectable availability and worker functions. |

## 6. Key design decisions

1. **MongoDB as source of truth.** Orders, carts and catalogue are mutable documents with clear ownership and atomic single-document updates.
2. **Cassandra as a derived event store.** Two denormalized tables match the two read patterns instead of trying to serve both from one schema.
3. **Embedded outbox instead of Mongo transactions.** Order state and event intent are written in one document update. This works on a standalone Docker MongoDB without requiring a replica set.
4. **Stable event identity.** UUID and timestamp are generated before the first delivery attempt, so retries and replays cannot create duplicate logical events.
5. **Compare-and-swap for carts.** A conditional update on `__v` prevents two tabs from silently overwriting each other.
6. **Token version invalidation.** A password change invalidates all existing sessions without maintaining a server-side session table.
7. **Integer paise.** Avoids floating-point money errors across API, storage and tests.
8. **Snapshotting at checkout.** Item names, prices, restaurant identity and address are frozen so history remains truthful.
9. **Path-scoped auth guards.** Guards are mounted on their own path prefixes so unrelated unknown routes still return 404 and middleware does not run twice.
10. **UI polls only where needed.** Active orders poll every four seconds; inactive orders stop. Pending outbox events add a three-second refresh loop until delivered.

## 7. Acceptance criteria and verification

| ID | Acceptance criterion | Evidence |
| --- | --- | --- |
| AC1 | Register/login sets an HttpOnly cookie; wrong credentials fail; logout clears it. | `backend/tests/auth.test.js` |
| AC2 | Password change invalidates a previously issued cookie. | `backend/tests/auth.test.js` |
| AC3 | Closed/inactive restaurants are listed but unavailable; timezone and cross-midnight logic is correct. | `availability.test.js`, `catalogue-cart.test.js` |
| AC4 | Search matches names/cuisines/categories case-insensitively. | `catalogue-cart.test.js` |
| AC5 | Cart totals use current server prices; one-restaurant rule needs explicit replacement; quantity max is 10; unavailable items are rejected. | `catalogue-cart.test.js` |
| AC6 | Checkout rejects empty carts and foreign addresses; snapshots survive address edits; cart clears on success. | `orders.test.js` |
| AC7 | Cancellation works only from `PENDING` and prevents later advancement. | `orders.test.js` |
| AC8 | Lifecycle visits every stage exactly once and reaches `DELIVERED`. | `orders.test.js` |
| AC9 | Customers cannot read/cancel another customer's order. | `orders.test.js` |
| AC10 | Outbox delivers to both Cassandra tables, retries with stable identity, and is idempotent. | `outbox.test.js` |
| AC11 | Activity feed is newest first and order timeline is oldest first. | `orders.test.js`, `outbox.test.js` |
| AC12 | Health is independent of databases; readiness reflects both; errors are consistent JSON; security headers are set. | `system.test.js` |
| AC13 | One-command startup, seed and verification work. | `scripts/dev.mjs`, `scripts/verify.mjs` |
| AC14 | Full browser journey works with no JS errors or 5xx responses. | Playwright browser flow executed during verification (25 checks) |
| AC15 | Production frontend build succeeds. | `npm run build` |

## 8. Milestones delivered

1. Repository scaffolding, workspaces, environment validation, Compose services and startup orchestration.
2. MongoDB models/indexes, Cassandra keyspace/tables, seed and initialization scripts.
3. Auth, catalogue, search, cart, addresses, profile, checkout, cancellation and lifecycle services.
4. Outbox dispatcher, workers, readiness endpoint and graceful shutdown.
5. React storefront, routing, contexts, dialogs, order polling and responsive styling.
6. Integration tests, Windows startup fixes, live API/browser verification.
7. Documentation and final verification.

## 9. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Cassandra takes a long time to start on first run | `npm run dev` appears stuck | Startup polls up to 150 times (~7.5 minutes) and prints progress. |
| Docker daemon stops after the app starts | API database errors | Restart Docker Desktop; Mongoose reconnects and Cassandra reconnects on demand. Documented in troubleshooting. |
| Two cart tabs race | Lost quantity updates | Version compare-and-swap with bounded retries. |
| Worker and cancellation race | Invalid transition | Conditional update on current status. |
| Cassandra write succeeds but ack is lost | Duplicate event | Stable UUID/timestamp plus upsert semantics. |
| Outbox delivery delayed | Timeline temporarily incomplete | UI shows pending count and refreshes; retries are automatic. |
| Mongo volume retains old credentials after env change | Authentication failure | Documented: restore old credentials or reset the volume destructively. |
| OneDrive/Windows file watching or path quirks | Unexpected restarts | Node watch restarts are harmless; startup uses no-shell argument passing for CQL and `taskkill` for child trees. |

## 10. Definition of done

- All 41 integration tests pass against isolated databases.
- The frontend production build succeeds.
- The one-command developer workflow starts a usable app.
- The seed is repeatable without duplicates.
- The customer journey works end-to-end in a real browser.
- Both Cassandra tables contain the expected events.
- Documentation states actual commands, URLs, credentials, verification results, limitations and shutdown steps.
