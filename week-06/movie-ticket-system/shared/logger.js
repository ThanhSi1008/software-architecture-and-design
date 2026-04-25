function createLogger(serviceName) {
  return {
    info: (action, message) => {
      console.log(`[${serviceName}] [${new Date().toISOString()}] [${action}] ${message}`);
    },
    error: (action, message) => {
      console.error(`[${serviceName}] [${new Date().toISOString()}] [ERROR] [${action}] ${message}`);
    },
  };
}

module.exports = { createLogger };
