const Booking = require('../models/Booking');
const { connectBroker, consumeEvent } = require('../../../shared/broker');
const { PAYMENT_COMPLETED, BOOKING_FAILED } = require('../../../shared/events');
const { createLogger } = require('../../../shared/logger');

const logger = createLogger('BOOKING-WORKER');

const startWorker = async () => {
  try {
    const { channel } = await connectBroker(process.env.RABBITMQ_URL);
    
    // Nghe PAYMENT_COMPLETED
    await consumeEvent(channel, 'booking_payment_completed_queue', PAYMENT_COMPLETED, async (data) => {
      const { bookingId } = data.data;
      const booking = await Booking.findByIdAndUpdate(bookingId, { status: 'CONFIRMED' }, { new: true });
      if (booking) {
        logger.info('CONFIRM', `Booking ${bookingId} confirmed.`);
      }
    });

    // Nghe BOOKING_FAILED
    await consumeEvent(channel, 'booking_failed_queue', BOOKING_FAILED, async (data) => {
      const { bookingId } = data.data;
      const booking = await Booking.findByIdAndUpdate(bookingId, { status: 'FAILED' }, { new: true });
      if (booking) {
        logger.info('FAIL', `Booking ${bookingId} marked as FAILED.`);
      }
    });

    logger.info('WORKER', 'Booking Service Workers are listening...');
  } catch (err) {
    logger.error('WORKER', `Worker initialization failed: ${err.message}`);
  }
};

module.exports = startWorker;
