# PROJECT REVIEW - TECHNICAL DOCUMENTATION

## 1. ABSTRACT

QuickBite is a customer-facing Online Food Ordering and Delivery System developed as a NoSQL-based laboratory project. The main aim of this project is to demonstrate the practical use of two different NoSQL databases i.e., **MongoDB** and **Apache Cassandra** for handling different types of data efficiently.

MongoDB is used to store real-time and operational data such as user details, restaurant menus, carts, addresses and orders. Apache Cassandra is used to store the order history and event timeline as an append-only log. The project also demonstrates the **Event Outbox Pattern** to ensure reliable data transfer between MongoDB and Cassandra without any data loss.

## 2. TECHNOLOGIES USED

| LAYER | TECHNOLOGY USED |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, React Router 7, Tailwind CSS 4, Lucide React |
| **Backend** | Node.js, Express.js, Zod, Mongoose, bcryptjs, jsonwebtoken |
| **NoSQL Database 1** | MongoDB 7.0 (Mongoose ODM) |
| **NoSQL Database 2** | Apache Cassandra 5.0 (cassandra-driver) |
| **Testing** | Vitest, Supertest |
| **Containerization** | Docker & Docker Compose |

## 3. NOSQL DATABASES USED IN DETAIL

### 3.1 MongoDB (Document Oriented Database)

MongoDB is a schema-flexible, document-oriented NoSQL database. In QuickBite, it acts as the **Source of Truth**. All data that requires frequent updates is stored here.

**Collections Used:**

| Collection | Purpose |
| :--- | :--- |
| **customers** | Stores user account details with encrypted password and token version. |
| **restaurants** | Stores restaurant info, cuisine, opening/closing time, timezone and delivery fee. |
| **food_items** | Stores menu items with price in paise, category, image and availability. |
| **carts** | Stores the customer's cart (only 1 cart per customer and only from 1 restaurant). |
| **addresses** | Stores saved delivery addresses of the customer (e.g., Home). |
| **orders** | Stores placed orders with items, prices, snapshots, current status and embedded outbox events. |

**Reason for using MongoDB:** Data is stored in JSON-like documents, related data can be embedded easily (like order items), and it is ideal for data that changes often like carts and order status.

### 3.2 Apache Cassandra (Wide Column Store)

Apache Cassandra is a highly scalable, distributed wide-column NoSQL database. In QuickBite, we use it only for **storing order event history**. It is **not** used for login, cart or checkout. Cassandra is ideal here as it is designed for high-speed writes of time-based data.

**Tables Used:**

| Table | Purpose |
| :--- | :--- |
| **order_events_by_order** | Partitioned by `order_id`. Stores every event for a single order in ascending order of time (Oldest → Newest). Used to display the **Order Timeline**. |
| **customer_order_activity_by_customer** | Partitioned by `customer_id`. Stores all activities of a customer in descending order of time (Newest → Oldest). Used to display the **Customer Activity Feed**. |

**Reason for using Cassandra:** The same events need to be viewed in two different ways. By designing two separate query-specific tables, we get the exact order we need without any extra sorting. Also, Cassandra is perfect for storing an immutable, append-only history.

## 4. FLOW DIAGRAM & HOW THEY CONNECT

### Flow Explanation

1. **User Action** – The customer logs in, browses the menu, adds items to the cart and places an order.
2. **MongoDB (Primary)** – The order is first saved in the `orders` collection with status `PENDING`. At the same time, an event (`ORDER_PLACED`) is added to the `eventOutbox` array of that same order document.
3. **Event Outbox Pattern** – Instead of writing directly to Cassandra, we write to MongoDB first. This keeps the system safe and reliable.
4. **Outbox Worker** – A background worker continuously checks MongoDB for any pending outbox events. When it finds one, it delivers it to Cassandra.
5. **Cassandra (History)** – The same event is inserted into both Cassandra tables. One for the order timeline and the other for the customer activity feed.
6. **Order Status Worker** – Another background worker automatically updates the order status in MongoDB step by step (`PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED`). For every status change, a new event is created in the outbox and copied to Cassandra.
7. **Display** – The current order status is fetched from **MongoDB**. The full step-by-step timeline and activity feed are fetched from **Cassandra**.

### Simple Flow Diagram (Text Form)

```text
[User] --> [React Frontend] --> [Express API]
                    |                    |
                  [MongoDB]        [Order Status Worker]
                    |                & [Outbox Worker]
                  [Event Outbox]          |
                       \________________/
                                |
                              [Cassandra]
                        (order_events_by_order
                    & customer_order_activity_by_customer)
```

**Simple Way to Understand:**

> *"MongoDB tells us **'Where is this order right now?'** and Cassandra tells us **'How did we get here?'**"*

## 5. CONCLUSION

QuickBite clearly demonstrates the effective use of two NoSQL databases together. **MongoDB** handles all live and changeable data, while **Apache Cassandra** handles the complete and immutable order history. 

By implementing the **Event Outbox Pattern**, events are transferred securely from MongoDB to Cassandra with automatic retries in case of failure. Using two query-specific tables in Cassandra also shows how we can design for different read requirements efficiently.

Thus, this project proves that choosing the right database based on the **nature of data** (current vs history) is the correct and practical approach.

**Prepared By:** QuickBite Project Team  
**Date:** 30-10-2026
