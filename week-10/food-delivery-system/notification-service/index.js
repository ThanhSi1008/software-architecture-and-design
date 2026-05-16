const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const amqp = require("amqplib");

const app = express();
const PORT = 8084;
const RABBITMQ_URL = "amqp://toeic:toeic_password@localhost:5672";

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(morgan("dev"));

// ─── SSE Client Registry ──────────────────────────────────────────────────────
const sseClients = new Map(); // Map<userId, Set<res>>
const notifications = [];

function addSSEClient(userId, res) {
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);
  console.log(`[Notification] 🔌 SSE connect: userId=${userId} (total: ${countClients()})`);
}

function removeSSEClient(userId, res) {
  const set = sseClients.get(userId);
  if (set) { set.delete(res); if (set.size === 0) sseClients.delete(userId); }
  console.log(`[Notification] 🔌 SSE disconnect: userId=${userId} (remaining: ${countClients()})`);
}

function countClients() {
  let n = 0;
  for (const s of sseClients.values()) n += s.size;
  return n;
}

// Gửi SSE đến userId hoặc broadcast (userId=null)
function sendSSE(userId, data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  if (userId && sseClients.has(String(userId))) {
    for (const res of sseClients.get(String(userId))) res.write(payload);
  } else {
    // Broadcast
    for (const set of sseClients.values())
      for (const res of set) res.write(payload);
  }
}

// ─── Connect RabbitMQ + Consume ────────────────────────────────────────────────
async function connectAndConsume() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Assert tất cả queues
    await channel.assertQueue("ORDER_CREATED",      { durable: true });
    await channel.assertQueue("PAYMENT_PROCESSING", { durable: true });
    await channel.assertQueue("PAYMENT_SUCCESS",    { durable: true });
    await channel.assertQueue("PAYMENT_FAILED",     { durable: true });

    console.log(`[Notification Service] ✅ Kết nối RabbitMQ thành công`);
    console.log(`[Notification Service] 👂 Listening: ORDER_CREATED, PAYMENT_PROCESSING, PAYMENT_SUCCESS, PAYMENT_FAILED`);

    // ── Consume ORDER_CREATED → Step 2 active ─────────────────────────────────
    channel.consume("ORDER_CREATED", (msg) => {
      if (!msg) return;
      const event = JSON.parse(msg.content.toString());
      console.log(`\n[Notification] 📥 ORDER_CREATED: ${event.orderId}`);

      sendSSE(String(event.userId), {
        type: "ORDER_CREATED",
        step: 2,
        orderId: event.orderId,
        userId: event.userId,
        message: `Đơn hàng ${event.orderId} đã tạo. Đang gửi sang Payment...`,
        timestamp: new Date().toISOString(),
      });
      channel.ack(msg);
    });

    // ── Consume PAYMENT_PROCESSING → Step 3 active ────────────────────────────
    channel.consume("PAYMENT_PROCESSING", (msg) => {
      if (!msg) return;
      const event = JSON.parse(msg.content.toString());
      console.log(`\n[Notification] 📥 PAYMENT_PROCESSING: ${event.orderId}`);

      sendSSE(String(event.userId), {
        type: "PAYMENT_PROCESSING",
        step: 3,
        orderId: event.orderId,
        userId: event.userId,
        message: `Đang xử lý thanh toán ${event.orderId}...`,
        timestamp: new Date().toISOString(),
      });
      channel.ack(msg);
    });

    // ── Consume PAYMENT_SUCCESS → Step 4 & 5 done ─────────────────────────────
    channel.consume("PAYMENT_SUCCESS", (msg) => {
      if (!msg) return;
      const event = JSON.parse(msg.content.toString());
      console.log(`\n[Notification] 📥 PAYMENT_SUCCESS: ${event.orderId}`);

      const notification = {
        id: `NOTIF-${Date.now()}`,
        type: "PAYMENT_SUCCESS",
        step: 5,
        title: "🎉 Đặt hàng thành công!",
        message: event.message || `Đơn ${event.orderId} thanh toán thành công!`,
        orderId: event.orderId,
        transactionId: event.transactionId,
        amount: event.amount,
        userId: event.userId,
        timestamp: new Date().toISOString(),
      };
      notifications.unshift(notification);
      sendSSE(String(event.userId), notification);
      console.log(`[Notification] 📲 Gửi SUCCESS tới userId=${event.userId}`);
      channel.ack(msg);
    });

    // ── Consume PAYMENT_FAILED → Fail state ───────────────────────────────────
    channel.consume("PAYMENT_FAILED", (msg) => {
      if (!msg) return;
      const event = JSON.parse(msg.content.toString());
      console.log(`\n[Notification] 📥 PAYMENT_FAILED: ${event.orderId}`);

      const notification = {
        id: `NOTIF-${Date.now()}`,
        type: "PAYMENT_FAILED",
        step: 5,
        title: "❌ Thanh toán thất bại",
        message: event.message || `Đơn ${event.orderId} thất bại. Vui lòng thử lại.`,
        orderId: event.orderId,
        transactionId: event.transactionId,
        amount: event.amount,
        userId: event.userId,
        timestamp: new Date().toISOString(),
      };
      notifications.unshift(notification);
      sendSSE(String(event.userId), notification);
      console.log(`[Notification] 📲 Gửi FAILED tới userId=${event.userId}`);
      channel.ack(msg);
    });

  } catch (err) {
    console.error(`[Notification Service] ❌ Lỗi RabbitMQ:`, err.message);
    console.log(`[Notification Service] 🔄 Thử lại sau 5 giây...`);
    setTimeout(connectAndConsume, 5000);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ service: "Notification Service", status: "UP", port: PORT, activeSSEClients: countClients(), totalNotifications: notifications.length });
});

// SSE endpoint
app.get("/api/notifications/stream", (req, res) => {
  const { userId } = req.query;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", message: "SSE kết nối thành công!", userId })}\n\n`);
  addSSEClient(userId, res);
  req.on("close", () => removeSSEClient(userId, res));
});

// Lịch sử thông báo
app.get("/api/notifications", (req, res) => {
  const { userId } = req.query;
  const result = userId ? notifications.filter((n) => String(n.userId) === String(userId)) : notifications;
  res.json({ success: true, data: result.slice(0, 50) });
});

// ─── Start ─────────────────────────────────────────────────────────────────
connectAndConsume().then(() => {
  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  Notification Service → localhost:${PORT}`);
    console.log(`========================================`);
    console.log(`  Consuming: ORDER_CREATED, PAYMENT_PROCESSING, PAYMENT_SUCCESS, PAYMENT_FAILED`);
    console.log(`  SSE: GET /api/notifications/stream?userId=<id>`);
  });
});
