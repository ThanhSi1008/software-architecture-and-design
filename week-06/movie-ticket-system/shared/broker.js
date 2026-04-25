const amqplib = require('amqplib');

const EXCHANGE = 'movie_ticket_exchange';

// Kết nối RabbitMQ với retry (vì RabbitMQ khởi động chậm hơn app)
async function connectBroker(url, retries = 10, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await amqplib.connect(url);
      const channel = await connection.createChannel();
      
      // Chính exchange
      await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
      
      // Dead Letter Exchange (Cho tin nhắn lỗi)
      await channel.assertExchange('dlx_exchange', 'topic', { durable: true });
      await channel.assertQueue('dead_letter_queue', { durable: true });
      await channel.bindQueue('dead_letter_queue', 'dlx_exchange', '#');

      console.log(`[BROKER] Connected to RabbitMQ at ${url} (DLQ Enabled)`);
      return { connection, channel };
    } catch (err) {
      console.log(`[BROKER] Connection failed (${err.message}). Retry ${i + 1}/${retries} in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('[BROKER] Maximum retries reached. Could not connect to RabbitMQ.');
}

// Publish event lên exchange
async function publishEvent(channel, eventName, data) {
  const message = {
    event: eventName,
    timestamp: new Date().toISOString(),
    data,
  };
  channel.publish(
    EXCHANGE,
    eventName,
    Buffer.from(JSON.stringify(message)),
    { persistent: true }
  );
  console.log(`[PUBLISH] ${eventName}:`, JSON.stringify(data));
}

// Subscribe và consume event từ queue
async function consumeEvent(channel, queueName, eventName, callback) {
  await channel.assertQueue(queueName, { durable: true });
  await channel.bindQueue(queueName, EXCHANGE, eventName);
  console.log(`[SUBSCRIBE] Listening for ${eventName} on queue ${queueName}`);
  channel.consume(queueName, (msg) => {
    if (msg) {
      const content = JSON.parse(msg.content.toString());
      console.log(`[CONSUME] ${eventName}:`, JSON.stringify(content.data));
      callback(content);
      channel.ack(msg);
    }
  });
}

module.exports = { connectBroker, publishEvent, consumeEvent, EXCHANGE };
