import axiosLib from 'axios';

let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

const api = axiosLib.create({
  withCredentials: true
});

// Request interceptor to attach bearer token if present
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 token refresh automatically
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the error is 401 and the request has not been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Use raw axios to prevent request interceptor looping
        const refreshRes = await axiosLib.post('/api/auth/refresh', {}, { withCredentials: true });
        const newToken = refreshRes.data.accessToken;
        
        setAccessToken(newToken);
        
        // Notify AuthContext of the token update
        window.dispatchEvent(new CustomEvent('auth:token_refreshed', { detail: newToken }));
        
        // Update original request headers and retry
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        // Refresh token failed -> trigger logout
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
