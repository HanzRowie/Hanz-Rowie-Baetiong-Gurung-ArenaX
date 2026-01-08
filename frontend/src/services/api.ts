import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';

// Extend AxiosRequestConfig to include metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: Date;
    };
  }
}
import { API_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, API_ENDPOINTS } from '@/utils/constants';
import type { RefreshTokenRequest, RefreshTokenResponse, ApiError } from '@/types/auth.types';

// Create axios instance with enhanced configuration
export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Track if we're currently refreshing token to avoid multiple refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: any) => void;
}> = [];

// Process the queue of failed requests after token refresh
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  
  failedQueue = [];
};

// Request interceptor to add auth token and common headers
api.interceptors.request.use(
  (config) => {
    // Add authorization header if token exists
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh and error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log response time for debugging
    const endTime = new Date();
    const startTime = response.config.metadata?.startTime;
    if (startTime) {
      const duration = endTime.getTime() - startTime.getTime();
      console.debug(`API Request to ${response.config.url} took ${duration}ms`);
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      
      // Create a user-friendly error for network issues
      const networkError: ApiError = {
        message: 'Network error. Please check your internet connection and try again.',
        code: 'NETWORK_ERROR'
      };
      
      return Promise.reject(networkError);
    }

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers!.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      
      if (!refreshToken) {
        // No refresh token available, redirect to login
        processQueue(error, null);
        isRefreshing = false;
        clearTokensAndRedirect();
        return Promise.reject(error);
      }

      try {
        // Attempt to refresh the token
        const refreshResponse = await axios.post<RefreshTokenResponse>(
          `${API_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
          { refresh_token: refreshToken } as RefreshTokenRequest,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        const { access_token } = refreshResponse.data;
        
        // Store new access token
        localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
        
        // Update the authorization header for the original request
        originalRequest.headers!.Authorization = `Bearer ${access_token}`;
        
        // Process queued requests with new token
        processQueue(null, access_token);
        isRefreshing = false;
        
        // Retry the original request
        return api(originalRequest);
        
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        processQueue(refreshError, null);
        isRefreshing = false;
        clearTokensAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    // Handle other HTTP errors
    const responseData = error.response?.data as any;
    const apiError: ApiError = {
      message: responseData?.error || responseData?.message || error.message || 'An unexpected error occurred',
      code: responseData?.error?.code || `HTTP_${error.response.status}`,
      details: responseData?.error?.details || responseData
    };

    // Log error for debugging
    console.error('API Error:', {
      url: originalRequest.url,
      method: originalRequest.method,
      status: error.response.status,
      error: apiError,
      originalResponse: responseData
    });

    // Preserve the original error structure for better error handling
    const enhancedError = {
      ...error,
      response: {
        ...error.response,
        data: responseData
      },
      ...apiError
    };

    return Promise.reject(enhancedError);
  }
);

// Helper function to clear tokens and redirect to login
const clearTokensAndRedirect = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  
  // Only redirect if we're not already on the login page
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Add retry logic for specific error types
export const apiWithRetry = {
  async request<T>(config: AxiosRequestConfig, maxRetries: number = 3): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await api.request<T>(config);
        return response.data;
      } catch (error) {
        lastError = error;
        
        // Type guard for axios error
        if (error instanceof AxiosError && error.response) {
          // Don't retry on client errors (4xx) except for 408, 429
          if (error.response.status >= 400 && error.response.status < 500) {
            if (error.response.status !== 408 && error.response.status !== 429) {
              throw error;
            }
          }
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Calculate exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`Request failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
};

// Export the configured axios instance
export default api;
