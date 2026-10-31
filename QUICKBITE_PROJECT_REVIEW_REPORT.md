# QUICKBITE - PROJECT REVIEW REPORT

**A NO-SQL BASED ONLINE FOOD ORDERING AND DELIVERY SYSTEM**

## SUBMITTED BY

[Student Names]  
[Roll Numbers]  

## UNDER THE GUIDANCE OF

[Project Guide Name]  
[Designation]

## DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING

[College Name]  
[College Address]

**DATE OF SUBMISSION: 30-10-2026**

---

## TABLE OF CONTENTS

1. [ABSTRACT](#1-abstract)
2. [INTRODUCTION](#2-introduction)
3. [OBJECTIVES OF THE PROJECT](#3-objectives-of-the-project)
4. [SCOPE OF THE PROJECT](#4-scope-of-the-project)
5. [LITERATURE SURVEY](#5-literature-survey)
6. [EXISTING SYSTEM VS PROPOSED SYSTEM](#6-existing-system-vs-proposed-system)
7. [TECHNOLOGY STACK USED](#7-technology-stack-used)
8. [NOSQL DATABASES USED - IN DETAIL](#8-nosql-databases-used---in-detail)
9. [SYSTEM DESIGN & ARCHITECTURE](#9-system-design--architecture)
10. [DATABASE DESIGN](#10-database-design)
11. [FLOW DIAGRAM & WORKING OF THE SYSTEM](#11-flow-diagram--working-of-the-system)
12. [EVENT OUTBOX PATTERN (CORE CONCEPT)](#12-event-outbox-pattern-core-concept)
13. [ORDER STATUS WORKER & ORDER LIFECYCLE](#13-order-status-worker--order-lifecycle)
14. [IMPLEMENTATION DETAILS](#14-implementation-details)
15. [TESTING](#15-testing)
16. [ADVANTAGES OF THE SYSTEM](#16-advantages-of-the-system)
17. [LIMITATIONS OF THE SYSTEM](#17-limitations-of-the-system)
18. [FUTURE ENHANCEMENTS](#18-future-enhancements)
19. [CONCLUSION](#19-conclusion)
20. [REFERENCES](#20-references)
21. [BIBLIOGRAPHY](#21-bibliography)

---

## 1. ABSTRACT

QuickBite is a customer-facing Online Food Ordering and Delivery System developed as a NoSQL laboratory project. The primary objective of this project is to demonstrate the practical implementation and effective utilization of two heterogeneous NoSQL databases, namely **MongoDB** and **Apache Cassandra**, for handling different categories of data based on their nature and access patterns. 

In this system, **MongoDB**, a document-oriented NoSQL database, acts as the central operational database and serves as the **"Source of Truth"**. It is used to store real-time and frequently changing data such as customer details, restaurant information, food menus, shopping carts, delivery addresses and active orders. On the other hand, **Apache Cassandra**, a wide-column distributed NoSQL database, is used exclusively to maintain an **append-only order history and event timeline**. 

To ensure reliable and fault-tolerant communication between these two databases, the system implements the **Event Outbox Pattern**. When any order-related event occurs (like order placement or status change), it is first recorded in MongoDB's outbox. A dedicated background worker then asynchronously transfers these events to Cassandra without risking data loss, even in the event of temporary Cassandra unavailability. 

The project successfully showcases how different NoSQL paradigms can be integrated together to build a scalable, efficient and real-world inspired food ordering system.

---

## 2. INTRODUCTION

With the rapid growth of internet usage and the increasing demand for convenience, online food ordering systems have become an integral part of modern-day life. Customers prefer the ease of browsing menus, placing orders and tracking their deliveries from the comfort of their homes. 

Traditional Relational Database Management Systems (RDBMS) use structured tables with fixed schemas and enforce strict ACID properties. While suitable for many applications, they may become rigid when dealing with semi-structured data, rapid schema evolution or high write volumes. 

This is where **NoSQL databases** come into picture. NoSQL databases are designed to handle large volumes of unstructured, semi-structured and rapidly changing data with greater flexibility and scalability. 

The **QuickBite** project aims to practically demonstrate this concept by implementing a food ordering system using **two different NoSQL databases simultaneously**. Instead of forcing all data into a single database, we carefully analyse the data type and choose the most appropriate NoSQL database for each use case. 

The key highlight of this project is the separation of **"Current/Operational Data"** (handled by MongoDB) and **"Historical/Event Data"** (handled by Apache Cassandra), connected through the Event Outbox Pattern.

---

## 3. OBJECTIVES OF THE PROJECT

The main objectives of this project are as follows:

1. **To implement a Customer-Facing Food Ordering System** - To design and develop an end-to-end system that allows customers to browse restaurants, view menus, add items to cart, place orders and track them.
2. **To demonstrate MongoDB Usage** - To use MongoDB as a document-oriented database for storing frequently updated operational data.
3. **To demonstrate Apache Cassandra Usage** - To use Cassandra as a wide-column store for maintaining order history and event timelines.
4. **To understand Polyglot Persistence** - To showcase the concept of using multiple databases in a single application based on their strengths.
5. **To implement the Event Outbox Pattern** - To ensure reliable, decoupled and fault-tolerant data transfer between MongoDB and Cassandra.
6. **To implement Order Lifecycle Management** - To simulate real-world order flow with multiple statuses using background workers.
7. **To ensure Data Consistency and Reliability** - To maintain data integrity using server-side validations, snapshots and atomic operations.
8. **To gain hands-on experience with Modern Web Technologies** - To work with React, Node.js, Express, and containerized databases using Docker.

---

## 4. SCOPE OF THE PROJECT

### 4.1 In Scope

- **User Authentication** - Secure customer registration and login using JWT stored in HttpOnly cookies.
- **Restaurant & Menu Browsing** - View available restaurants, food items, categories and prices.
- **Cart Management** - Add/remove items, quantity control (1-10 per item), single restaurant per cart with replacement confirmation.
- **Order Placement** - Place orders with Cash on Delivery (COD) only.
- **Order Tracking** - View real-time order status and detailed step-by-step timeline.
- **Order History & Activity Feed** - View past orders and customer activity fetched from Cassandra.
- **Order Cancellation** - Cancel orders only when in `PENDING` state.
- **Simulated Order Progression** - Automated background worker to move orders through different statuses.
- **NoSQL Integration** - Practical demonstration of MongoDB and Cassandra working together.

### 4.2 Out of Scope

- Admin dashboard, Restaurant owner panel or Delivery partner panel
- Online payment gateway integration
- Real-time GPS tracking
- Push notifications or WebSocket-based live updates
- Food reviews and ratings system
- Image upload functionality
- Multiple payment modes

---

## 5. LITERATURE SURVEY

Several food ordering platforms exist in the market such as Swiggy, Zomato and Foodpanda. These are large-scale, production-ready systems that use complex microservices architecture with a combination of SQL and NoSQL databases. 

However, for academic purposes, it is important to understand the **why** behind choosing specific databases rather than just using them. Many lab-level projects use only MongoDB or only MySQL, which doesn't showcase polyglot persistence. 

**QuickBite** bridges this gap by clearly demonstrating that:
- Operational, frequently modified data is best suited for **MongoDB** (document model)
- Immutable, time-ordered event logs are best suited for **Cassandra** (wide-column model optimized for writes)

This approach helps in understanding how real-world systems separate concerns across databases for better efficiency.

---

## 6. EXISTING SYSTEM VS PROPOSED SYSTEM

| S.No | Feature | Existing Systems | **Proposed System (QuickBite)** |
| :--: | :--- | :--- | :--- |
| 1. | **Database Usage** | Mostly use a single primary database | Uses **two NoSQL databases** (MongoDB + Cassandra) together |
| 2. | **Focus** | Feature-rich with many user roles | Focused on demonstrating **NoSQL concepts** clearly |
| 3. | **Data Separation** | Mixed storage approach | Clear separation: **Current data vs History data** |
| 4. | **Event Logging** | Often done in same DB or logs table | Uses **Event Outbox Pattern** to sync to Cassandra |
| 5. | **Order Timeline** | Simple status display | Detailed **step-by-step timeline** fetched from Cassandra |
| 6. | **Learning Value** | Less focused on DB design concepts | High emphasis on **Polyglot Persistence** and distributed DB concepts |

---

## 7. TECHNOLOGY STACK USED

### 7.1 Frontend Technologies

| Technology | Purpose |
| :--- | :--- |
| **React 19** | Component-based UI library for building interactive user interfaces |
| **Vite 8** | Fast build tool and development server with Hot Module Replacement |
| **React Router 7** | Client-side routing for smooth navigation between pages |
| **Tailwind CSS 4** | Utility-first CSS framework for rapid and clean UI development |
| **Lucide React** | Modern and consistent icon library |

### 7.2 Backend Technologies

| Technology | Purpose |
| :--- | :--- |
| **Node.js 20+** | JavaScript runtime environment for server-side development |
| **Express.js 4** | Minimal and flexible web framework for building REST APIs |
| **Zod 4** | Schema validation library for request body, params and queries |
| **Mongoose 8** | ODM (Object Document Mapper) for MongoDB with schema support |
| **bcryptjs** | Library for securely hashing passwords |
| **jsonwebtoken (JWT)** | For generating and verifying authentication tokens |
| **cassandra-driver 4** | Official Node.js driver to connect and interact with Apache Cassandra |

### 7.3 Database Technologies

| Database | Type | Usage in Project |
| :--- | :--- | :--- |
| **MongoDB 7.0** | Document-Oriented NoSQL | Stores operational data - customers, restaurants, menus, carts, addresses, orders |
| **Apache Cassandra 5.0** | Wide-Column NoSQL | Stores append-only order events - timelines and activity feeds |

### 7.4 Tools & Testing

| Tool | Purpose |
| :--- | :--- |
| **Vitest 5** | Fast unit and integration testing framework |
| **Supertest 7** | Used to test HTTP endpoints of the Express API |
| **Docker & Docker Compose** | For containerizing and running MongoDB and Cassandra locally |
| **npm Workspaces** | To manage frontend and backend together in a monorepo structure |

---

## 8. NOSQL DATABASES USED - IN DETAIL

### 8.1 MongoDB - Document Oriented Database

MongoDB is an open-source, cross-platform, document-oriented NoSQL database. Instead of storing data in rows and columns like RDBMS, MongoDB stores data as **BSON documents** (Binary JSON) inside collections.

**Key Features of MongoDB used in this project:**

- **Flexible Schema** - Documents can have different fields, making it easy to evolve the schema.
- **Embedded Documents** - Order items and snapshots are embedded directly inside the order document.
- **Rich Querying** - Easy filtering, updating and sorting using Mongoose.
- **Atomic Updates** - Used for cart updates and order status changes.
- **Indexing** - Improves query performance on frequently accessed fields.

**Why MongoDB for QuickBite?** Since cart, menu and order details change frequently throughout the day, MongoDB is the perfect choice. It allows quick reads and writes without complex joins.

### 8.2 Apache Cassandra - Wide Column Store

Apache Cassandra is a distributed, highly available, column-family based NoSQL database. It is designed for handling massive write operations and providing high availability with no single point of failure. 

Unlike MongoDB, Cassandra follows a **query-first design**. We design tables based on the exact queries our application needs to run, rather than normalizing data.

**Key Features of Cassandra used in this project:**

- **Partition Key & Clustering Key** - Used to distribute data efficiently across nodes and maintain proper sorting.
- **Append-Only Writes** - Ideal for logging events without updates/deletes.
- **Time-Ordered Data** - Clustering keys help maintain chronological order automatically.
- **Denormalization** - Same event is stored in two different tables to serve two different views.
- **Tunable Consistency** - Suitable for this distributed event logging use case.

**Why Cassandra for QuickBite?** The order timeline requires fetching all events for a single order in chronological order. The activity feed requires fetching events for a single customer in reverse chronological order. Cassandra can serve both efficiently with purpose-built tables.

---

## 9. SYSTEM DESIGN & ARCHITECTURE

### 9.1 Overall Architecture

QuickBite follows a **3-Tier Architecture** consisting of:

1. **Presentation Layer (Frontend)** - React SPA running on Vite dev server
2. **Application Layer (Backend)** - Node.js + Express REST API
3. **Data Layer (Databases)** - MongoDB and Apache Cassandra

### 9.2 Architectural Flow

```
Browser (React) --> Express API --> MongoDB (Operational Data)
                                --> Cassandra (Event History)
```

### 9.3 Key Architectural Concepts

- **RESTful API Design** - All endpoints follow REST principles under `/api/v1/`
- **Cookie-Based Authentication** - JWT stored in secure HttpOnly cookie for better security
- **Separation of Concerns** - Controllers, Services, Models and Routes are properly separated
- **Background Workers** - Order Status Worker and Event Outbox Dispatcher run independently
- **Polyglot Persistence** - Right database for the right data

---

## 10. DATABASE DESIGN

### 10.1 MongoDB Collections Design

| Collection | Description | Key Fields |
| :--- | :--- | :--- |
| **customers** | User accounts | `_id`, `name`, `email` (unique), `passwordHash`, `phone`, `tokenVersion` |
| **restaurants** | Restaurant details | `_id`, `slug` (unique), `name`, `cuisine`, `openingTime`, `closingTime`, `timezone`, `deliveryFeePaise` |
| **food_items** | Menu items | `_id`, `restaurantId`, `name`, `pricePaise`, `category`, `isAvailable`, `isActive` |
| **carts** | Shopping carts | `_id`, `customerId` (unique), `restaurantId`, `items[{foodItemId, quantity}]`, `__v` |
| **addresses** | Delivery addresses | `_id`, `customerId`, `label`, `line1`, `city`, `state`, `postalCode` |
| **orders** | Orders with snapshots | `_id`, `orderNumber` (unique), `customerId`, `restaurantSnapshot`, `items[]`, `totalPaise`, `status`, `eventOutbox[]` |

**Note:** All monetary values are stored as **integer paise** to avoid floating-point precision errors.

### 10.2 Cassandra Tables Design

#### A) `order_events_by_order`

```sql
CREATE TABLE order_events_by_order (
  order_id text,
  event_timestamp timestamp,
  event_id uuid,
  customer_id text,
  event_type text,
  previous_status text,
  new_status text,
  description text,
  metadata text,
  PRIMARY KEY ((order_id), event_timestamp, event_id)
) WITH CLUSTERING ORDER BY (event_timestamp ASC, event_id ASC);
```

- **Partition Key:** `order_id` - Groups all events of a single order together
- **Clustering Keys:** `event_timestamp`, `event_id` - Ensures chronological order (Oldest to Newest)
- **Purpose:** Powers the "Order Timeline" on the order details page

#### B) `customer_order_activity_by_customer`

```sql
CREATE TABLE customer_order_activity_by_customer (
  customer_id text,
  activity_timestamp timestamp,
  event_id uuid,
  order_id text,
  order_number text,
  event_type text,
  status text,
  description text,
  PRIMARY KEY ((customer_id), activity_timestamp, event_id)
) WITH CLUSTERING ORDER BY (activity_timestamp DESC, event_id DESC);
```

- **Partition Key:** `customer_id` - Groups all activities of a single customer
- **Clustering Keys:** `activity_timestamp`, `event_id` - Ensures reverse chronological order (Newest to Oldest)
- **Purpose:** Powers the "My Activity" feed

---

## 11. FLOW DIAGRAM & WORKING OF THE SYSTEM

### 11.1 End-to-End Working Flow

1. **Registration/Login** - Customer registers or logs in. Authentication details are validated and a JWT is issued in an HttpOnly cookie.
2. **Browse Restaurants** - Available restaurants are fetched from MongoDB along with their opening hours.
3. **View Menu** - Food items for the selected restaurant are displayed from MongoDB.
4. **Add to Cart** - Items are added to cart. System ensures only one restaurant's items can be in cart at a time.
5. **Checkout** - Customer selects delivery address and proceeds. Server re-validates prices, availability and restaurant status.
6. **Order Placement** - Order is created in MongoDB with immutable snapshots of items, restaurant and address. Status set to `PENDING`. `ORDER_PLACED` event pushed to outbox.
7. **Event Sync** - Outbox worker copies the event to both Cassandra tables.
8. **Order Progression** - Order Status Worker automatically advances the order through statuses every 12 seconds for demonstration.
9. **Event Logging** - Every status change generates a new event, pushed to outbox and synced to Cassandra.
10. **Tracking** - Customer can view current status from MongoDB and full timeline from Cassandra.
11. **Completion/Cancellation** - Order reaches `DELIVERED` or gets `CANCELLED` (only if still `PENDING`).

### 11.2 Visual Flow Representation

```
CUSTOMER (Browser)
        ↓
   REACT FRONTEND
        ↓  (HTTP Requests with Cookie)
   EXPRESS REST API
        ↓
      MONGODB ──(Outbox Events)──► OUTBOX WORKER ──► CASSANDRA
        ↓                                              ↓
    [Current Data]                            [Order History & Timeline]
    - Users, Cart, Orders                      - order_events_by_order
                                               - customer_order_activity_by_customer
```

---

## 12. EVENT OUTBOX PATTERN (CORE CONCEPT)

### 12.1 What is Event Outbox Pattern?

The **Event Outbox Pattern** is a reliable messaging pattern used to ensure that events are published to a message/event store without data inconsistency. Instead of making two separate database calls (one to MongoDB, another to Cassandra) in the same transaction, we make **only one write to MongoDB** and handle the second write asynchronously.

### 12.2 Why Use This Pattern?

If we directly write to Cassandra while placing an order and Cassandra is temporarily unavailable, the order might be created in MongoDB but the timeline event might be lost. This creates inconsistency between the two databases. 

The Outbox Pattern solves this by treating MongoDB as the **single source of truth** for events as well, until they are successfully delivered to Cassandra.

### 12.3 Step-by-Step Working

| Step | Action | Explanation |
| :--: | :--- | :--- |
| **1.** | **Event Creation** | When order is placed or status changes, API creates an event object with a unique `eventId` and timestamp. |
| **2.** | **Outbox Write** | This event is pushed into `orders.eventOutbox[]` array using the **same MongoDB update operation** as the order change. |
| **3.** | **Transaction Safety** | Both the order status update and outbox event addition happen together in one atomic operation. |
| **4.** | **Polling by Worker** | The `event-outbox.service` runs periodically and finds orders that have pending outbox events with `nextAttemptAt <= current time`. |
| **5.** | **Delivery** | Worker calls Cassandra driver to insert the event into both tables using `eventId` as part of the key. |
| **6.** | **Acknowledgement** | On successful insert into both Cassandra tables, MongoDB marks that specific event as `delivered` with `deliveredAt` timestamp. |
| **7.** | **Retry on Failure** | If delivery fails, the event remains pending. `attempts` count increases, and `nextAttemptAt` is set using **exponential backoff**. |

### 12.4 Advantages of Outbox Pattern

- **Reliability** - Events are never lost, even if Cassandra is down
- **Decoupling** - API doesn't wait for Cassandra, making requests faster
- **Consistency** - MongoDB remains the source of truth
- **Retry Mechanism** - Failed events are automatically retried
- **Idempotent** - Using stable `eventId` prevents duplicate entries in Cassandra

---

## 13. ORDER STATUS WORKER & ORDER LIFECYCLE

### 13.1 Order Lifecycle States

The system follows a predefined order lifecycle as shown below:

```
PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED
                ↘
               CANCELLED (Only from PENDING)
```

### 13.2 Status Descriptions

| Status | Description |
| :--- | :--- |
| **PENDING** | Order placed successfully, waiting to be confirmed by the system. |
| **CONFIRMED** | Order has been confirmed and accepted. |
| **PREPARING** | Restaurant is preparing the food. |
| **READY_FOR_PICKUP** | Food is ready and awaiting pickup by delivery personnel. |
| **OUT_FOR_DELIVERY** | Order is on the way to the customer's location. |
| **DELIVERED** | Order has been successfully delivered. (Terminal State) |
| **CANCELLED** | Order cancelled by the customer. Allowed only from PENDING state. (Terminal State) |

### 13.3 How the Worker Works

- A background worker (`order-status.worker.js`) runs continuously in the backend.
- It queries MongoDB for orders where `status` is not terminal and `nextStatusAt <= current time`.
- For each such order, it atomically updates the status to the next state.
- Along with the status update, it adds a corresponding `STATUS_CHANGED` event to the `eventOutbox`.
- The Outbox Worker later syncs this event to Cassandra, updating the timeline.
- This entire process is automated to simulate a realistic order flow.

**Important Note:** In this demo, status transitions happen automatically every **12 seconds** purely for demonstration purposes.

---

## 14. IMPLEMENTATION DETAILS

### 14.1 Project Structure Overview

```
QuickBite/
├── backend/        # Express API, Models, Services, Workers
├── frontend/       # React + Vite SPA
├── database/seed/  # Demo data for restaurants & foods
├── docs/           # Detailed project documentation
├── scripts/        # Dev startup, verification scripts
└── docker-compose.yml
```

### 14.2 Key Modules

| Module | Description |
| :--- | :--- |
| **Authentication Module** | Handles registration, login, logout with JWT in HttpOnly cookie and token versioning |
| **Catalogue Module** | Manages restaurants and food items with availability and opening hours logic |
| **Cart Module** | Handles cart operations with restaurant conflict resolution and quantity validation |
| **Order Module** | Manages checkout, order creation, cancellation and order history |
| **Outbox Service** | Handles reliable delivery of events from MongoDB to Cassandra with retries |
| **Workers** | Order status progression and outbox event dispatching |
| **Cassandra Service** | Manages connection, schema initialization and event insertion |

### 14.3 Security Measures Implemented

- **Password Hashing** - Using bcryptjs with secure hashing
- **HttpOnly Cookies** - Prevents XSS from accessing JWT tokens
- **Token Versioning** - Allows invalidating all sessions on password change
- **Origin Check** - Validates requests from allowed origins
- **Zod Validation** - Strict validation of all incoming requests
- **Server-Side Price Validation** - Prices are always fetched from DB, never trusted from client
- **Ownership Checks** - Users can only access their own orders and cart

---

## 15. TESTING

The backend is thoroughly tested using **Vitest** and **Supertest** to ensure correctness of all business logic.

### 15.1 Testing Approach

- **Integration Testing** - Tests cover complete API flows from request to database
- **Isolated Test Environment** - Tests use separate databases: `quickbite_test` (MongoDB) and `quickbite_test` (Cassandra)
- **Clean State** - Test setup clears test data before each run
- **Real Database Testing** - Uses actual MongoDB and Cassandra instances to test real behavior

### 15.2 Test Coverage Areas

| Test Suite | Coverage |
| :--- | :--- |
| **Auth Tests** | Registration, login, logout, session validation, token invalidation |
| **Catalogue & Cart Tests** | Menu fetching, cart rules, restaurant conflicts, quantity limits |
| **Checkout Tests** | Validation, price re-computation, snapshot creation, cart clearing |
| **Order & Cancellation Tests** | Order creation, cancellation rules, ownership checks |
| **Lifecycle Tests** | Full status progression through all stages |
| **Outbox & Cassandra Tests** | Event delivery, retries, idempotency, both tables |
| **Availability Tests** | Opening hours, cross-midnight logic, closed restaurant handling |
| **System Tests** | Health and readiness endpoints |

**Result:** All **41 backend integration tests** pass successfully.

---

## 16. ADVANTAGES OF THE SYSTEM

- **Practical NoSQL Implementation** - Demonstrates real usage of two different NoSQL databases
- **Polyglot Persistence** - Right tool for the right job approach
- **Data Separation** - Clear distinction between current and historical data
- **Fault Tolerant** - Outbox pattern ensures no event loss
- **Scalable Design** - Cassandra is highly scalable for write-heavy event logs
- **Fast Operations** - MongoDB provides quick reads/writes for transactional data
- **Query Optimized** - Purpose-built Cassandra tables for exact use cases
- **Clean Architecture** - Well-structured, modular and easy to understand
- **Secure** - Multiple layers of authentication and validation
- **Accurate History** - Immutable event log shows complete order journey
- **Real-World Concepts** - Teaches outbox pattern, workers, snapshots and denormalization

---

## 17. LIMITATIONS OF THE SYSTEM

- **Customer-Only Scope** - No admin, restaurant or delivery partner interfaces
- **Simulated Lifecycle** - Order status progression is automated, not real
- **Single Payment Mode** - Only Cash on Delivery is supported
- **Local Deployment** - Designed for local/demo use, not production scale
- **In-Memory Rate Limiting** - Works for single instance only
- **Single Node Cassandra** - Uses SimpleStrategy with RF=1 for local setup
- **Limited Search** - Basic substring search on menu items
- **No Real-Time Updates** - Requires page refresh to see some updates (though workers run in background)
- **Network Dependency** - Food images load from external URLs

---

## 18. FUTURE ENHANCEMENTS

- **Role-Based Dashboards** - Add Admin, Restaurant and Delivery Partner panels
- **Online Payment Integration** - Integrate Razorpay/Stripe for digital payments
- **Real-Time Tracking** - Implement WebSocket for live order updates
- **Push Notifications** - Notify customers on status changes
- **Reviews & Ratings** - Allow customers to rate restaurants and food items
- **Advanced Search & Filters** - Add filters by cuisine, price range, ratings
- **Geolocation Support** - Add location-based restaurant suggestions
- **Order Scheduling** - Allow customers to schedule orders for later
- **Multi-Node Cassandra Cluster** - Deploy on a proper distributed cluster
- **Redis Caching** - Add caching for frequently accessed menu data

---

## 19. CONCLUSION

The **QuickBite** project successfully achieves its objective of demonstrating the practical use of **MongoDB** and **Apache Cassandra** together in a real-world application scenario. 

By adopting **Polyglot Persistence**, the project clearly shows that no single database is perfect for all use cases. **MongoDB** proves to be ideal for handling dynamic, transactional data like user accounts, carts and orders. **Apache Cassandra** proves to be highly efficient for storing immutable, time-series event data like order timelines and activity logs. 

The implementation of the **Event Outbox Pattern** ensures reliable synchronization between both databases, making the system robust and fault-tolerant. The background workers, server-side validations, immutable snapshots and query-optimized Cassandra tables all contribute to building a well-thought-out system. 

Overall, this project provides valuable hands-on experience in **NoSQL database design, distributed data handling, asynchronous event processing and full-stack development**. It successfully demonstrates the core idea: 

> **"Use MongoDB to know the current state of an order, and use Cassandra to know the complete journey of that order."**

---

## 20. REFERENCES

1. MongoDB Official Documentation - [https://www.mongodb.com/docs/](https://www.mongodb.com/docs/)
2. Apache Cassandra Official Documentation - [https://cassandra.apache.org/doc/latest/](https://cassandra.apache.org/doc/latest/)
3. Mongoose ODM Documentation - [https://mongoosejs.com/docs/](https://mongoosejs.com/docs/)
4. DataStax Node.js Driver Documentation - [https://docs.datastax.com/en/developer/nodejs-driver/](https://docs.datastax.com/en/developer/nodejs-driver/)
5. Express.js Documentation - [https://expressjs.com/](https://expressjs.com/)
6. React Official Documentation - [https://react.dev/](https://react.dev/)
7. Martin Fowler - Event Sourcing & Outbox Pattern - [https://martinfowler.com/](https://martinfowler.com/)
8. Vite Documentation - [https://vitejs.dev/](https://vitejs.dev/)

---

## 21. BIBLIOGRAPHY

- Kristina Chodorow, *MongoDB: The Definitive Guide*, O'Reilly Media
- Eben Hewitt, *Cassandra: The Definitive Guide*, O'Reilly Media
- Kyle Simpson, *You Don't Know JS*, O'Reilly Media
- Alex Banks & Eve Porcello, *Learning React*, O'Reilly Media
- Official MongoDB University & DataStax Academy Learning Resources
- Various Open-Source Documentation and Community Tutorials
