const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const startPaymentWorker = require('./workers/paymentWorker');
const startNotificationWorker = require('./workers/notificationWorker');
const startAuditWorker = require('./workers/auditWorker');
const connectDB = require('../../booking-service/src/config/db'); // Sửa lại path lùi 2 cấp
const { createLogger } = require('../../shared/logger');

dotenv.config();
connectDB(); // Kết nối để lưu Audit Log

const app = express();
const logger = createLogger('PAYMENT-NOTIFICATION-SERVICE');

app.use(cors());
app.use(express.json());

// Khởi chạy ứng dụng
const startApp = async () => {
  try {
    // 1. Kết nối DB trước
    await connectDB();
    logger.info('DB', 'Audit database connected');

    // 2. Khởi chạy các workers sau khi DB đã sẵn sàng
    startPaymentWorker();
    startNotificationWorker();
    startAuditWorker();

    const PORT = process.env.PORT || 8084;
    app.listen(PORT, () => {
      logger.info('SERVER', `Service running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('SERVER', `Failed to start service: ${err.message}`);
    process.exit(1);
  }
};

startApp();
