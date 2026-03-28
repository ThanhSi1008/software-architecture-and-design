# --- Build Stage ---
FROM node:18-alpine AS builder

WORKDIR /app

# Copy các file cấu hình và cài đặt dependencies
COPY package*.json ./
RUN npm install

# Copy toàn bộ source code
COPY . .

# Build ứng dụng React ra thư mục dist
RUN npm run build

# --- Run Stage ---
FROM node:18-alpine

WORKDIR /app

# Cài đặt server tĩnh serve toàn cục
RUN npm install -g serve

# Copy thư mục build (dist) từ stage builder sang stage hiện tại
COPY --from=builder /app/dist ./dist

# Mở cổng 3000
EXPOSE 3000

# Chạy lệnh serve thư mục dist trên cổng 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
