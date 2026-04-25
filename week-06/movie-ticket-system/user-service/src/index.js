const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { createLogger } = require('../../shared/logger');

dotenv.config();

const app = express();
const logger = createLogger('USER-SERVICE');

// Middleware
app.use(cors());
app.use(express.json());

// Kết nối DB
connectDB();

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'user-service', timestamp: new Date() });
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));

// Start server
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  logger.info('SERVER', `Running on port ${PORT}`);
});
