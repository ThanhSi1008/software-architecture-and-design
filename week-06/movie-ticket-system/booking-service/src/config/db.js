const mongoose = require('mongoose');
const { createLogger } = require('../../../shared/logger');
const logger = createLogger('BOOKING-SERVICE');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
    logger.info('DB', `Connected to MongoDB: ${uri}`);
  } catch (err) {
    logger.error('DB', `MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
