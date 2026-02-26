import type { WebSocketHandlers } from '@/types/chat.types';

// WebSocket Service for managing multiple WebSocket connections

class WebSocketService {
  private connections: Map<string, WebSocket> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private readonly maxReconnectAttempts = 5;
  private reconnectTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private handlers: Map<string, WebSocketHandlers> = new Map();

  /**
   * Connect to a WebSocket URL
   * @param url - WebSocket URL to connect to
   * @param handlers - Event handlers for the connection
   * @returns WebSocket instance
   */
  connect(url: string, handlers: WebSocketHandlers): WebSocket {
    // If already connected to this URL, return existing connection
    if (this.connections.has(url)) {
      const existingWs = this.connections.get(url)!;
      if (existingWs.readyState === WebSocket.OPEN || existingWs.readyState === WebSocket.CONNECTING) {
        return existingWs;
      }
    }

    // Store handlers for reconnection
    this.handlers.set(url, handlers);

    // Create new WebSocket connection
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log(`WebSocket connected: ${url}`);
      this.reconnectAttempts.set(url, 0);
      handlers.onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle error messages from server
        if (data.type === 'error') {
          console.error('WebSocket server error:', data.error);
          handlers.onError?.(new Event('error'));
        } else {
          handlers.onMessage?.(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        handlers.onError?.(new Event('parse_error'));
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error: ${url}`, error);
      handlers.onError?.(error);
      handlers.onConnectionError?.();
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed: ${url}`, event.code, event.reason);
      this.connections.delete(url);
      
      // Handle different close codes
      if (event.code === 4001) {
        // Authentication error - don't reconnect, notify handler
        console.error('WebSocket authentication error');
        handlers.onAuthError?.();
        handlers.onClose?.(event.code, 'Authentication failed');
        this.reconnectAttempts.delete(url);
        this.handlers.delete(url);
        return;
      }
      
      if (event.code === 4003) {
        // Authorization error - don't reconnect
        console.error('WebSocket authorization error');
        handlers.onClose?.(event.code, 'Authorization failed');
        this.reconnectAttempts.delete(url);
        this.handlers.delete(url);
        return;
      }

      handlers.onClose?.(event.code, event.reason);

      // Attempt reconnection for other close codes
      this.attemptReconnect(url);
    };

    this.connections.set(url, ws);
    return ws;
  }

  /**
   * Attempt to reconnect to a WebSocket URL with exponential backoff
   * @param url - WebSocket URL to reconnect to
   */
  private attemptReconnect(url: string): void {
    const attempts = this.reconnectAttempts.get(url) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.log(`Max reconnection attempts (${this.maxReconnectAttempts}) reached for ${url}`);
      this.reconnectAttempts.delete(url);
      
      // Notify handler of connection failure
      const handlers = this.handlers.get(url);
      if (handlers) {
        handlers.onConnectionError?.();
      }
      
      this.handlers.delete(url);
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000);

    console.log(`Reconnecting to ${url} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);

    const timeout = setTimeout(() => {
      this.reconnectAttempts.set(url, attempts + 1);
      const handlers = this.handlers.get(url);
      if (handlers) {
        this.connect(url, handlers);
      }
      this.reconnectTimeouts.delete(url);
    }, delay);

    this.reconnectTimeouts.set(url, timeout);
  }

  /**
   * Send data through a WebSocket connection
   * @param url - WebSocket URL to send data through
   * @param data - Data to send (will be JSON stringified)
   * @returns true if sent successfully, false otherwise
   */
  send(url: string, data: any): boolean {
    const ws = this.connections.get(url);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
        return true;
      } catch (error) {
        console.error(`Error sending data to ${url}:`, error);
        return false;
      }
    } else {
      console.warn(`Cannot send data: WebSocket not connected to ${url}`);
      return false;
    }
  }

  /**
   * Disconnect from a WebSocket URL
   * @param url - WebSocket URL to disconnect from
   */
  disconnect(url: string): void {
    // Clear reconnection timeout if exists
    const timeout = this.reconnectTimeouts.get(url);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(url);
    }

    // Close WebSocket connection
    const ws = this.connections.get(url);
    if (ws) {
      // Only close if connection is fully open to avoid "closed before established" errors
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      this.connections.delete(url);
    }

    // Clean up
    this.reconnectAttempts.delete(url);
    this.handlers.delete(url);
  }

  /**
   * Disconnect all WebSocket connections
   */
  disconnectAll(): void {
    const urls = Array.from(this.connections.keys());
    urls.forEach(url => this.disconnect(url));
  }

  /**
   * Check if connected to a specific URL
   * @param url - WebSocket URL to check
   * @returns true if connected, false otherwise
   */
  isConnected(url: string): boolean {
    const ws = this.connections.get(url);
    return ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get the WebSocket instance for a URL
   * @param url - WebSocket URL
   * @returns WebSocket instance or undefined
   */
  getConnection(url: string): WebSocket | undefined {
    return this.connections.get(url);
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
