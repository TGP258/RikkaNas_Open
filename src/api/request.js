import axios from 'axios';

// 创建axios实例
const api = axios.create({
  // 注意：这里使用相对路径，依赖Vite代理
  // 如果局域网访问有问题，可以改为 'http://192.168.0.107:3000'
  baseURL: '', 
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

export default api;
