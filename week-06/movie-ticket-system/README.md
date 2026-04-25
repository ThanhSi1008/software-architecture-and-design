# 🎬 Movie Ticket System - Development Guide

Chào mừng bạn đến với dự án Movie Ticket System! Đây là tài liệu hướng dẫn và thống nhất kỹ thuật dành cho tất cả lập trình viên tham gia dự án.
**VUI LÒNG ĐỌC KỸ TÀI LIỆU NÀY TRƯỚC KHI BẮT ĐẦU CODE.**

---

## 1. Tổng quan Kiến Trúc (Event-Driven Architecture)

Hệ thống bao gồm 5 microservices chính giao tiếp với nhau chủ yếu qua Message Broker (RabbitMQ) và một Frontend (ReactJS).
Các service **KHÔNG GỌI TRỰC TIẾP LẪN NHAU** (trừ Gateway proxy request từ client). Mọi giao tiếp nghiệp vụ chéo service đều dùng Event.

```
Frontend (8085) --> API Gateway (8080) --> Các Services:
- User Service (8081)
- Movie Service (8082)
- Booking Service (8083) - CORE
- Payment & Notification Service (8084)
```

## 2. Tech Stack Thống Nhất

| Layer | Công nghệ |
|---|---|
| **Runtime** | Node.js >= 18.x |
| **Framework** | Express.js ^4.18.x |
| **Database** | MongoDB 7.x (thông qua Mongoose ^8.x) |
| **Message Broker** | RabbitMQ 3.13 (thông qua amqplib) |
| **Frontend** | React.js (Vite) + Axios + React Router |
| **Orchestration**| Docker + Docker Compose |

## 3. Quy ước Port & Môi trường (.env)

Tất cả các service chạy trên host `localhost` khi dev (hoặc IP LAN nếu test nhiều máy).

*   **API Gateway:** `8080`
*   **User Service:** `8081` (DB: `movie_ticket_users`)
*   **Movie Service:** `8082` (DB: `movie_ticket_movies`)
*   **Booking Service:** `8083` (DB: `movie_ticket_bookings`)
*   **Payment & Notification:** `8084`
*   **Frontend React:** `8085`

**Mẫu biến môi trường (.env) cho các backend service:**
```env
PORT=808x
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/movie_ticket_<service_name>
RABBITMQ_URL=amqp://guest:guest@localhost:5673
JWT_SECRET=movie-ticket-secret-key-2026
```

## 4. Hợp đồng Event (Event Contract)

Tất cả event được định nghĩa trong `shared/events.js`.
RabbitMQ sử dụng **Topic Exchange** có tên là `movie_ticket_exchange`.
Payload của mọi message **phải tuân thủ chuẩn:**
```json
{
  "event": "EVENT_NAME",
  "timestamp": "2026-04-25T12:00:00.000Z",
  "data": { /* Dữ liệu chi tiết */ }
}
```

*   **USER_REGISTERED:** Bắn ra bởi User Service, Notification Service nghe.
*   **BOOKING_CREATED:** Bắn ra bởi Booking Service, Payment Service nghe.
*   **PAYMENT_COMPLETED:** Bắn ra bởi Payment Service. Booking và Notification nghe.
*   **BOOKING_FAILED:** Bắn ra bởi Payment Service. Booking và Notification nghe.

## 5. API Response Format Thống Nhất

**Thành công:**
```json
{ "success": true, "message": "...", "data": { } }
```
**Lỗi:**
```json
{ "success": false, "message": "...", "error": "..." }
```

---

## 6. Trạng Thái Hiện Tại & Các Bước Tiếp Theo

> 🗄️ **Thiết kế Database:** Xem chi tiết cấu trúc Database (Schema) tại `../db-design.md`.
> 📚 **API Specification & Sequence Diagram:** Xem chi tiết luồng xử lý và các Endpoints API tại `../api-docs.md`. Frontend (Người 1) sẽ dựa vào đây để code.

### Đã hoàn thành (Phase 0 -> 5):
- [x] Tạo cấu trúc thư mục chuẩn cho toàn bộ project.
- [x] Cấu hình Docker Compose cho infrastructure (MongoDB, RabbitMQ).
- [x] Thiết lập thư mục `shared/` chứa logic dùng chung.
- [x] **[Phase 1]** Hoàn thành User Service (Đăng ký, Đăng nhập).
- [x] **[Phase 2]** Hoàn thành Movie Service (Quản lý Phim, Seed Data).
- [x] **[Phase 3]** Hoàn thành Booking Service (Đặt vé, Sync API, Event Worker).
- [x] **[Phase 4]** Hoàn thành Payment & Notification Service (Giả lập thanh toán, Log thông báo).
- [x] **[Phase 5]** Hoàn thành API Gateway (Cổng truy cập duy nhất port 8080).

- [x] **[Phase 6]** Hoàn thành Frontend React (Giao diện hiện đại, đặt vé Real-time).

---

## 7. Kết luận & Chúc mừng! 🏆🚀

Dự án **Movie Ticket System** đã hoàn thiện toàn bộ các tính năng cốt lõi theo đúng mô hình kiến trúc Microservices. Chúc mừng bạn đã hoàn thành hệ thống này! 🎬🍿

## 7. Khởi Động Nhanh Toàn Bộ Hệ Thống ⚡

Thay vì phải chạy từng service thủ công, bạn chỉ cần đứng tại thư mục gốc `movie-ticket-system` và chạy:

```bash
npm run dev
```

Lệnh này sẽ tự động khởi động:
- **API Gateway** (8080)
- **User Service** (8081)
- **Movie Service** (8082)
- **Booking Service** (8083)
- **Payment & Notification** (8084)
- **Frontend React** (8085)

---

## 8. Cách Chạy Infrastructure (MongoDB & RabbitMQ)

Để bắt đầu code, bạn cần chạy Database và Message Broker:

```bash
# Đứng tại thư mục gốc movie-ticket-system
docker-compose up -d

# Kiểm tra RabbitMQ Management
# Truy cập: http://localhost:15672 (guest/guest)
```

Chúc team code vui vẻ! 🚀
