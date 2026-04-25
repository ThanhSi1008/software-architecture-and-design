const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const startWorker = require('./workers/paymentWorker');
const { createLogger } = require('../../shared/logger');

dotenv.config();

const app = express();
const logger = createLogger('BOOKING-SERVICE');

// Middleware
app.use(cors());
app.use(express.json());

// DB & Event Worker
connectDB();
startWorker();

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'booking-service' });
});

// Routes
app.use('/api/bookings', require('./routes/bookingRoutes'));

const PORT = process.env.PORT || 8083;
app.listen(PORT, () => {
  logger.info('SERVER', `Running on port ${PORT}`);
});
