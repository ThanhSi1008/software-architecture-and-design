const { connectBroker, consumeEvent, publishEvent } = require('../../../shared/broker');
const { BOOKING_CREATED, PAYMENT_COMPLETED, BOOKING_FAILED } = require('../../../shared/events');
const { createLogger } = require('../../../shared/logger');
const { logEventToDB } = require('../../../shared/eventLogger');

const logger = createLogger('PAYMENT-SERVICE');

const startPaymentWorker = async () => {
  try {
    const { channel } = await connectBroker(process.env.RABBITMQ_URL);

    await consumeEvent(channel, 'payment_process_queue', BOOKING_CREATED, async (data) => {
      const { bookingId, totalPrice, username, movieId, seats, seatDetails } = data.data;
      
      logger.info('PAYMENT_PROCESS', `Processing payment for booking ${bookingId} (User: ${username}, Amount: ${totalPrice} VNĐ)...`);

      // Giả lập thời gian xử lý ngân hàng (3 giây)
      setTimeout(async () => {
        const isSuccess = Math.random() > 0.3; // 70% thành công

        if (isSuccess) {
          logger.info('PAYMENT_SUCCESS', `Payment for booking ${bookingId} successful!`);
          await publishEvent(channel, PAYMENT_COMPLETED, { bookingId, movieId, seats, seatDetails, totalPrice, username });
        } else {
          logger.error('PAYMENT_FAIL', `Payment for booking ${bookingId} failed!`);
          await publishEvent(channel, BOOKING_FAILED, { bookingId });
        }
      }, 3000);
    });

    logger.info('WORKER', 'Payment Worker is listening for BOOKING_CREATED...');
  } catch (err) {
    logger.error('WORKER', `Payment Worker failed: ${err.message}`);
  }
};

module.exports = startPaymentWorker;
