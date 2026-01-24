const amqp = require("amqplib");

const RABBITMQ_URL = "amqp://user:password@rabbitmq:5672";
const QUEUE = "order_queue";

async function connectWithRetry() {
  try {
    console.log("Consumer connecting...");
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();

    await channel.assertQueue(QUEUE);
    console.log("Waiting for messages...");

    channel.consume(QUEUE, (msg) => {
      if (msg) {
        console.log("Processing:", msg.content.toString());
        channel.ack(msg);
      }
    });
  } catch (err) {
    console.log("Consumer retry in 3s...");
    setTimeout(connectWithRetry, 3000);
  }
}

connectWithRetry();
