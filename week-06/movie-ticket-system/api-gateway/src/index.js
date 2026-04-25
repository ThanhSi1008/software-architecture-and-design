const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { createLogger } = require('../../shared/logger');

dotenv.config();

const app = express();
const logger = createLogger('API-GATEWAY');

// Middleware
app.use(cors());
app.use(morgan('dev')); // Log requests

// Định tuyến tới các Microservices
const routes = {
  '/api/users': process.env.USER_SERVICE_URL,
  '/api/movies': process.env.MOVIE_SERVICE_URL,
  '/api/bookings': process.env.BOOKING_SERVICE_URL,
};

// Thiết lập Proxy cho từng route
for (const [path, target] of Object.entries(routes)) {
  app.use(path, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (pathStr, req) => req.originalUrl, // Ép giữ nguyên đường dẫn gốc
    onProxyReq: (proxyReq, req, res) => {
      logger.info('PROXY', `Forwarding: ${req.method} ${req.originalUrl} -> ${target}${req.originalUrl}`);
    },
    onError: (err, req, res) => {
      logger.error('PROXY', `Error forwarding to ${target}: ${err.message}`);
      res.status(502).json({ success: false, message: 'Service tạm thời không khả dụng' });
    }
  }));
}

// Admin Dashboard - Xem Event Logs trực tiếp
const mongoose = require('mongoose');
app.get('/admin/logs', async (req, res) => {
  try {
    const conn = await mongoose.createConnection(process.env.MONGO_URI || 'mongodb://localhost:27017/movie_ticket_bookings').asPromise();
    const logs = await conn.collection('audit_event_logs').find().sort({ timestamp: -1 }).limit(50).toArray();
    
    let html = `
      <html>
        <head>
          <title>EDA Event Dashboard</title>
          <style>
            body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
            h1 { color: #38bdf8; }
            table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #334155; }
            th { background: #334155; color: #38bdf8; }
            .event-type { font-weight: bold; color: #fbbf24; }
            .timestamp { color: #94a3b8; font-size: 0.8em; }
          </style>
          <meta http-equiv="refresh" content="5">
        </head>
        <body>
          <h1>🚀 Realtime Event Dashboard (Auto-refresh)</h1>
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Loại Sự Kiện</th>
                <th>Dữ liệu (Payload)</th>
              </tr>
            </thead>
            <tbody>
              ${logs.length === 0 ? '<tr><td colspan="3" style="text-align:center; padding: 20px;">Chưa có sự kiện nào. Hãy thử đặt vé để xem dòng chảy EDA!</td></tr>' : ''}
              ${logs.map(log => `
                <tr>
                  <td class="timestamp">${new Date(log.timestamp).toLocaleString()}</td>
                  <td class="event-type">${log.eventType}</td>
                  <td><pre style="font-size: 0.7em;">${JSON.stringify(log.payload, null, 2)}</pre></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    res.status(500).send('Lỗi khi tải Dashboard: ' + err.message);
  }
});

// Health check Gateway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'api-gateway' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info('SERVER', `API Gateway is running on port ${PORT}`);
  console.log(`\n🚀 Gateway mapping:`);
  Object.entries(routes).forEach(([path, target]) => {
    console.log(`   ${path}  ==>  ${target}`);
  });
  console.log('\n');
});
