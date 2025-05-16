import axios from 'axios';
import Cookies from 'js-cookie';
import { isTokenExpired } from '@/libs/auth/tokenUtils';
import { HTTP_STATUS } from '@/libs/constants/httpStatus';

const api = axios.create({
  baseURL: process.env.NEXT_APP_BACKEND_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, 
});

api.interceptors.request.use(
  (config) => {
    const accessToken = Cookies.get('access_token');
    
    // Check if token is expired before making the request
    if (accessToken && isTokenExpired()) {
      // Clear the token
      Cookies.remove('access_token');
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
      
      // Reject the request
      return Promise.reject(new Error('Token expired'));
    }
    
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      console.log("accessToken in axios.ts", accessToken);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
      // Clear token on unauthorized response
      Cookies.remove('access_token');
      
      // Redirect to signin page
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
    }
    return Promise.reject(error);
  },
);

export default api;