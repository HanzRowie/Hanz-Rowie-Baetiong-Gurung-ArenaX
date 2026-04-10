/**
 * Shared token utilities for WebSocket connections.
 *
 * WebSocket connections pass the JWT as a query param and bypass the Axios
 * interceptor that normally handles token refresh. This utility ensures the
 * access token is fresh before any WS reconnect attempt.
 */
import axios from 'axios';
import { API_URL, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, API_ENDPOINTS } from './constants';

/**
 * Returns true if the stored access token is expired or will expire within
 * the given threshold (default 30 seconds).
 */
export function isTokenExpiredOrExpiring(thresholdMs = 30000): boolean {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 - Date.now() < thresholdMs;
  } catch {
    return true;
  }
}

/**
 * Refreshes the access token if it is expired or expiring soon.
 * Stores the new token in localStorage so subsequent WS connections pick it up.
 * Returns the (possibly refreshed) access token, or null if refresh failed.
 */
export async function ensureFreshToken(): Promise<string | null> {
  if (!isTokenExpiredOrExpiring()) {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const response = await axios.post(
      `${API_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
      { refresh_token: refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    );
    const newToken: string = response.data.access_token;
    localStorage.setItem(ACCESS_TOKEN_KEY, newToken);
    return newToken;
  } catch (err) {
    console.error('[tokenUtils] Token refresh failed:', err);
    return null;
  }
}
