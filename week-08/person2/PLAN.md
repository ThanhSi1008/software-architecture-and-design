# Person 2 — Implementation Plan
## Role: Redis (Data Grid) + Product PU (PU1) + Inventory PU (PU4)

> **Architecture**: Space-Based Architecture — Flash Sale System
> **Machine**: Máy B
> **Services**: Redis (:6379), Product PU (:8081), Inventory PU (:8084)
> **Partner (Máy A)**: Frontend (:3000), Cart PU (:8082), Order PU (:8083)

---

## Important Context

- This is a **Space-Based Architecture** assignment. The core principle is: **NO DATABASE**. All data lives in Redis (Data Grid).
- Person 2 is responsible for **Redis** — the single source of truth for all data.
- Person 2's PU1 and PU4 connect to Redis on `localhost:6379` (same machine).
- Person 1's services (on Máy A) will connect to this Redis remotely, so Redis MUST bind to `0.0.0.0`.
- All backend PUs must enable **CORS** so the Frontend (on Máy A) can call them.

---

## Shared API Contract (Both people must follow this)

### Product PU (PU1) — Built by Person 2 on port 8081
```
GET /products
Response: [{ "id": "p1", "name": "iPhone 15", "price": 999, "image": "https://..." }, ...]

GET /products/:id
Response: { "id": "p1", "name": "iPhone 15", "price": 999, "description": "...", "image": "https://..." }
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

## Phase 1: Redis (Data Grid) Setup

### Step 1.1 — Install Redis

**Option A — Windows (using WSL or Memurai):**
- Install WSL2 and then: `sudo apt install redis-server`
- Or install Memurai (Redis-compatible for Windows): https://www.memurai.com/

**Option B — Docker (recommended):**
```bash
docker run -d --name redis-flashsale -p 6379:6379 redis:7 --bind 0.0.0.0 --protected-mode no
```

### Step 1.2 — Configure Redis for LAN Access

Edit `redis.conf` (or pass flags):
```
bind 0.0.0.0
protected-mode no
```
> This allows Person 1's machine to connect to Redis over LAN.

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Step 1.3 — Seed Product Data

Create a seed script `seed.js` (Node.js) to populate Redis with initial product data.

**Folder structure:**
```
person2/
├── seed/
│   ├── package.json
│   └── seed.js            ← Seed products + stock into Redis
├── product-service/       ← PU1 (Phase 2)
└── inventory-service/     ← PU4 (Phase 3)
```

**seed/package.json dependencies:**
- `ioredis` — Redis client

**seed/seed.js requirements:**

1. Connect to Redis on `localhost:6379`
2. Seed **at least 6 products** into Redis using a Hash per product.
   Redis key pattern: `product:{id}`
   
   Example products (use these exact ones for consistency):
   ```js
   const products = [
     { id: "p1", name: "iPhone 15 Pro Max", price: 1199, description: "Latest Apple flagship with A17 Pro chip", image: "https://picsum.photos/seed/iphone15/400/400" },
     { id: "p2", name: "Samsung Galaxy S24 Ultra", price: 1099, description: "Samsung's premium with AI features", image: "https://picsum.photos/seed/galaxys24/400/400" },
     { id: "p3", name: "MacBook Air M3", price: 1299, description: "Ultra-thin laptop with M3 chip", image: "https://picsum.photos/seed/macbookm3/400/400" },
     { id: "p4", name: "Sony WH-1000XM5", price: 349, description: "Industry-leading noise cancelling headphones", image: "https://picsum.photos/seed/sonyxm5/400/400" },
     { id: "p5", name: "iPad Pro 12.9", price: 1099, description: "Most powerful iPad with M2 chip", image: "https://picsum.photos/seed/ipadpro/400/400" },
     { id: "p6", name: "AirPods Pro 2", price: 249, description: "Active noise cancellation with adaptive audio", image: "https://picsum.photos/seed/airpods/400/400" },
   ];
   ```

3. For each product, store in Redis:
   - `hset product:{id} id {id} name {name} price {price} description {description} image {image}`

4. Also maintain a Set of all product IDs:
   - `sadd products p1 p2 p3 p4 p5 p6`

5. Seed **initial stock** for each product:
   - `set stock:{id} 50` (50 units each)

6. After seeding, log all product names and stock levels, then disconnect.

**Run the seed script:**
```bash
cd seed && node seed.js
```

**Verify data:**
```bash
redis-cli SMEMBERS products
redis-cli HGETALL product:p1
redis-cli GET stock:p1
```

---

## Phase 2: Product Processing Unit (PU1)

### Step 2.1 — Initialize Product PU

**Folder structure:**
```
person2/product-service/
├── package.json
├── server.js
└── .env
```

**product-service/package.json dependencies:**
- `express` — HTTP server
- `cors` — Enable cross-origin requests
- `ioredis` — Redis client
- `dotenv` — Environment variables

**product-service/.env:**
```
PORT=8081
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Step 2.2 — Implement Product PU Server (server.js)

**Requirements:**
1. Connect to Redis using `ioredis` with host/port from `.env`
2. Enable CORS for all origins
3. Implement these endpoints:

**GET /products**
- Get all product IDs from Redis: `smembers products`
- For each product ID, get product data: `hgetall product:{id}`
- Also get stock for each: `get stock:{id}`
- Combine into array: `[{ id, name, price, description, image, stock }, ...]`
- Return the array
- **Performance tip**: Use Redis pipeline to batch all `hgetall` and `get` commands

**GET /products/:id**
- Get product data: `hgetall product:{id}`
- Get stock: `get stock:{id}`
- If product not found, return 404: `{ error: "Product not found" }`
- Return `{ id, name, price, description, image, stock }`

4. Listen on port from `.env` (8081)
5. Bind to `0.0.0.0` so Partner's machine can reach this service:
   ```js
   app.listen(PORT, '0.0.0.0', () => { ... })
   ```
6. Log `Product PU running on port 8081` on startup

### Step 2.3 — Test Product PU

```bash
# Start server
cd product-service && node server.js

# Test endpoints
curl http://localhost:8081/products
curl http://localhost:8081/products/p1
```

Verify the response matches the API contract above.

---

## Phase 3: Inventory Processing Unit (PU4)

### Step 3.1 — Initialize Inventory PU

**Folder structure:**
```
person2/inventory-service/
├── package.json
├── server.js
└── .env
```

**inventory-service/.env:**
```
PORT=8084
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Dependencies:** Same as Product PU (`express`, `cors`, `ioredis`, `dotenv`)

### Step 3.2 — Implement Inventory PU Server (server.js)

**Requirements:**
1. Connect to Redis using `ioredis` with host/port from `.env`
2. Enable CORS for all origins
3. Implement these endpoints:

**GET /stock/:productId**
- Get stock from Redis: `get stock:{productId}`
- If not found, return 404: `{ error: "Product not found" }`
- Return `{ productId, stock: parseInt(value) }`

**POST /stock/decrease**
- Read `productId` and `quantity` from request body
- **CRITICAL — Atomic operation to prevent race conditions:**
  Use a Lua script or Redis transaction to check-and-decrement atomically:
  
  **Option A — Simple (good enough for demo):**
  ```js
  const current = await redis.get(`stock:${productId}`);
  if (parseInt(current) < quantity) {
    return res.json({ success: false, message: "Not enough stock" });
  }
  const remaining = await redis.decrby(`stock:${productId}`, quantity);
  return res.json({ success: true, remaining });
  ```

  **Option B — Atomic with Lua script (bonus — prevents race condition):**
  ```js
  const luaScript = `
    local current = tonumber(redis.call('GET', KEYS[1]))
    if current == nil then return -1 end
    if current < tonumber(ARGV[1]) then return -2 end
    return redis.call('DECRBY', KEYS[1], ARGV[1])
  `;
  const result = await redis.eval(luaScript, 1, `stock:${productId}`, quantity);
  ```
  If result is -1: product not found. If result is -2: not enough stock.

- Return `{ success: true, remaining }` or `{ success: false, message: "..." }`

**GET /stock** (bonus — get all stock levels)
- Get all product IDs: `smembers products`
- For each, get stock: `get stock:{id}`
- Return `[{ productId: "p1", stock: 50 }, ...]`

4. Listen on port from `.env` (8084)
5. Bind to `0.0.0.0`:
   ```js
   app.listen(PORT, '0.0.0.0', () => { ... })
   ```
6. Log `Inventory PU running on port 8084` on startup

### Step 3.3 — Test Inventory PU

```bash
# Start server
cd inventory-service && node server.js

# Test endpoints
curl http://localhost:8084/stock/p1
# Should return: { "productId": "p1", "stock": 50 }

curl -X POST http://localhost:8084/stock/decrease \
  -H "Content-Type: application/json" \
  -d '{"productId": "p1", "quantity": 2}'
# Should return: { "success": true, "remaining": 48 }

curl http://localhost:8084/stock/p1
# Should return: { "productId": "p1", "stock": 48 }
```

---

## Phase 4: Polish & Demo Prep

### Step 4.1 — Verify LAN Connectivity

On your machine, run:
```bash
ipconfig
# Note your IPv4 address (e.g., 192.168.1.20)
```

Tell Person 1 your IP. They need to update their `.env` files and Frontend API config.

Person 1 should be able to:
```bash
# From their machine (Máy A)
ping 192.168.1.20
curl http://192.168.1.20:8081/products
curl http://192.168.1.20:8084/stock/p1
redis-cli -h 192.168.1.20 ping
```

### Step 4.2 — Firewall Rules (Windows)

If Person 1 can't connect, you may need to allow ports through Windows Firewall:
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="Redis" dir=in action=allow protocol=TCP localport=6379
netsh advfirewall firewall add rule name="ProductPU" dir=in action=allow protocol=TCP localport=8081
netsh advfirewall firewall add rule name="InventoryPU" dir=in action=allow protocol=TCP localport=8084
```

### Step 4.3 — Re-seed Data (if needed)

If stock gets messed up during testing, re-run the seed script:
```bash
cd seed && node seed.js
```

### Step 4.4 — Demo Checklist
- [ ] Redis running and accessible from LAN (bind 0.0.0.0)
- [ ] Product data seeded (6 products with stock = 50)
- [ ] Product PU running on port 8081 (bound to 0.0.0.0)
- [ ] Inventory PU running on port 8084 (bound to 0.0.0.0)
- [ ] Person 1 can reach all 3 services from their machine
- [ ] CORS enabled on all backend services
- [ ] Firewall ports opened (6379, 8081, 8084)
- [ ] Stock decreases correctly when Person 1 does checkout

### Step 4.5 — Start Commands
```bash
# Terminal 1 — Redis (if not using Docker)
redis-server --bind 0.0.0.0 --protected-mode no

# Terminal 2 — Seed data (run once)
cd seed && node seed.js

# Terminal 3 — Product PU
cd product-service && node server.js

# Terminal 4 — Inventory PU
cd inventory-service && node server.js
```

---

## File Tree Summary
```
person2/
├── PLAN.md                        ← This file
├── seed/
│   ├── package.json
│   └── seed.js                    ← Seeds products + stock into Redis
├── product-service/
│   ├── package.json
│   ├── server.js                  ← Product PU (GET /products, GET /products/:id)
│   └── .env                       ← REDIS_HOST, REDIS_PORT, PORT
└── inventory-service/
    ├── package.json
    ├── server.js                  ← Inventory PU (GET /stock/:id, POST /stock/decrease)
    └── .env                       ← REDIS_HOST, REDIS_PORT, PORT
```
