const Movie = require('../models/Movie');
const { connectBroker, consumeEvent } = require('../../../shared/broker');
const { PAYMENT_COMPLETED } = require('../../../shared/events');
const { createLogger } = require('../../../shared/logger');

const logger = createLogger('MOVIE-WORKER');

const startMovieWorker = async () => {
  try {
    const { channel } = await connectBroker(process.env.RABBITMQ_URL);

    // Lắng nghe khi thanh toán thành công để trừ ghế và chặn ghế
    await consumeEvent(channel, 'movie_inventory_update_queue', PAYMENT_COMPLETED, async (data) => {
      const { movieId, seats, seatDetails } = data.data;

      try {
        const seatsToBlock = seatDetails ? seatDetails.split(',').map(s => s.trim()) : [];
        
        const movie = await Movie.findByIdAndUpdate(
          movieId,
          { 
            $inc: { availableSeats: -seats },
            $addToSet: { bookedSeats: { $each: seatsToBlock } }
          },
          { new: true }
        );

        if (movie) {
          logger.info('INVENTORY_UPDATE', `Updated inventory for movie ${movieId}: -${seats} seats. Remaining: ${movie.availableSeats}`);
        }
      } catch (dbErr) {
        logger.error('DB_UPDATE_FAILED', `Failed to update inventory for movie ${movieId}: ${dbErr.message}`);
      }
    });

    logger.info('WORKER', 'Movie Inventory Worker is listening for PAYMENT_COMPLETED...');
  } catch (err) {
    logger.error('WORKER', `Movie Worker failed: ${err.message}`);
  }
};

module.exports = startMovieWorker;
