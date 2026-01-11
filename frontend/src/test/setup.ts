import '@testing-library/jest-dom';

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_API_URL: 'http://localhost:8000/api',
    VITE_ACCESS_TOKEN_KEY: 'access_token',
    VITE_REFRESH_TOKEN_KEY: 'refresh_token',
  },
  writable: true,
});