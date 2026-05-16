const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = 8080;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(morgan("dev"));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    service: "API Gateway",
    status: "UP",
    port: PORT,
    timestamp: new Date().toISOString(),
    routes: {
      "/api/users  → localhost:8081 (User/Food Service)": "REST",
      "/api/foods  → localhost:8081 (User/Food Service)": "REST",
      "/api/orders → localhost:8082 (Order Service)": "REST",
    },
  });
});

// ─── Proxy Routes ─────────────────────────────────────────────────────────────

// Route: /api/users và /api/foods → User/Food Service (8081)
app.use(
  ["/api/users", "/api/foods"],
  createProxyMiddleware({
    target: "http://localhost:8081",
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        console.log(
          `[Gateway] ${req.method} ${req.path} → localhost:8081 (User/Food Service)`
        );
      },
    },
  })
);

// Route: /api/orders → Order Service (8082)
app.use(
  "/api/orders",
  createProxyMiddleware({
    target: "http://localhost:8082",
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        console.log(
          `[Gateway] ${req.method} ${req.path} → localhost:8082 (Order Service)`
        );
      },
    },
  })
);

// Route: /api/notifications → Notification Service (8084)
app.use(
  "/api/notifications",
  createProxyMiddleware({
    target: "http://localhost:8084",
    changeOrigin: true,
    // SSE cần tắt buffer
    selfHandleResponse: false,
    on: {
      proxyReq: (proxyReq, req) => {
        console.log(
          `[Gateway] ${req.method} ${req.path} → localhost:8084 (Notification Service)`
        );
      },
    },
  })
);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  API Gateway running on localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  /api/users, /api/foods  → :8081`);
  console.log(`  /api/orders             → :8082`);
  console.log(`  /api/notifications      → :8084`);
});
