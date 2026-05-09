# Person 1 — Implementation Plan
## Role: Frontend (ReactJS) + Cart PU (PU2) + Order PU (PU3)

> **Architecture**: Space-Based Architecture — Flash Sale System
> **Machine**: Máy A
> **Services**: Frontend (:3000), Cart PU (:8082), Order PU (:8083)
> **Partner (Máy B)**: Redis (:6379), Product PU (:8081), Inventory PU (:8084)

---

## Important Context

- This is a **Space-Based Architecture** assignment. The core principle is: **NO DATABASE**. All data lives in Redis (Data Grid) running on the partner's machine (Máy B).
- Person 1's services connect to Redis on the partner's IP (e.g., `192.168.1.20:6379`).
- All backend PUs must enable **CORS** so the Frontend can call them.
- The partner (Person 2) will build: Redis setup, Product PU (GET /products, GET /products/{id}), and Inventory PU (GET /stock/{productId}).

---

## Shared API Contract (Both people must follow this)

### Product PU (PU1) — Built by Person 2 on port 8081
```
GET /products
Response: [{ "id": "p1", "name": "iPhone 15", "price": 999, "image": "..." }, ...]

GET /products/:id
Response: { "id": "p1", "name": "iPhone 15", "price": 999, "description": "...", "image": "..." }
```

### Cart PU (PU2) — Built by Person 1 on port 8082
```
POST /cart/add
Body: { "userId": "user1", "productId": "p1", "name": "iPhone 15", "price": 999, "quantity": 1 }
Response: { "success": true, "cart": [...] }

GET /cart?userId=user1
Response: { "userId": "user1", "items": [{ "productId": "p1", "name": "iPhone 15", "price": 999, "quantity": 2 }] }

DELETE /cart?userId=user1
Response: { "success": true }
```

### Order PU (PU3) — Built by Person 1 on port 8083
```
POST /checkout
Body: { "userId": "user1" }
Response: { "success": true, "orderId": "ord_xxx", "items": [...], "total": 1998 }
  OR
Response: { "success": false, "message": "Not enough stock for iPhone 15" }
```

### Inventory PU (PU4) — Built by Person 2 on port 8084
```
GET /stock/:productId
Response: { "productId": "p1", "stock": 50 }

POST /stock/decrease
Body: { "productId": "p1", "quantity": 2 }
Response: { "success": true, "remaining": 48 }
  OR
Response: { "success": false, "message": "Not enough stock" }
```

---

## Phase 1: Project Setup & Cart Processing Unit (PU2)

### Step 1.1 — Initialize Cart PU (Node.js + Express)

Create a Node.js project for the Cart service.

**Folder structure:**
```
person1/
├── cart-service/          ← PU2
│   ├── package.json
│   ├── server.js
│   └── .env
├── order-service/         ← PU3 (Phase 2)
└── frontend/              ← Frontend (Phase 3)
```

**cart-service/package.json dependencies:**
- `express` — HTTP server
- `cors` — Enable cross-origin requests
- `ioredis` — Redis client
- `dotenv` — Environment variables
- `uuid` — Generate order IDs (optional, can also use Date.now)

**cart-service/.env:**
```
PORT=8082
REDIS_HOST=192.168.1.20
REDIS_PORT=6379
```
> Replace `192.168.1.20` with the partner's actual IP address.

### Step 1.2 — Implement Cart PU Server (server.js)

**Requirements:**
1. Connect to Redis using `ioredis` with host/port from `.env`
2. Enable CORS for all origins
3. Implement these endpoints:

**POST /cart/add**
- Read `userId`, `productId`, `name`, `price`, `quantity` from request body
- Redis key pattern: `cart:{userId}` (use a Redis Hash)
- Store each cart item as a hash field: field = `productId`, value = JSON string of `{ productId, name, price, quantity }`
- If the product already exists in cart, increment the quantity
- Return the updated cart

**GET /cart?userId=xxx**
- Read `userId` from query params
- Get all fields from Redis hash `cart:{userId}` using `hgetall`
- Parse each value from JSON
- Return `{ userId, items: [...] }`

**DELETE /cart?userId=xxx**
- Delete Redis key `cart:{userId}` using `del`
- Return `{ success: true }`

4. Listen on port from `.env` (8082)
5. Log `Cart PU running on port 8082` on startup
6. Log `Connected to Redis at {host}:{port}` after successful Redis connection

### Step 1.3 — Test Cart PU

- Start the server: `node server.js`
- Test with curl or Postman:
  ```
  POST http://localhost:8082/cart/add
  Body: { "userId": "user1", "productId": "p1", "name": "Test Product", "price": 100, "quantity": 1 }
  
  GET http://localhost:8082/cart?userId=user1
  ```
- Verify data appears in Redis (partner can check with `redis-cli HGETALL cart:user1`)

---

## Phase 2: Order Processing Unit (PU3)

### Step 2.1 — Initialize Order PU

**Folder structure:**
```
person1/order-service/
├── package.json
├── server.js
└── .env
```

**order-service/.env:**
```
PORT=8083
REDIS_HOST=192.168.1.20
REDIS_PORT=6379
INVENTORY_URL=http://192.168.1.20:8084
```

**Dependencies:** Same as Cart PU (`express`, `cors`, `ioredis`, `dotenv`, `uuid`)

### Step 2.2 — Implement Order PU Server (server.js)

**Requirements:**
1. Connect to Redis using `ioredis` with host/port from `.env`
2. Enable CORS for all origins
3. Implement this endpoint:

**POST /checkout**
- Read `userId` from request body
- Step A: Get cart from Redis — `hgetall cart:{userId}`
- If cart is empty, return `{ success: false, message: "Cart is empty" }`
- Step B: For each item in cart, call Person 2's Inventory PU to decrease stock:
  ```
  POST http://{INVENTORY_URL}/stock/decrease
  Body: { "productId": "p1", "quantity": 2 }
  ```
  Use `fetch` (Node 18+) or `axios` to make this HTTP call.
- If any stock decrease fails (not enough stock), return error with the product name
- Step C: If all stock decreases succeed:
  - Create order object: `{ orderId: "ord_" + Date.now(), userId, items: [...], total: sum of (price * quantity), createdAt: new Date().toISOString() }`
  - Save order to Redis: key `order:{orderId}`, value = JSON string of order
  - Also push orderId to a list `orders:{userId}` using `rpush`
  - Delete the cart: `del cart:{userId}`
  - Return `{ success: true, orderId, items, total }`

4. **GET /orders?userId=xxx** (bonus endpoint)
- Get list of order IDs from `orders:{userId}` using `lrange`
- For each orderId, get order data from `order:{orderId}`
- Return array of orders

5. Listen on port from `.env` (8083)

### Step 2.3 — Test Order PU

- Requires Redis to be running (on partner's machine)
- Requires Inventory PU to be running (on partner's machine)
- Add items to cart via Cart PU first, then:
  ```
  POST http://localhost:8083/checkout
  Body: { "userId": "user1" }
  ```
- Verify stock decreased by checking with partner

---

## Phase 3: Frontend (ReactJS)

### Step 3.1 — Initialize React App

- Use Vite + React: `npx -y create-vite@latest ./ -- --template react`
- Install extra dependency: `axios` (for API calls)
- The frontend runs on port 3000 (configure in vite.config.js: `server: { port: 3000, host: '0.0.0.0' }`)

### Step 3.2 — Create API Config

Create `src/api/config.js`:
```js
// Replace these IPs with actual IPs before demo
const API = {
  PRODUCT:   'http://192.168.1.20:8081',   // Person 2's machine
  CART:      'http://localhost:8082',        // Same machine (Person 1)
  ORDER:     'http://localhost:8083',        // Same machine (Person 1)
  INVENTORY: 'http://192.168.1.20:8084',   // Person 2's machine
};
export default API;
```

### Step 3.3 — Implement Pages/Components

**Required pages (can be single-page app with component switching):**

1. **Product List Page** (default page)
   - On mount, call `GET {API.PRODUCT}/products`
   - Display products in a grid (cards with image, name, price)
   - Each card shows current stock (call `GET {API.INVENTORY}/stock/{id}`)
   - Each card has "Add to Cart" button
   - "Add to Cart" calls `POST {API.CART}/cart/add` with product details
   - Show success toast/notification when added

2. **Cart Page**
   - On mount, call `GET {API.CART}/cart?userId=user1`
   - Display cart items in a list/table (product name, price, quantity, subtotal)
   - Show total price at bottom
   - "Checkout" button → calls `POST {API.ORDER}/checkout` with `{ userId: "user1" }`
   - Show success/error message
   - On success, clear cart display and show order confirmation

3. **Navigation**
   - Simple nav bar with: "Products" | "Cart (N items)" links
   - Cart badge shows item count

**Design requirements:**
- Modern, clean UI with good colors (dark theme preferred for flash sale vibes)
- Use a bold header like "⚡ FLASH SALE" with a countdown timer (decorative)
- Product cards should look like an e-commerce site
- Responsive layout
- Loading spinners when fetching data
- Toast notifications for add-to-cart success

### Step 3.4 — Handle userId

- For simplicity, hardcode `userId = "user1"` or generate one with `localStorage`:
  ```js
  const userId = localStorage.getItem('userId') || (() => {
    const id = 'user_' + Date.now();
    localStorage.setItem('userId', id);
    return id;
  })();
  ```

### Step 3.5 — Test Full Flow

1. Open `http://localhost:3000`
2. See product list (data from Person 2's PU1)
3. Click "Add to Cart" on a product
4. Go to Cart page, see the item
5. Click "Checkout"
6. Verify stock decreased (reload product list or check stock)
7. Cart should be empty after checkout

---

## Phase 4: Polish & Demo Prep

### Step 4.1 — Error Handling
- Handle network errors gracefully (partner's machine might be unreachable)
- Show user-friendly error messages
- Add loading states to all API calls

### Step 4.2 — Demo Checklist
- [ ] Cart PU running on port 8082
- [ ] Order PU running on port 8083
- [ ] Frontend running on port 3000
- [ ] Can ping partner's machine
- [ ] All API calls use correct partner IP
- [ ] CORS enabled on all backend services
- [ ] Full flow works: browse → add to cart → checkout → stock decreases

### Step 4.3 — Start Commands
```bash
# Terminal 1 — Cart PU
cd cart-service && node server.js

# Terminal 2 — Order PU
cd order-service && node server.js

# Terminal 3 — Frontend
cd frontend && npm run dev
```

---

## File Tree Summary
```
person1/
├── PLAN.md                    ← This file
├── cart-service/
│   ├── package.json
│   ├── server.js              ← Cart PU (POST /cart/add, GET /cart, DELETE /cart)
│   └── .env                   ← REDIS_HOST, REDIS_PORT, PORT
├── order-service/
│   ├── package.json
│   ├── server.js              ← Order PU (POST /checkout, GET /orders)
│   └── .env                   ← REDIS_HOST, REDIS_PORT, PORT, INVENTORY_URL
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── api/config.js      ← API URLs for all PUs
        ├── App.jsx            ← Main app with routing
        ├── App.css            ← Styles
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ProductList.jsx
        │   ├── ProductCard.jsx
        │   └── Cart.jsx
        └── main.jsx
```
