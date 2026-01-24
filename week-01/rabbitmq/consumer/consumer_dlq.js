const amqp = require("amqplib");

const RABBITMQ_URL = "amqp://user:password@rabbitmq:5672";
const QUEUE = "order_queue";
const DEAD_LETTER_QUEUE = "order_queue.dlq";

let channel;

async function connectWithRetry() {
  try {
    console.log("Consumer connecting...");
    const conn = await amqp.connect(RABBITMQ_URL);
    channel = await conn.createChannel();

    await channel.assertQueue(DEAD_LETTER_QUEUE, { durable: true });

    await channel.assertQueue(QUEUE, {
      durable: true,
      deadLetterExchange: "",
      deadLetterRoutingKey: DEAD_LETTER_QUEUE,
    });

    console.log("Waiting for messages...");

    channel.consume(
      QUEUE,
      async (msg) => {
        if (!msg) return;

        const body = msg.content.toString();
        console.log("Processing:", body);

        try {
          const data = JSON.parse(body);

          if (!data.orderId) {
            throw new Error("Missing orderId");
          }

          await new Promise(resolve => setTimeout(resolve, 3000));

          console.log("Process success");
          channel.ack(msg);
        } catch (err) {
          console.log("Send to DLQ");
          channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );

  } catch (err) {
    console.log("Consumer failed, retry in 3s...");
    setTimeout(connectWithRetry, 3000);
  }
}

connectWithRetry();
