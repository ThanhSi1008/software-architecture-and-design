# Kế hoạch thực hiện Hệ thống Food Delivery (Hybrid Architecture)

## 1. Tổng quan bài toán
Xây dựng hệ thống Food Delivery giống GrabFood/ShopeeFood mini áp dụng kiến trúc **Hybrid (Event-Driven + Microservices)**.
- **Microservices (REST)**: Đảm bảo phản hồi nhanh cho các thao tác đồng bộ của người dùng.
- **Event-Driven (Async)**: Xử lý các tác vụ chạy ngầm hậu trường (ví dụ: thanh toán, gửi thông báo) thông qua Message Broker.

## 2. Các chức năng chính (5 chức năng)
1. **Quản lý người dùng**: Đăng ký / đăng nhập.
2. **Xem món ăn**: Danh sách món, chi tiết món.
3. **Đặt hàng**: Tạo order, xem order.
4. **Thanh toán**: Thanh toán đơn hàng.
5. **Thông báo**: Gửi thông báo khi order thành công.

## 3. Yêu cầu kiến trúc (Hybrid)

### 3.1. Microservices (REST - Synchronous)
- **Luồng**: `Frontend → API Gateway → Service`
- **Áp dụng cho các tác vụ cần phản hồi ngay**:
  - Login (Quản lý người dùng)
  - Get data (Lấy danh sách món ăn, thông tin order)

### 3.2. Event-Driven (Asynchronous)
- **Luồng**: `Service → Message Broker (Kafka/RabbitMQ) → Service (Consumer)`
- **Áp dụng cho các tác vụ không cần phản hồi ngay (chạy ngầm)**:
  - Payment (Thanh toán)
  - Notification (Thông báo)
  - Order processing hậu kỳ

**Nguyên lý thiết kế cốt lõi**:
- Cần response ngay: Sử dụng **REST**
- Không cần response ngay: Sử dụng **Event**

## 4. Luồng hệ thống (Flow chính)
1. **User** gửi request qua **Frontend** đến **API Gateway**.
2. **API Gateway** định tuyến request tạo đơn hàng đến **Order Service** (REST).
3. **Order Service**:
   - Lưu thông tin order vào Database.
   - Publish event: `ORDER_CREATED` lên Message Broker.
4. **Payment Service** (Consume event `ORDER_CREATED`):
   - Xử lý nghiệp vụ thanh toán.
   - Publish event: `PAYMENT_SUCCESS` (hoặc `PAYMENT_FAILED`).
5. **Notification Service** (Consume event `PAYMENT_SUCCESS` hoặc `PAYMENT_FAILED`):
   - Gửi thông báo (Push notification/Email/SMS) cho người dùng.

## 5. Danh sách Event
- `ORDER_CREATED`: Tạo đơn hàng thành công, chờ thanh toán.
- `PAYMENT_SUCCESS`: Thanh toán thành công.
- `PAYMENT_FAILED`: Thanh toán thất bại.

## 6. Sơ đồ triển khai dự kiến (IP & Port)
- **API Gateway**: `localhost:8080`
- **User/Food Service**: `localhost:8081`
- **Order Service**: `localhost:8082`
- **Payment Service**: `localhost:8083`
- **Notification Service**: `localhost:8084`
- **Frontend**: `localhost:3000`
- **Message Broker (RabbitMQ)**: `localhost:5672`

## 7. Kịch bản demo
1. **User login**: Gọi API đồng bộ (REST) qua User/Food Service.
2. **Xem món**: Gọi API đồng bộ (REST) qua User/Food Service.
3. **Đặt hàng**: Gửi request tạo Order (REST) đến Order Service, nhận phản hồi ngay lập tức.
4. **Payment chạy ngầm**: Payment Service bắt event `ORDER_CREATED` để xử lý thanh toán (Event).
5. **Notification hiển thị**: Notification Service bắt event `PAYMENT_SUCCESS` để gửi thông báo đến Frontend cho User.
