import { notificationService } from './notificationService';

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // 3 seconds
  private reconnectTimeoutId: number | null = null;
  private wsUrl: string;
  private isConnecting: boolean = false;
  private userId: string | null = null;
  private authToken: string | null = null;

  constructor() {
    // Get the WebSocket URL from environment or use a default
    this.wsUrl = import.meta.env.VITE_WS_URL || 
      `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/notifications`;
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  // Connect to the WebSocket server
  public connect(userId: string, authToken: string): void {
    if (this.socket?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    // Store credentials for reconnection
    this.userId = userId;
    this.authToken = authToken;
    this.isConnecting = true;

    try {
      // Format token properly - remove "Bearer " prefix if present
      const token = authToken.startsWith('Bearer ') 
        ? authToken.substring(7) 
        : authToken;
      
      // Include authentication in the URL
      const url = `${this.wsUrl}?user_id=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;
      console.log('Connecting to WebSocket:', url);
      
      this.socket = new WebSocket(url);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  // Disconnect from the WebSocket server
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimeoutId !== null) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.userId = null;
    this.authToken = null;
  }

  // Send a message to the WebSocket server
  public send(message: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  // Check connection status
  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  // Handle WebSocket open event
  private handleOpen(event: Event): void {
    console.log('WebSocket connection established');
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    
    // Notify the user that they are connected (only if reconnecting)
    if (this.reconnectAttempts > 0) {
      notificationService.addNotification(
        'Connected',
        'Real-time notifications are now active',
        'info'
      );
    }
  }

  // Handle WebSocket message event
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'notification') {
        // Process notification message
        notificationService.addNotification(
          data.title || 'New Notification',
          data.message,
          data.notification_type || 'info',
          data.data
        );
      } else {
        console.log('Received WebSocket message:', data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  // Handle WebSocket close event
  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.socket = null;
    this.isConnecting = false;
    
    // Only attempt to reconnect if it wasn't a normal closure
    if (event.code !== 1000) {
      this.attemptReconnect();
    }
  }

  // Handle WebSocket error event
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.isConnecting = false;
    
    // Socket will close after an error, which will trigger reconnect
  }

  // Handle browser coming online
  private handleOnline(): void {
    console.log('Browser is online, attempting to reconnect WebSocket');
    if (this.userId && this.authToken && !this.isConnected()) {
      this.reconnectAttempts = 0; // Reset attempts when coming back online
      this.connect(this.userId, this.authToken);
    }
  }

  // Handle browser going offline
  private handleOffline(): void {
    console.log('Browser is offline, WebSocket will reconnect when online');
    // No need to do anything, the socket will close on its own
  }

  // Attempt to reconnect to the WebSocket server
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached');
      
      // Notify the user that reconnection failed
      notificationService.addNotification(
        'Connection Failed',
        'Unable to establish a connection for real-time notifications',
        'error'
      );
      
      return;
    }

    this.reconnectAttempts++;
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    // Notify the user that we're trying to reconnect
    if (this.reconnectAttempts === 1) {
      notificationService.addNotification(
        'Connection Lost',
        'Attempting to reconnect for real-time updates...',
        'warning'
      );
    }

    // Try to reconnect after the interval
    this.reconnectTimeoutId = window.setTimeout(() => {
      // Use stored credentials if available
      if (this.userId && this.authToken) {
        this.connect(this.userId, this.authToken);
      } else {
        // Fall back to localStorage if needed
        const userId = localStorage.getItem('userId') || '';
        const token = localStorage.getItem('token') || '';
        
        if (userId && token) {
          this.connect(userId, token);
        } else {
          console.error('Cannot reconnect: missing user ID or token');
        }
      }
    }, this.reconnectInterval * Math.min(this.reconnectAttempts, 3)); // Exponential backoff, but cap at 3x
  }
}

export const websocketService = new WebSocketService();
export default websocketService; 