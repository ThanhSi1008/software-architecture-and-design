# Sử dụng nginx:latest làm base image
FROM nginx:latest

# Copy file index.html từ máy gốc vào thư mục phục vụ web mặc định của Nginx
COPY index.html /usr/share/nginx/html/index.html

# Mở cổng 80 (cổng mặc định của HTTP/Nginx)
EXPOSE 80
