# QuickBite API Reference

## 1. Basics

| Item | Value |
| --- | --- |
| Base URL (local) | `http://localhost:4000/api/v1` |
| Alternate host | `http://127.0.0.1:4000/api/v1` |
| Content type | `application/json` |
| Auth cookie | `quickbite_token` (HttpOnly, SameSite=Lax) |
| Health | `GET /health` (outside `/api/v1`) |
| Readiness | `GET /ready` (outside `/api/v1`) |

All examples assume the API is running via `npm run dev` or `npm run backend`.

### Success envelope

```json
{
  "data": {}
}
```

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "details": [
      { "field": "email", "message": "Enter a valid email address." }
    ]
  }
}
```

`details` is always an array. Its contents depend on the error: validation fields, cart conflict names, unavailable items, etc.

### Authentication

Authenticated endpoints read the `quickbite_token` cookie. Send credentials with every request:

- Browsers: `fetch(..., { credentials: 'include' })` (the app's API wrapper already does this).
- cURL: `-b cookies.txt -c cookies.txt`.
- Postman/Insomnia: enable cookie storage.

A missing, expired, malformed or version-invalidated token returns `401 UNAUTHENTICATED`.

### Origin protection

Unsafe methods (`POST`, `PATCH`, `DELETE`) are checked for a trusted `Origin` or `Referer`:

- `Sec-Fetch-Site: cross-site` is rejected with `403 FORBIDDEN`.
- A present but mismatched `Origin`/`Referer` is rejected with `403 FORBIDDEN`.
- Requests with no `Origin`/`Referer` (cURL, server-to-server, tests) are allowed because they cannot ride a browser cookie.

The allowed origin is `FRONTEND_ORIGIN` (`http://localhost:5173` by default). If you open the app as `http://127.0.0.1:5173`, set `FRONTEND_ORIGIN` to match or use `localhost` consistently.

### Rate limits

| Endpoint group | Limit |
| --- | --- |
| `POST /auth/register`, `POST /auth/login` | 30 requests / 15 minutes / IP |
| `POST /profile/change-password` | 20 requests / 10 minutes / IP |

Exceeding a limit returns `429 RATE_LIMITED`. Limits are skipped when `NODE_ENV=test`.

## 2. Endpoint summary

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | No | Create an account and sign in |
| `POST` | `/auth/login` | No | Sign in |
| `POST` | `/auth/logout` | No | Clear the auth cookie |
| `GET` | `/auth/me` | Yes | Current customer |
| `GET` | `/profile` | Yes | Current customer profile |
| `PATCH` | `/profile` | Yes | Update name and phone |
| `POST` | `/profile/change-password` | Yes | Change password and invalidate sessions |
| `GET` | `/restaurants` | No | List active restaurants |
| `GET` | `/restaurants/:id` | No | Restaurant + menu |
| `GET` | `/restaurants/:id/menu` | No | Alias of the above |
| `GET` | `/food/:id` | No | Dish detail with restaurant context |
| `GET` | `/search` | No | Search restaurants and dishes |
| `GET` | `/categories` | No | Distinct dish categories |
| `GET` | `/cart` | Yes | Current cart |
| `POST` | `/cart/items` | Yes | Add a dish or confirm replacement |
| `PATCH` | `/cart/items/:itemId` | Yes | Set an item quantity |
| `DELETE` | `/cart/items/:itemId` | Yes | Remove an item |
| `DELETE` | `/cart` | Yes | Empty the cart |
| `GET` | `/addresses` | Yes | List saved addresses |
| `POST` | `/addresses` | Yes | Create an address |
| `PATCH` | `/addresses/:id` | Yes | Update an address |
| `DELETE` | `/addresses/:id` | Yes | Delete an address |
| `GET` | `/orders` | Yes | List the customer's orders |
| `POST` | `/orders` | Yes | Checkout the current cart |
| `GET` | `/orders/:id` | Yes | One owned order |
| `GET` | `/orders/:id/events` | Yes | Cassandra order timeline |
| `GET` | `/orders/activity` | Yes | Cassandra customer activity |
| `POST` | `/orders/:id/cancel` | Yes | Cancel a `PENDING` order |

`GET /orders/activity` is declared before `GET /orders/:id` in the router, so `activity` is never parsed as an order id.

## 3. Health and readiness

### `GET /health`

Liveness only. Does not touch either database.

```json
{
  "status": "ok",
  "service": "quickbite-api",
  "uptimeSeconds": 42
}
```

### `GET /ready`

Checks both databases.

Success (`200`):

```json
{
  "status": "ready",
  "dependencies": {
    "mongodb": { "status": "up" },
    "cassandra": { "status": "up" }
  }
}
```

Failure (`503`):

```json
{
  "status": "not_ready",
  "dependencies": {
    "mongodb": { "status": "up" },
    "cassandra": { "status": "down" }
  }
}
```

## 4. Authentication and profile

### `POST /auth/register`

Creates a customer and sets the auth cookie.

Request:

```json
{
  "name": "Asha Rao",
  "email": "asha@example.com",
  "password": "StrongPass123"
}
```

Validation:

- `name`: 2–80 characters.
- `email`: valid email, max 254 characters.
- `password`: 6–72 characters (see `backend/src/constants/security.js`).

Response `201`:

```json
{
  "data": {
    "customer": {
      "id": "6710f0c2b2f4a1d2e3f45678",
      "name": "Asha Rao",
      "email": "asha@example.com",
      "phone": "",
      "createdAt": "2026-10-25T10:00:00.000Z",
      "updatedAt": "2026-10-25T10:00:00.000Z"
    }
  }
}
```

Errors: `VALIDATION_ERROR` (400), `EMAIL_ALREADY_REGISTERED` (409), `RATE_LIMITED` (429).

### `POST /auth/login`

Request:

```json
{
  "email": "demo@quickbite.local",
  "password": "Demo@123"
}
```

Response `200`: same `data.customer` shape as registration.

Errors: `VALIDATION_ERROR` (400), `INVALID_CREDENTIALS` (401), `RATE_LIMITED` (429).

### `POST /auth/logout`

Clears the cookie. Response `200`:

```json
{ "data": { "message": "Signed out." } }
```

### `GET /auth/me`

Returns the authenticated customer. Same shape as registration. Errors: `401 UNAUTHENTICATED`.

### `GET /profile`

Same response as `/auth/me`.

### `PATCH /profile`

Request:

```json
{
  "name": "Asha Rao",
  "phone": "+91 98765 43210"
}
```

`name` is required; `phone` is optional and may be blank. Response is `{ data: { customer } }`.

Errors: `VALIDATION_ERROR` (400), `401 UNAUTHENTICATED`.

### `POST /profile/change-password`

Request:

```json
{
  "currentPassword": "Demo@123",
  "newPassword": "NewDemo@456"
}
```

On success:

- Increments `tokenVersion`, invalidating every earlier JWT.
- Clears the current cookie.
- Returns `200`:

```json
{ "data": { "message": "Password changed. Please sign in again." } }
```

Errors: `VALIDATION_ERROR` (400), `CURRENT_PASSWORD_INCORRECT` (400), `401 UNAUTHENTICATED`, `RATE_LIMITED` (429).

## 5. Catalogue and search

### `GET /restaurants`

Query: `limit` integer 1–50, default 20.

Returns active restaurants sorted by rating desc, then name. Closed restaurants are included with `isOpen: false`.

Response:

```json
{
  "data": {
    "restaurants": [
      {
        "id": "6710f0c2b2f4a1d2e3f45678",
        "slug": "spice-route",
        "name": "Spice Route",
        "description": "Slow-cooked biryanis...",
        "imageUrl": "https://images.unsplash.com/...",
        "cuisine": "North Indian",
        "rating": 4.7,
        "deliveryTimeMinutes": 32,
        "deliveryFeePaise": 3900,
        "isActive": true,
        "openingTime": "10:00",
        "closingTime": "23:30",
        "timezone": "Asia/Kolkata",
        "isOpen": true,
        "localTime": "18:42"
      }
    ]
  }
}
```

`localTime` is the current time in the restaurant's timezone at request time. `isOpen` is derived, never stored.

### `GET /restaurants/:id` and `GET /restaurants/:id/menu`

Both return the restaurant plus its active menu, sorted by category then name.

```json
{
  "data": {
    "restaurant": { "...": "restaurant shape" },
    "menu": [
      {
        "id": "6710f0c2b2f4a1d2e3f45679",
        "restaurantId": "6710f0c2b2f4a1d2e3f45678",
        "name": "Hyderabadi Chicken Biryani",
        "description": "Dum-cooked basmati rice...",
        "pricePaise": 32900,
        "imageUrl": "https://images.unsplash.com/...",
        "category": "Biryani",
        "isAvailable": true,
        "isActive": true,
        "preparationTimeMinutes": 25,
        "restaurant": {
          "id": "6710f0c2b2f4a1d2e3f45678",
          "name": "Spice Route",
          "cuisine": "North Indian",
          "isOpen": true,
          "openingTime": "10:00",
          "closingTime": "23:30",
          "timezone": "Asia/Kolkata",
          "deliveryTimeMinutes": 32,
          "deliveryFeePaise": 3900
        }
      }
    ]
  }
}
```

Errors: `INVALID_ID` (400) for a malformed id, `RESTAURANT_NOT_FOUND` (404).

### `GET /food/:id`

Returns `{ data: { food } }` with the same food shape and embedded restaurant context.

Errors: `INVALID_ID` (400), `FOOD_NOT_FOUND` (404).

### `GET /search`

Query:

- `q` — required, trimmed, 1–80 characters.
- `limit` — 1–20, default 8.

Matching is case-insensitive substring matching:

- Restaurants: name, cuisine, description.
- Dishes: name, description, category.

Response:

```json
{
  "data": {
    "query": "burger",
    "restaurants": [ { "...": "restaurant shape" } ],
    "foods": [ { "...": "food shape with restaurant context" } ]
  }
}
```

Errors: `VALIDATION_ERROR` (400) for a missing/empty query.

### `GET /categories`

Returns distinct active dish categories, alphabetically:

```json
{
  "data": {
    "categories": ["Beverages", "Biryani", "Breads", "Burgers", "Cakes"]
  }
}
```

## 6. Cart

All cart endpoints require authentication.

### Cart shape

```json
{
  "data": {
    "cart": {
      "items": [
        {
          "foodItemId": "6710f0c2b2f4a1d2e3f45679",
          "name": "Margherita Pizza",
          "description": "San Marzano tomato...",
          "imageUrl": "https://images.unsplash.com/...",
          "category": "Pizza",
          "pricePaise": 29900,
          "preparationTimeMinutes": 18,
          "quantity": 1,
          "lineTotalPaise": 29900,
          "isAvailable": true
        }
      ],
      "restaurant": {
        "id": "6710f0c2b2f4a1d2e3f45677",
        "name": "Napoli Slice",
        "cuisine": "Italian · Pizza",
        "imageUrl": "https://images.unsplash.com/...",
        "deliveryTimeMinutes": 26,
        "deliveryFeePaise": 2900,
        "isOpen": true,
        "openingTime": "11:00",
        "closingTime": "23:00",
        "timezone": "Asia/Kolkata"
      },
      "itemCount": 1,
      "subtotalPaise": 29900,
      "deliveryFeePaise": 2900,
      "totalPaise": 32800,
      "canCheckout": true,
      "blockingReasons": [],
      "updatedAt": "2026-10-25T10:05:00.000Z"
    }
  }
}
```

An empty cart returns `items: []`, `restaurant: null`, zero totals, `canCheckout: false`, and `updatedAt` possibly `null`.

`itemCount` is the sum of quantities, not the number of distinct lines. Prices always come from the current food documents.

### `GET /cart`

Returns the current cart. If no cart exists, returns an empty cart shape.

### `POST /cart/items`

Request:

```json
{
  "foodItemId": "6710f0c2b2f4a1d2e3f45679",
  "quantity": 2,
  "replaceCart": false
}
```

Validation:

- `foodItemId`: 24-character ObjectId.
- `quantity`: integer 1–10, default 1.
- `replaceCart`: boolean, default false.

Behaviour:

- Adds the dish, merging quantity if it is already present.
- Rejects if the resulting quantity for that dish exceeds 10.
- Rejects unavailable dishes and closed/inactive restaurants.
- If the cart holds another restaurant's food and `replaceCart` is false, returns a conflict.

Restaurant conflict response (`409 CART_RESTAURANT_CONFLICT`):

```json
{
  "error": {
    "code": "CART_RESTAURANT_CONFLICT",
    "message": "Your cart contains food from another restaurant. Confirm before replacing it.",
    "details": [
      {
        "currentRestaurantId": "6710f0c2b2f4a1d2e3f45677",
        "currentRestaurantName": "Burger Barn",
        "requestedRestaurantId": "6710f0c2b2f4a1d2e3f45688",
        "requestedRestaurantName": "Napoli Slice"
      }
    ]
  }
}
```

Repeat the request with `"replaceCart": true` to confirm. The cart is replaced with only the requested dish.

Other errors:

- `FOOD_NOT_FOUND` (404)
- `RESTAURANT_NOT_FOUND` (404)
- `FOOD_UNAVAILABLE` (409)
- `RESTAURANT_CLOSED` (409)
- `CART_QUANTITY_LIMIT` (409)
- `CART_BUSY` (409, after six optimistic-lock retries)
- `VALIDATION_ERROR` (400)

### `PATCH /cart/items/:itemId`

Sets an absolute quantity (not a delta).

```json
{ "quantity": 3 }
```

Response: `{ data: { cart } }`.

Errors: `INVALID_ID` (400), `VALIDATION_ERROR` (400), `CART_EMPTY` (404), `CART_ITEM_NOT_FOUND` (404), `FOOD_NOT_FOUND` (404), `FOOD_UNAVAILABLE` (409), `RESTAURANT_CLOSED` (409), `CART_BUSY` (409).

### `DELETE /cart/items/:itemId`

Removes one dish. Removing the last dish also clears `restaurantId`. Response: `{ data: { cart } }`. Removing an absent item is a no-op. Errors: `INVALID_ID` (400), `CART_BUSY` (409).

### `DELETE /cart`

Empties the cart. Response: `{ data: { cart } }` with an empty cart. Errors: `CART_BUSY` (409).

## 7. Addresses

All address endpoints require authentication and are scoped to the signed-in customer.

### `GET /addresses`

Newest first.

```json
{
  "data": {
    "addresses": [
      {
        "id": "6710f0c2b2f4a1d2e3f45999",
        "label": "Home",
        "line1": "12 Lake View Road, Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postalCode": "560038",
        "createdAt": "2026-10-25T09:00:00.000Z",
        "updatedAt": "2026-10-25T09:00:00.000Z"
      }
    ]
  }
}
```

### `POST /addresses`

```json
{
  "label": "Work",
  "line1": "4th Floor, 80 Feet Road",
  "city": "Bengaluru",
  "state": "Karnataka",
  "postalCode": "560095"
}
```

`label` is optional. `line1` 5–200; city/state 2–60; postal code exactly six digits. Response `201`: `{ data: { address } }`.

### `PATCH /addresses/:id`

At least one field from `label`, `line1`, `city`, `state`, `postalCode`. Response `{ data: { address } }`. Errors: `VALIDATION_ERROR` (400), `ADDRESS_NOT_FOUND` (404, including addresses owned by someone else).

### `DELETE /addresses/:id`

Response `{ data: { message: "Address deleted." } }`. Errors: `ADDRESS_NOT_FOUND` (404).

Deleting or editing an address does not change orders that already snapshot it.

## 8. Orders and checkout

### `POST /orders`

Checkout the current cart.

```json
{
  "addressId": "6710f0c2b2f4a1d2e3f45999",
  "paymentMethod": "COD"
}
```

The server:

1. Verifies the cart is non-empty.
2. Loads the restaurant and checks it is active and open now.
3. Loads every current food document and checks active/available/quantity.
4. Verifies the address belongs to the customer.
5. Recomputes subtotal, delivery fee and total from current prices.
6. Creates the order with immutable item, restaurant and address snapshots plus the placed outbox event.
7. Deletes the cart (best effort; failures are logged and do not undo the order).

Response `201`:

```json
{
  "data": {
    "order": {
      "id": "6710f0c2b2f4a1d2e3f45aaa",
      "orderNumber": "QB-20261025-A1B2C3",
      "restaurant": {
        "id": "6710f0c2b2f4a1d2e3f45677",
        "name": "Napoli Slice",
        "cuisine": "Italian · Pizza",
        "imageUrl": "https://images.unsplash.com/..."
      },
      "items": [
        {
          "foodItemId": "6710f0c2b2f4a1d2e3f45679",
          "name": "Margherita Pizza",
          "imageUrl": "https://images.unsplash.com/...",
          "category": "Pizza",
          "unitPricePaise": 29900,
          "quantity": 1,
          "lineTotalPaise": 29900
        }
      ],
      "subtotalPaise": 29900,
      "deliveryFeePaise": 2900,
      "totalPaise": 32800,
      "deliveryAddress": {
        "label": "Home",
        "line1": "12 Lake View Road, Indiranagar",
        "city": "Bengaluru",
        "state": "Karnataka",
        "postalCode": "560038"
      },
      "paymentMethod": "COD",
      "paymentStatus": "PENDING",
      "status": "PENDING",
      "estimatedDeliveryMinutes": 26,
      "canCancel": true,
      "nextStatusAt": "2026-10-25T10:06:12.000Z",
      "cancelledAt": null,
      "deliveredAt": null,
      "createdAt": "2026-10-25T10:06:00.000Z",
      "updatedAt": "2026-10-25T10:06:00.000Z"
    }
  }
}
```

Errors:

- `EMPTY_CART` (400)
- `UNSUPPORTED_PAYMENT_METHOD` (400)
- `INVALID_DELIVERY_ADDRESS` (400)
- `RESTAURANT_CLOSED` (409)
- `RESTAURANT_UNAVAILABLE` (409)
- `CART_ITEMS_UNAVAILABLE` (409, with item details)
- `INVALID_CART` (409)
- `ORDER_NUMBER_RETRY_EXHAUSTED` (503)

### `GET /orders`

Returns up to 100 of the signed-in customer's orders, newest first:

```json
{ "data": { "orders": [ { "...": "order shape" } ] } }
```

### `GET /orders/:id`

Returns one order owned by the customer. A valid id belonging to someone else returns `404 ORDER_NOT_FOUND`.

### `GET /orders/:id/events`

Query: `limit` 1–200, default 100.

Returns the Cassandra timeline for that order. Events are ordered oldest first as stored by the table's clustering order.

```json
{
  "data": {
    "events": [
      {
        "eventId": "8f0e7a1c-3f5b-4c9d-9a11-2b3c4d5e6f70",
        "timestamp": "2026-10-25T10:06:00.000Z",
        "customerId": "6710f0c2b2f4a1d2e3f45000",
        "eventType": "ORDER_PLACED",
        "previousStatus": null,
        "newStatus": "PENDING",
        "description": "Order placed and waiting for restaurant confirmation.",
        "metadata": {
          "orderNumber": "QB-20261025-A1B2C3",
          "restaurantName": "Napoli Slice"
        }
      }
    ],
    "pendingEvents": 0,
    "timelineAvailable": true
  }
}
```

`pendingEvents` counts events still pending in the MongoDB outbox. The UI uses it to keep polling until delivery completes.

Errors:

- `ORDER_NOT_FOUND` (404)
- `TIMELINE_TEMPORARILY_UNAVAILABLE` (503) when Cassandra cannot be read

### `GET /orders/activity`

Query: `limit` 1–100, default 30.

Returns Cassandra activity rows for the signed-in customer, newest first.

```json
{
  "data": {
    "activity": [
      {
        "eventId": "f0e1d2c3-b4a5-4697-8899-a0b1c2d3e4f5",
        "timestamp": "2026-10-25T10:06:24.000Z",
        "orderId": "6710f0c2b2f4a1d2e3f45aaa",
        "orderNumber": "QB-20261025-A1B2C3",
        "eventType": "STATUS_CHANGED",
        "status": "CONFIRMED",
        "description": "Order QB-20261025-A1B2C3 is now confirmed."
      }
    ]
  }
}
```

Errors: `ACTIVITY_TEMPORARILY_UNAVAILABLE` (503).

### `POST /orders/:id/cancel`

No request body. Only allowed while the order is `PENDING`.

Success `200` returns the updated order with `status: "CANCELLED"`, `canCancel: false`, non-null `cancelledAt`, and `nextStatusAt: null`.

Errors:

- `ORDER_NOT_FOUND` (404, including foreign orders)
- `ORDER_CANNOT_CANCEL` (409) once the order has advanced

### Order status reference

```text
PENDING -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED
PENDING -> CANCELLED
```

The API exposes `canCancel: true` only for `PENDING`. Payment status is independent and remains `PENDING` under COD in this demo.

## 9. Error codes

| HTTP | Code | Typical cause |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Zod validation failure |
| 400 | `INVALID_JSON` | Malformed request body |
| 400 | `INVALID_ID` | Non-ObjectId id or field |
| 400 | `UNSUPPORTED_PAYMENT_METHOD` | Anything other than `COD` |
| 400 | `EMPTY_CART` | Checkout with no items |
| 400 | `INVALID_DELIVERY_ADDRESS` | Address missing or not owned |
| 400 | `CURRENT_PASSWORD_INCORRECT` | Wrong current password |
| 401 | `UNAUTHENTICATED` | No/invalid/expired/version-invalid cookie |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password at login |
| 403 | `FORBIDDEN` | Cross-site/state-changing origin rejection |
| 403 | `ORIGIN_NOT_ALLOWED` | CORS origin not allowed |
| 404 | `ROUTE_NOT_FOUND` | Unknown API path |
| 404 | `RESTAURANT_NOT_FOUND` | Restaurant missing/inactive |
| 404 | `FOOD_NOT_FOUND` | Dish missing/disabled |
| 404 | `ADDRESS_NOT_FOUND` | Address missing or foreign |
| 404 | `CART_EMPTY` | No cart while changing quantity |
| 404 | `CART_ITEM_NOT_FOUND` | Dish not present in cart |
| 404 | `ORDER_NOT_FOUND` | Order missing or foreign |
| 409 | `EMAIL_ALREADY_REGISTERED` | Duplicate account email |
| 409 | `DUPLICATE_RECORD` | Other unique-index collision |
| 409 | `RESTAURANT_CLOSED` | Kitchen closed at request time |
| 409 | `RESTAURANT_UNAVAILABLE` | Restaurant inactive at checkout |
| 409 | `FOOD_UNAVAILABLE` | Dish marked unavailable |
| 409 | `CART_RESTAURANT_CONFLICT` | Cart already holds another restaurant |
| 409 | `CART_QUANTITY_LIMIT` | Dish total would exceed 10 |
| 409 | `CART_BUSY` | Six optimistic-lock retries exhausted |
| 409 | `CART_ITEMS_UNAVAILABLE` | One or more checkout items unavailable |
| 409 | `INVALID_CART` | Cart spans restaurants |
| 409 | `ORDER_CANNOT_CANCEL` | Order already advanced |
| 413 | `PAYLOAD_TOO_LARGE` | JSON body over 100 KB |
| 429 | `RATE_LIMITED` | Auth/password attempt limit exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected server error (details hidden) |
| 503 | `TIMELINE_TEMPORARILY_UNAVAILABLE` | Cassandra read failure for timeline |
| 503 | `ACTIVITY_TEMPORARILY_UNAVAILABLE` | Cassandra read failure for activity |
| 503 | `ORDER_NUMBER_RETRY_EXHAUSTED` | Random order-number retries exhausted |

## 10. Quick cURL walkthrough

```bash
# Sign in and keep the cookie
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"demo@quickbite.local","password":"Demo@123"}' \
  http://localhost:4000/api/v1/auth/login

# List restaurants
curl -b cookies.txt http://localhost:4000/api/v1/restaurants

# Inspect the cart
curl -b cookies.txt http://localhost:4000/api/v1/cart

# Sign out
curl -b cookies.txt -c cookies.txt -X POST http://localhost:4000/api/v1/auth/logout
```

On Windows Command Prompt, use `curl.exe` and escape JSON quotes accordingly, or use an HTTP client such as Postman/Insomnia. The API itself is platform-independent.
