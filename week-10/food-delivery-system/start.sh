#!/bin/bash

echo "======================================"
echo "  Food Delivery System - Startup"
echo "======================================"

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# ─── 1. Kiểm tra Docker ───────────────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
  echo "[ERROR] Docker chưa được cài đặt. Vui lòng cài Docker trước."
  exit 1
fi

# ─── 2. Kiểm tra Node.js ────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo "[ERROR] Node.js chưa được cài đặt."
  exit 1
fi

# ─── 3. Cài npm dependencies cho tất cả services ───────────────────────────
SERVICES=("api-gateway" "user-food-service" "order-service" "payment-service" "notification-service")

for svc in "${SERVICES[@]}"; do
  echo "[INFO] Cài dependencies cho $svc..."
  cd "$ROOT_DIR/$svc" && npm install --silent && cd "$ROOT_DIR"
done

# ─── 4. Cài frontend dependencies ─────────────────────────────────────────
echo "[INFO] Cài dependencies cho frontend..."
cd "$ROOT_DIR/frontend" && npm install --silent && cd "$ROOT_DIR"

# ─── 5. Chạy RabbitMQ ─────────────────────────────────────────────────────
echo ""
echo "[INFO] Khởi động RabbitMQ..."
docker compose up -d
echo "[INFO] Đợi RabbitMQ sẵn sàng (15s)..."
sleep 15

# ─── 6. Khởi động các backend services ────────────────────────────────────
echo ""
echo "[INFO] Khởi động API Gateway      (localhost:8080)..."
cd "$ROOT_DIR/api-gateway" && node index.js &
sleep 1

echo "[INFO] Khởi động User/Food Service (localhost:8081)..."
cd "$ROOT_DIR/user-food-service" && node index.js &
sleep 1

echo "[INFO] Khởi động Order Service     (localhost:8082)..."
cd "$ROOT_DIR/order-service" && node index.js &
sleep 1

echo "[INFO] Khởi động Payment Service   (localhost:8083)..."
cd "$ROOT_DIR/payment-service" && node index.js &
sleep 1

echo "[INFO] Khởi động Notification Svc  (localhost:8084)..."
cd "$ROOT_DIR/notification-service" && node index.js &
sleep 2

# ─── 7. Khởi động Frontend ──────────────────────────────────────────────
echo ""
echo "[INFO] Khởi động Frontend (localhost:3000)..."
cd "$ROOT_DIR/frontend" && npm run dev &

echo ""
echo "======================================"
echo "  Hệ thống đang chạy!"
echo "  Frontend  : http://localhost:3000"
echo "  API Gateway: http://localhost:8080"
echo "  RabbitMQ UI: http://localhost:15672"
echo "  (user: admin / pass: admin)"
echo "======================================"
echo "  Nhấn Ctrl+C để dừng tất cả."
wait
