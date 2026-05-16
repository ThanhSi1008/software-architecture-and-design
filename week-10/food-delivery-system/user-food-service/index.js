const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const Redis = require("ioredis");

const app = express();
const PORT = 8081;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ─── Redis Client ─────────────────────────────────────────────────────────────
const redis = new Redis({ host: "localhost", port: 6379, lazyConnect: true });
let redisOk = false;

redis.connect()
  .then(() => { redisOk = true; console.log(`[User/Food Service] ✅ Redis connected on :6379`); })
  .catch((e) => console.warn(`[User/Food Service] ⚠️  Redis unavailable: ${e.message}. Cache disabled.`));

redis.on("error", () => { redisOk = false; });

// ─── Mock Data ────────────────────────────────────────────────────────────────
const USERS = [
  { id: 1, username: "user1", password: "123456", name: "Nguyễn Văn An",  phone: "0901234567", avatar: "👤" },
  { id: 2, username: "admin", password: "admin",  name: "Trần Thị Bình",  phone: "0987654321", avatar: "👩" },
];

const FOODS = [
  { id: 1, name: "Phở Bò Đặc Biệt",       price: 65000,  category: "Phở",     image: "🍜", rating: 4.8, restaurant: "Phở 24",          time: "20 phút", desc: "Phở bò tái chín với nước dùng đậm đà" },
  { id: 2, name: "Cơm Tấm Sườn Bì",       price: 55000,  category: "Cơm",     image: "🍚", rating: 4.7, restaurant: "Cơm Tấm Ba Ghiền", time: "15 phút", desc: "Cơm tấm sườn nướng, bì chả, trứng ốp la" },
  { id: 3, name: "Bún Bò Huế",             price: 60000,  category: "Bún",     image: "🍲", rating: 4.9, restaurant: "Bún Bò O Xuân",    time: "20 phút", desc: "Bún bò đúng vị Huế với chả cua, giò heo" },
  { id: 4, name: "Bánh Mì Thịt Đặc Biệt", price: 35000,  category: "Bánh Mì", image: "🥖", rating: 4.6, restaurant: "Bánh Mì Phượng",  time: "10 phút", desc: "Bánh mì giòn, nhân đặc biệt đầy đủ" },
  { id: 5, name: "Gà Rán Giòn",           price: 75000,  category: "Gà",      image: "🍗", rating: 4.5, restaurant: "KFC Local",         time: "25 phút", desc: "Gà rán giòn tan, thơm ngon đúng vị" },
  { id: 6, name: "Pizza Hải Sản",          price: 120000, category: "Pizza",   image: "🍕", rating: 4.7, restaurant: "Pizza House",       time: "30 phút", desc: "Pizza hải sản tươi với tôm, mực, cua" },
  { id: 7, name: "Bún Chả Hà Nội",        price: 55000,  category: "Bún",     image: "🥗", rating: 4.8, restaurant: "Bún Chả Hương Liên", time: "20 phút", desc: "Bún chả với chả viên, thịt nướng thơm" },
  { id: 8, name: "Mì Quảng Gà",           price: 50000,  category: "Mì",      image: "🍝", rating: 4.6, restaurant: "Mì Quảng Ếch",     time: "20 phút", desc: "Mì Quảng gà với rau sống, bánh tráng" },
];

// ─── Cache Helpers ────────────────────────────────────────────────────────────
const CACHE_TTL = 60; // giây

async function getCache(key) {
  if (!redisOk) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function setCache(key, data, ttl = CACHE_TTL) {
  if (!redisOk) return;
  try { await redis.set(key, JSON.stringify(data), "EX", ttl); } catch {}
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ service: "User/Food Service", status: "UP", port: PORT, redis: redisOk ? "Connected" : "Disconnected" });
});

// POST /api/users/login  (không cache — luôn verify real-time)
app.post("/api/users/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: "Thiếu username hoặc password" });

  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ success: false, message: "Sai tên đăng nhập hoặc mật khẩu" });

  const { password: _, ...userSafe } = user;
  console.log(`[User Service] ✅ Login: ${username}`);
  return res.json({
    success: true,
    message: "Đăng nhập thành công",
    data: { user: userSafe, token: `mock-jwt-token-${Date.now()}` },
  });
});

// GET /api/foods  – danh sách món ĂN (có cache Redis)
app.get("/api/foods", async (req, res) => {
  const { category } = req.query;
  const cacheKey = category ? `foods:category:${category}` : "foods:all";

  // Thử đọc cache
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`[Food Service] ⚡ CACHE HIT [${cacheKey}] (${cached.length} items)`);
    return res.json({
      success: true, data: cached, total: cached.length,
      cache: { hit: true, key: cacheKey, ttl: CACHE_TTL },
    });
  }

  // Cache MISS — tính từ dữ liệu gốc
  console.log(`[Food Service] 🔍 CACHE MISS [${cacheKey}] — fetching from DB...`);
  const result = category ? FOODS.filter((f) => f.category === category) : FOODS;
  await setCache(cacheKey, result);

  return res.json({
    success: true, data: result, total: result.length,
    cache: { hit: false, key: cacheKey, ttl: CACHE_TTL },
  });
});

// GET /api/foods/:id  – chi tiết món (có cache Redis)
app.get("/api/foods/:id", async (req, res) => {
  const { id } = req.params;
  const cacheKey = `food:${id}`;

  const cached = await getCache(cacheKey);
  if (cached) {
    console.log(`[Food Service] ⚡ CACHE HIT [${cacheKey}]`);
    return res.json({ success: true, data: cached, cache: { hit: true, key: cacheKey } });
  }

  const food = FOODS.find((f) => f.id === Number(id));
  if (!food) return res.status(404).json({ success: false, message: "Không tìm thấy món ăn" });

  await setCache(cacheKey, food, 120);
  return res.json({ success: true, data: food, cache: { hit: false, key: cacheKey } });
});

// DELETE /api/foods/cache  – xoá cache (để demo)
app.delete("/api/foods/cache", async (req, res) => {
  if (!redisOk) return res.json({ success: false, message: "Redis không khả dụng" });
  const keys = await redis.keys("food*");
  if (keys.length > 0) await redis.del(...keys);
  console.log(`[Food Service] 🗑️ Đã xoá ${keys.length} cache keys`);
  res.json({ success: true, message: `Đã xoá ${keys.length} cache keys`, keys });
});

// ─── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  User/Food Service  → localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`  POST /api/users/login`);
  console.log(`  GET  /api/foods          (Redis Cache TTL: ${CACHE_TTL}s)`);
  console.log(`  GET  /api/foods/:id      (Redis Cache TTL: 120s)`);
  console.log(`  DELETE /api/foods/cache  (xoá cache)`);
});
