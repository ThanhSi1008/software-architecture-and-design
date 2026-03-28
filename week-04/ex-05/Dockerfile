# --- Build Stage ---
FROM golang:1.20-alpine AS builder

# Đặt thư mục làm việc trong container
WORKDIR /app

# Copy go.mod trước để cài đặt library (nếu có update) có thể tận dụng cache
COPY go.mod ./

# (Tuỳ chọn) Cài dependencies nếu mã nguồn thực tế sử dụng các package ngoài
RUN go mod download

# Copy toàn bộ file code vào thư mục làm việc
COPY . .

# Build ứng dụng. CGO_ENABLED=0 để tắt CGO giúp build file chạy độc lập tốt hơn trên Alpine/Scratch
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# --- Run Stage ---
# Dùng Alpine siêu nhẹ làm môi trường gốc để chạy file đã build thay vì ôm cả bộ công cụ Golang
FROM alpine:latest

WORKDIR /app

# Copy kết quả file 'main' từ Stage builder ở trên
COPY --from=builder /app/main .

# Mở cổng 8080
EXPOSE 8080

# Chạy lệnh
CMD ["./main"]
