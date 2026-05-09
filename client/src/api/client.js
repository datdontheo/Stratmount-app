import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    const data = res.data;
    // Detect infrastructure error responses (Vercel/proxy) that arrive as 2xx
    if (data && typeof data === 'object' && !Array.isArray(data) && data.code && data.message && !data.id && !data.token) {
      return Promise.reject(data);
    }
    return data;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sm_token');
      localStorage.removeItem('sm_user');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;
