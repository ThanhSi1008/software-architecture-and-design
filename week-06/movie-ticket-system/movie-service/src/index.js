const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { createLogger } = require('../../shared/logger');

const app = express();
const logger = createLogger('MOVIE-SERVICE');

// Middleware
app.use(cors());
app.use(express.json());

// Kết nối DB
connectDB();

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'movie-service', timestamp: new Date() });
});

// Routes
app.use('/api/movies', require('./routes/movieRoutes'));

// Worker (EDA)
const startMovieWorker = require('./workers/movieWorker');
startMovieWorker();

// Start server
const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  logger.info('SERVER', `Running on port ${PORT}`);
});
