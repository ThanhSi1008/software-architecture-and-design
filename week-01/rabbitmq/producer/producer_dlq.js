const express = require("express");
const amqp = require("amqplib");

const app = express();
app.use(express.json());

const RABBITMQ_URL = "amqp://user:password@rabbitmq:5672";
const QUEUE = "order_queue";
const DEAD_LETTER_QUEUE = "order_queue.dlq";

let channel;

async function connectRabbitMQ() {
  while (true) {
    try {
      const conn = await amqp.connect(RABBITMQ_URL);
      channel = await conn.createChannel();
      await channel.assertQueue(QUEUE, {
        durable: true,
        deadLetterExchange: "",      // Default Exchange
        deadLetterRoutingKey: DEAD_LETTER_QUEUE,
      });

      console.log("Producer connected to RabbitMQ");
      break;
    } catch {
      console.log("Waiting for RabbitMQ...");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

app.post("/send", async (req, res) => {
  const { message, orderId } = req.body;

  if (!message || !orderId) {
    return res.status(400).json({ error: "message or orderId is required" });
  }

  const data = {
    message: message,
    orderId: orderId,
    timestamp: new Date()
  };

  channel.sendToQueue(
      QUEUE,
      Buffer.from(JSON.stringify(data)),
      {
        persistent: true // Message không bị mất khi RabbitMQ restart
      }
  );

  console.log("Sent:", data);

  res.json({status: "sent", dataSent: data});

});

connectRabbitMQ();

app.listen(3000, () => {
  console.log("Producer API listening on port 3000");
});
