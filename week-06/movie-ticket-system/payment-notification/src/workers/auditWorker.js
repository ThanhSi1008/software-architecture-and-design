const { connectBroker, consumeEvent } = require('../../../shared/broker');
const { logEventToDB } = require('../../../shared/eventLogger');
const { createLogger } = require('../../../shared/logger');

const logger = createLogger('AUDIT-SERVICE');

const startAuditWorker = async () => {
  try {
    const { channel } = await connectBroker(process.env.RABBITMQ_URL);

    // Lắng nghe TẤT CẢ các sự kiện sử dụng routing key '#'
    // Chúng ta tạo một queue riêng cho Audit để không ảnh hưởng đến các service khác
    const queueName = 'audit_all_events_queue';
    await channel.assertQueue(queueName, { durable: true });
    
    // Bind với '#' để nhận mọi message từ exchange
    await channel.bindQueue(queueName, 'movie_ticket_exchange', '#');

    channel.consume(queueName, async (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        const eventType = msg.fields.routingKey;

        logger.info('AUDIT', `Logging event: ${eventType}`);
        
        // Lưu vào MongoDB
        await logEventToDB('SYSTEM-AUDIT', eventType, content);

        channel.ack(msg);
      }
    });

    logger.info('WORKer', 'Audit Worker is monitoring all events...');
  } catch (err) {
    logger.error('WORKER', `Audit Worker failed: ${err.message}`);
  }
};

module.exports = startAuditWorker;
