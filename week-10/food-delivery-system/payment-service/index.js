const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const amqp = require("amqplib");

const app = express();
const PORT = 8083;
const RABBITMQ_URL = "amqp://toeic:toeic_password@localhost:5672";

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// ─── In-memory payments log ───────────────────────────────────────────────────
const payments = [];
let rabbitChannel = null;

// ─── Connect RabbitMQ + Start Consuming ──────────────────────────────────────
async function connectAndConsume() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Đảm bảo queue tồn tại
    await channel.assertQueue("ORDER_CREATED",       { durable: true });
    await channel.assertQueue("PAYMENT_PROCESSING",  { durable: true });
    await channel.assertQueue("PAYMENT_SUCCESS",     { durable: true });
    await channel.assertQueue("PAYMENT_FAILED",      { durable: true });

    rabbitChannel = channel;
    console.log(`[Payment Service] ✅ Kết nối RabbitMQ thành công`);
    console.log(`[Payment Service] 👂 Đang lắng nghe queue [ORDER_CREATED]...`);

    // Consume ORDER_CREATED
    channel.consume("ORDER_CREATED", async (msg) => {
      if (!msg) return;

      const event = JSON.parse(msg.content.toString());
      console.log(`\n[Payment Service] 📥 Nhận event ORDER_CREATED:`, event);

      // Publish PAYMENT_PROCESSING → Frontend cập nhật step 3
      channel.sendToQueue(
        "PAYMENT_PROCESSING",
        Buffer.from(JSON.stringify({ orderId: event.orderId, userId: event.userId, amount: event.totalAmount, processedAt: new Date().toISOString() })),
        { persistent: true }
      );
      console.log(`[Payment Service] 📤 Published PAYMENT_PROCESSING`);

      // Giả lập xử lý thanh toán mất 3 giây
      console.log(`[Payment Service] ⏳ Đang xử lý thanh toán ${event.orderId}...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 90% thành công, 10% thất bại (để demo cả 2 case)
      const isSuccess = Math.random() > 0.1;
      const resultQueue = isSuccess ? "PAYMENT_SUCCESS" : "PAYMENT_FAILED";

      const paymentResult = {
        orderId: event.orderId,
        userId: event.userId,
        amount: event.totalAmount,
        status: isSuccess ? "SUCCESS" : "FAILED",
        transactionId: `TXN-${Date.now()}`,
        processedAt: new Date().toISOString(),
        message: isSuccess
          ? `Thanh toán ${event.totalAmount.toLocaleString("vi-VN")}₫ thành công!`
          : `Thanh toán thất bại. Vui lòng thử lại.`,
      };

      // Lưu log
      payments.push(paymentResult);

      // Publish kết quả thanh toán
      channel.sendToQueue(resultQueue, Buffer.from(JSON.stringify(paymentResult)), {
        persistent: true,
      });

      const icon = isSuccess ? "✅" : "❌";
      console.log(`[Payment Service] ${icon} Kết quả [${resultQueue}]:`, paymentResult);

      // Ack message
      channel.ack(msg);
    });
  } catch (err) {
    console.error(`[Payment Service] ❌ Lỗi kết nối RabbitMQ:`, err.message);
    console.log(`[Payment Service] 🔄 Thử lại sau 5 giây...`);
    setTimeout(connectAndConsume, 5000);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    service: "Payment Service",
    status: "UP",
    port: PORT,
    rabbitmq: rabbitChannel ? "Connected" : "Disconnected",
    totalPayments: payments.length,
    successRate: payments.length
      ? `${Math.round((payments.filter((p) => p.status === "SUCCESS").length / payments.length) * 100)}%`
      : "N/A",
  });
});

app.get("/api/payments", (req, res) => {
  res.json({ success: true, data: payments.slice().reverse() });
});

// ─── Start ─────────────────────────────────────────────────────────────────
connectAndConsume().then(() => {
  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  Payment Service    → localhost:${PORT}`);
    console.log(`========================================`);
    console.log(`  Consuming: [ORDER_CREATED]`);
    console.log(`  Publishing: [PAYMENT_SUCCESS] | [PAYMENT_FAILED]`);
  });
});
