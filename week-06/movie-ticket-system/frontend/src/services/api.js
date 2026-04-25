import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8080/api', // Gọi qua API Gateway
});

// Tự động đính kèm Token vào Header nếu có
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
