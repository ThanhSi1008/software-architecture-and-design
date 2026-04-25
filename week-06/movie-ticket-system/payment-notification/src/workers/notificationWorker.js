const { connectBroker, consumeEvent } = require('../../../shared/broker');
const { USER_REGISTERED, PAYMENT_COMPLETED, BOOKING_FAILED } = require('../../../shared/events');
const { createLogger } = require('../../../shared/logger');

const logger = createLogger('NOTIFICATION-SERVICE');

const startNotificationWorker = async () => {
  try {
    const { channel } = await connectBroker(process.env.RABBITMQ_URL);

    // Thông báo khi có user mới
    await consumeEvent(channel, 'notification_user_registered_queue', USER_REGISTERED, async (data) => {
      const { username, email } = data.data;
      console.log('\n--------------------------------------------------');
      console.log(`📧 [NOTIFICATION] Gửi email chào mừng tới: ${username} (${email})`);
      console.log('--------------------------------------------------\n');
    });

    // Thông báo khi đặt vé thành công
    await consumeEvent(channel, 'notification_payment_completed_queue', PAYMENT_COMPLETED, async (data) => {
      const { bookingId, username } = data.data;
      console.log('\n' + '='.repeat(50));
      console.log(`🔔 [NOTIFICATION] Booking #${bookingId} thành công!`);
      console.log(`👤 User ${username} đã đặt đơn #${bookingId} thành công`);
      console.log('='.repeat(50) + '\n');
    });

    // Thông báo khi thanh toán thất bại
    await consumeEvent(channel, 'notification_booking_failed_queue', BOOKING_FAILED, async (data) => {
      const { bookingId } = data.data;
      console.log('\n--------------------------------------------------');
      console.log(`❌ [NOTIFICATION] Rất tiếc! Giao dịch cho vé #${bookingId} của bạn đã thất bại.`);
      console.log('--------------------------------------------------\n');
    });

    logger.info('WORKER', 'Notification Worker is listening for events...');
  } catch (err) {
    logger.error('WORKER', `Notification Worker failed: ${err.message}`);
  }
};

module.exports = startNotificationWorker;
