import axios from 'axios';

const getBaseUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:3001/api`;
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 商品 API
export const productAPI = {
  getAll: () => api.get('/products'),
  getByBarcode: (barcode: string) => api.get(`/products/barcode/${barcode}`),
  create: (data: any) => api.post('/products', data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
};

// 入库 API
export const stockInAPI = {
  create: (data: any) => api.post('/stock-in', data),
  getAll: (params?: any) => api.get('/stock-in', { params }),
};

// 出库 API
export const stockOutAPI = {
  create: (data: any) => api.post('/stock-out', data),
  getAll: (params?: any) => api.get('/stock-out', { params }),
};

// 统计 API
export const statisticsAPI = {
  getStats: (params?: any) => api.get('/statistics', { params }),
  getTopProducts: (limit?: number, params?: any) => api.get('/statistics/top-products', { params: { limit, ...params } }),
};

// 批次 API
export const batchAPI = {
  getAll: (params?: any) => api.get('/batches', { params }),
  delete: (id: number) => api.delete(`/batches/${id}`),
};

// 货架 API
export const shelfAPI = {
  getAll: () => api.get('/shelf'),
  getBatches: (barcode: string) => api.get(`/shelf/batches/${barcode}`),
  stock: (data: any) => api.post('/shelf/stock', data),
  remove: (data: any) => api.post('/shelf/remove', data),
  getLowStock: () => api.get('/shelf/low-stock'),
};

// 临期商品 API
export const nearExpiryAPI = {
  getNearExpiryProducts: (days?: number) => api.get('/near-expiry-products', { params: { days } }),
};

export default api;
