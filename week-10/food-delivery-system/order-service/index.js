const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const amqp = require("amqplib");

const app = express();
const PORT = 8082;
const RABBITMQ_URL = "amqp://toeic:toeic_password@localhost:5672";

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ─── In-memory DB ─────────────────────────────────────────────────────────────
const orders = [];
let orderIdCounter = 1001;
let rabbitChannel = null;

// ─── Connect RabbitMQ ─────────────────────────────────────────────────────────
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Đảm bảo các queue tồn tại (durable = true để không mất khi restart)
    await channel.assertQueue("ORDER_CREATED", { durable: true });

    rabbitChannel = channel;
    console.log(`[Order Service] ✅ Kết nối RabbitMQ thành công`);
  } catch (err) {
    console.error(`[Order Service] ❌ Không thể kết nối RabbitMQ:`, err.message);
    console.log(`[Order Service] ⚠️  Chạy ở chế độ không có RabbitMQ (demo sẽ thiếu event)`);
  }
}

// ─── Helper: Publish Event ────────────────────────────────────────────────────
function publishEvent(queue, payload) {
  if (!rabbitChannel) {
    console.warn(`[Order Service] Không có kết nối RabbitMQ, bỏ qua event ${queue}`);
    return;
  }
  const message = JSON.stringify(payload);
  rabbitChannel.sendToQueue(queue, Buffer.from(message), { persistent: true });
  console.log(`[Order Service] 📤 Published event [${queue}]:`, payload);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health
app.get("/health", (req, res) => {
  res.json({
    service: "Order Service",
    status: "UP",
    port: PORT,
    rabbitmq: rabbitChannel ? "Connected" : "Disconnected",
    totalOrders: orders.length,
  });
});

// POST /api/orders  – Tạo đơn hàng (REST - đồng bộ)
app.post("/api/orders", (req, res) => {
  const { userId, items, totalAmount, note } = req.body;

  if (!userId || !items || !totalAmount) {
    return res.status(400).json({ success: false, message: "Thiếu thông tin đơn hàng" });
  }

  // 1. Lưu order vào "database" (in-memory)
  const order = {
    id: `ORD-${orderIdCounter++}`,
    userId,
    items,
    totalAmount,
    note: note || "",
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  orders.push(order);

  console.log(`[Order Service] ✅ Đã tạo Order: ${order.id}`);

  // 2. Publish event ORDER_CREATED (async - không block response)
  publishEvent("ORDER_CREATED", {
    orderId: order.id,
    userId: order.userId,
    totalAmount: order.totalAmount,
    items: order.items,
    createdAt: order.createdAt,
  });

  // 3. Trả về ngay (REST synchronous)
  return res.status(201).json({
    success: true,
    message: "Đặt hàng thành công! Đang xử lý thanh toán...",
    data: order,
  });
});

// GET /api/orders  – Lấy danh sách orders
app.get("/api/orders", (req, res) => {
  const { userId } = req.query;
  const result = userId ? orders.filter((o) => String(o.userId) === String(userId)) : orders;
  res.json({ success: true, data: result.reverse(), total: result.length });
});

// GET /api/orders/:id  – Chi tiết order
app.get("/api/orders/:id", (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
  res.json({ success: true, data: order });
});

// ─── Start ─────────────────────────────────────────────────────────────────
connectRabbitMQ().then(() => {
  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  Order Service      → localhost:${PORT}`);
    console.log(`========================================`);
    console.log(`  POST /api/orders  (tạo đơn + publish ORDER_CREATED)`);
    console.log(`  GET  /api/orders`);
    console.log(`  GET  /api/orders/:id`);
  });
});
