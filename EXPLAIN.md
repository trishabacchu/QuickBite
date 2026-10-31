# QuickBite - Simple Explanation (For Mentor)

This project is called **QuickBite**. It is an Online Food Ordering System. We used **MongoDB** and **Apache Cassandra** together to show how two different NoSQL databases are used for different purposes.

## 1. Why Do We Use Two Databases?

We don't put everything in one database. We use two because they solve two different problems:

- **MongoDB** - Stores *current* data. This keeps changing as users do things (add to cart, place order, cancel order).
- **Cassandra** - Stores *history* data. This is an append-only record. Once an event happens, we just add it and never change it.

**Simple Rule:** 

- *If the data needs to be updated/changed -> MongoDB*
- *If the data is just a record of what happened -> Cassandra*

## 2. What is MongoDB Used For?

MongoDB is the **main database** here. It is our "source of truth". 

All the live information of the app goes into MongoDB.

| Collection | Purpose | Explanation |
|---|---|---|
| **customers** | User Accounts | Stores name, email, password (encrypted), and phone number of the customer. |
| **restaurants** | Restaurant List | Stores restaurant details like name, cuisine, opening/closing time and delivery fee. |
| **food_items** | Menu Items | Stores each food item with its price (in paise), image, category and availability. |
| **carts** | Shopping Cart | Stores the items added by the customer. Only 1 cart per customer and only from 1 restaurant. |
| **addresses** | Delivery Addresses | Stores saved addresses of the customer (like Home). |
| **orders** | Orders Placed | This is the most important one. It stores the full order with items, price, address, order status, etc. |

**In simple words:** MongoDB holds everything the app needs to show right now (Menu, Cart, My Orders, Profile).

## 3. What is Cassandra Used For?

Cassandra is used only for **Order History & Timeline**. 

We don't use it for login, cart, or placing an order. We use it to show *"What happened to this order?"* and *"What all orders did this customer do?"*

We have **2 tables** in Cassandra.

| Table | Purpose | Explanation |
|---|---|---|
| **order_events_by_order** | Order Timeline | Shows step by step for ONE order. (e.g., Order Placed -> Confirmed -> Preparing -> Out for Delivery -> Delivered). Oldest to newest. |
| **customer_order_activity_by_customer** | Customer Activity | Shows all recent activities of ONE customer across all their orders. (e.g., Placed order, Cancelled order). Newest to oldest. |

**In simple words:** Cassandra keeps a clean history of every order event, just like a receipt trail.

## 4. How Do MongoDB and Cassandra Work Together? (Outbox Pattern)

We don't directly write to Cassandra at the same time as placing an order. We follow a simple method called the **Event Outbox Pattern**.

Here's how it works step by step:

1. **Order Created** - When a customer places an order, we first save it in MongoDB (`orders` collection) along with its status `PENDING`.
2. **Event Added to Outbox** - At the same time, we add an event like `ORDER_PLACED` inside that same order document in MongoDB. This is called the **Outbox**.
3. **Worker Picks It Up** - A background worker keeps checking MongoDB for any pending events in the outbox.
4. **Copied to Cassandra** - The worker takes that event and saves it in **both** Cassandra tables (`order_events_by_order` and `customer_order_activity_by_customer`).
5. **Marked as Done** - Once successfully saved in Cassandra, the worker marks that event as `delivered` in MongoDB.

**Why this?** 

If for some reason Cassandra is down for a second, the event stays in MongoDB safely and will be sent later when it's back up. Nothing is lost.

## 5. Order Status Flow (Easy to Explain)

When an order is placed, it doesn't go straight to "Delivered". A background worker automatically moves it forward every few seconds for demo purpose.

```text
PENDING -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED
                (OR)
PENDING -> CANCELLED  (Only allowed from PENDING)
```

- **MongoDB** keeps the *current status* of the order.
- **Cassandra** keeps *every single change* as a separate event in the timeline.

## 6. Simple Demo Flow (Show This to Mentor)

Follow this order while showing on screen.

1. **Login** - Login with `demo@quickbite.local / Demo@123`
2. **Browse** - Show restaurants and food items (All coming from **MongoDB**)
3. **Add to Cart** - Add items to cart (Saved in **MongoDB**)
4. **Place Order** - Checkout and place the order. Explain: *"First saved in MongoDB as PENDING. Then event goes to outbox and copied to Cassandra."*
5. **Order Details Page** - Open "My Orders" -> Click on the order. Show the **Timeline**. Tell them *"This timeline is coming from Cassandra."*
6. **Wait & Show** - After a few seconds status changes. Explain *"MongoDB updated the current status, Cassandra added a new event for this change."*
7. **Activity Feed** - Show "Activity" section. Explain *"This comes from the customer activity table in Cassandra."*

## 7. Key Points To Say To Your Mentor

Keep these short points in mind:

- **MongoDB = Live Data** - "We use MongoDB for all current and changeable data like cart, orders and menu."
- **Cassandra = History Data** - "We use Cassandra to store the order timeline and activity feed as a permanent history."
- **Outbox Pattern** - "Instead of writing to both at same time, we write to MongoDB first, then copy to Cassandra using an outbox worker. This keeps it safe and reliable."
- **Two Tables for Two Views** - "For one order we need oldest-first timeline. For all orders of a customer we need newest-first activity. So we made two different tables in Cassandra for efficient reading."
- **Data is never lost** - "If Cassandra fails, the events remain in MongoDB outbox and are retried automatically."

**Main thing to remember:** 

> *"MongoDB tells us **"Where is this order right now?"** and Cassandra tells us **"How did we get here?"***"
