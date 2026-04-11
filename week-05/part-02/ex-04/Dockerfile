FROM node:18-alpine

# Khởi tạo thư mục làm việc bên trong container
WORKDIR /app

# Copy các manifest file (chứa thông tin thư viện cần cài đặt) vào trước
COPY package*.json ./

# Cài đặt thư viện (Express)
RUN npm install

# Copy toàn bộ code vào trong container
COPY . .

# Expose cổng 3000 do ứng dụng sử dụng cổng này
EXPOSE 3000

# Lệnh khởi động app
CMD ["npm", "start"]
