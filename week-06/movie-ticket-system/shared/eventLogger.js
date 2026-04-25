const mongoose = require('mongoose');

let logConn = null;

const logEventToDB = async (serviceName, eventType, payload) => {
  try {
    // Tự tạo connection riêng nếu chưa có
    if (!logConn) {
      const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/movie_ticket_bookings';
      logConn = await mongoose.createConnection(mongoUri).asPromise();
    }
    
    await logConn.collection('audit_event_logs').insertOne({
      serviceName,
      eventType,
      payload,
      timestamp: new Date()
    });
    console.log(`✅ [EVENT-LOG] Event ${eventType} saved to DB.`);
  } catch (err) {
    console.error(`[EVENT-LOG-ERROR] Failed to save log: ${err.message}`);
  }
};

module.exports = { logEventToDB };
