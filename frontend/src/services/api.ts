import axios from 'axios';

// 自动检测服务器地址（支持本机和局域网访问）
const getBaseUrl = () => {
  const hostname = window.location.hostname;
  // 如果是localhost或127.0.0.1，使用localhost:3001
  // 如果是局域网IP，使用当前IP:3001
  return `http://${hostname}:3001/api`;
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 商品API
export const productAPI = {
  getAll: () => api.get('/products'),
  getByBarcode: (barcode: string) => api.get(`/products/barcode/${barcode}`),
  create: (data: any) => api.post('/products', data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

// 入库API
export const stockInAPI = {
  create: (data: any) => api.post('/stock-in', data),
  getAll: (params?: any) => api.get('/stock-in', { params }),
};

// 出库API
export const stockOutAPI = {
  create: (data: any) => api.post('/stock-out', data),
  getAll: (params?: any) => api.get('/stock-out', { params }),
};

// 统计API
export const statisticsAPI = {
  getStats: (params?: any) => api.get('/statistics', { params }),
  getTopProducts: (limit?: number) => api.get('/top-products', { params: { limit } }),
};

export default api;
