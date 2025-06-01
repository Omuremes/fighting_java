import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.roomSubscriptions = new Map();
    this.reconnectTimer = null;
    this.connectionCallbacks = [];
    this.connectionMonitorInterval = null;
    this.lastHeartbeat = Date.now();
    this.connectionAttempts = 0;
    this.maxReconnectDelay = 30000; // Max 30 seconds between reconnect attempts
    this.pendingMessages = []; // Queue for messages that need to be sent when reconnected
    this.sentMessages = new Map(); // Track sent messages for retry
    this.messageRetryInterval = null; // Interval to retry pending messages
    
    // Always use direct backend URL for WebSocket connection to avoid proxy issues
    this.baseUrl = 'http://localhost:8082/ws';
      
    console.log(`[WebSocketService] Initializing with baseUrl: ${this.baseUrl}`);
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.client && this.connected) {
        resolve(this.client);
        return;
      }
      
      if (this.client) {
        // Don't create multiple clients
        this.client.deactivate();
        this.client = null;
      }
      
      console.log('[WebSocketService] Attempting to connect to WebSocket server...');
      
      try {
        // Create a new client with better error handling and reconnection logic
        this.client = new Client({
          webSocketFactory: () => new SockJS(this.baseUrl), // Use SockJS for better compatibility
          connectHeaders: {},
          debug: function(str) {
            if (str.includes('ERROR') || (str.includes('STOMP') && !str.includes('PING'))) {
              console.log('[STOMP DEBUG]', str);
            }
          },
          reconnectDelay: this.calculateReconnectDelay.bind(this),
          heartbeatIncoming: 10000,
          heartbeatOutgoing: 10000
        });
        
        // Better connection handling
        this.client.onConnect = (frame) => {
          console.log('[WebSocketService] Connected to WebSocket server');
          this.connected = true;
          this.connectionAttempts = 0;
          this.lastHeartbeat = Date.now();
          
          // Re-subscribe to room topics if needed
          this.resubscribeToRooms();
          
          // Send any pending messages
          this.sendPendingMessages();
          
          // Start monitoring connection for health
          this.startConnectionMonitor();
          
          // Notify subscribers
          this.connectionCallbacks.forEach(callback => callback(true));
          
          resolve(this.client);
        };
        
        this.client.onStompError = (frame) => {
          console.error('[WebSocketService] STOMP Error:', frame);
          this.connectionCallbacks.forEach(callback => callback(false, frame));
          reject(frame);
        };
        
        this.client.onWebSocketClose = (event) => {
          console.log('[WebSocketService] WebSocket closed:', event);
          this.connected = false;
          
          // Notify subscribers
          this.connectionCallbacks.forEach(callback => callback(false));
        };
        
        this.client.onWebSocketError = (event) => {
          console.error('[WebSocketService] WebSocket error:', event);
          this.connected = false;
          
          // Notify subscribers
          this.connectionCallbacks.forEach(callback => callback(false, event));
        };
        
        // Activate the client to start the connection
        this.client.activate();
        
        // Setup message retry mechanism
        if (!this.messageRetryInterval) {
          this.messageRetryInterval = setInterval(() => this.retryMessages(), 1000);
        }
      } catch (error) {
        console.error('[WebSocketService] Error creating WebSocket client:', error);
        this.connected = false;
        reject(error);
        
        // Schedule reconnect
        this.scheduleReconnect();
      }
    });
  }
  
  // Calculate backoff time for reconnect attempts
  calculateReconnectDelay() {
    // Exponential backoff with jitter
    this.connectionAttempts += 1;
    const baseDelay = Math.min(1000 * Math.pow(1.5, this.connectionAttempts), this.maxReconnectDelay);
    const jitter = Math.floor(Math.random() * 1000); // Add up to 1 second of jitter
    return baseDelay + jitter;
  }
  
  // Subscribe to room actions
  subscribeToRoom(roomId, callback) {
    if (!roomId || !callback) return false;
    
    console.log(`[WebSocketService] Subscribing to room: ${roomId}`);
    
    return this.connect().then(() => {
      // Initialize subscriptions for this room if not already present
      if (!this.roomSubscriptions.has(roomId)) {
        this.roomSubscriptions.set(roomId, { 
          callbacks: new Set(),
          subscriptions: {}
        });
      }
      
      const roomData = this.roomSubscriptions.get(roomId);
      roomData.callbacks.add(callback);
      
      // Subscribe to room action topic if not already subscribed
      if (!roomData.subscriptions.actions) {
        roomData.subscriptions.actions = this.client.subscribe(
          `/topic/room/${roomId}`,
          message => {
            try {
              const data = JSON.parse(message.body);
              // Send to all callbacks
              roomData.callbacks.forEach(cb => cb(data));
            } catch (error) {
              console.error('[WebSocketService] Error processing message:', error);
            }
          }
        );
      }
      
      // Subscribe to reliable action topic (separate channel for critical messages)
      if (!roomData.subscriptions.reliable) {
        roomData.subscriptions.reliable = this.client.subscribe(
          `/topic/room/${roomId}/reliable`,
          message => {
            try {
              const data = JSON.parse(message.body);
              // Mark as received if we were tracking this message
              if (data.actionId && this.sentMessages.has(data.actionId)) {
                this.sentMessages.delete(data.actionId);
              }
              
              // Send to all callbacks (with special flag for reliable messages)
              data.reliable = true;
              roomData.callbacks.forEach(cb => cb(data));
            } catch (error) {
              console.error('[WebSocketService] Error processing reliable message:', error);
            }
          }
        );
      }
      
      // Subscribe to room state topic if not already subscribed
      if (!roomData.subscriptions.state) {
        roomData.subscriptions.state = this.client.subscribe(
          `/topic/room/${roomId}/state`,
          message => {
            try {
              const data = JSON.parse(message.body);
              // Distribute as special state message
              const stateMessage = {
                type: 'room_state',
                data: data
              };
              roomData.callbacks.forEach(cb => cb(stateMessage));
            } catch (error) {
              console.error('[WebSocketService] Error processing state message:', error);
            }
          }
        );
      }
      
      return true;
    }).catch(error => {
      console.error(`[WebSocketService] Failed to subscribe to room ${roomId}:`, error);
      return false;
    });
  }
  
  // Send an action to the room
  sendAction(roomId, action) {
    if (!roomId || !action) return false;
    
    // Add timestamp if not present
    if (!action.timestamp) {
      action.timestamp = Date.now();
    }
    
    // Generate actionId for tracking if it's a critical action
    if (action.isCritical) {
      action.actionId = action.actionId || `${action.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Track message for potential retry
      this.sentMessages.set(action.actionId, {
        roomId,
        action,
        timestamp: Date.now(),
        attempts: 0
      });
    }
    
    return this.connect().then(() => {
      try {
        // If we're connected, send right away
        if (this.connected) {
          this.client.publish({
            destination: `/app/room/${roomId}/action`,
            body: JSON.stringify(action)
          });
          return true;
        } else {
          // Queue for later sending
          this.pendingMessages.push({
            roomId,
            action,
            timestamp: Date.now()
          });
          return false;
        }
      } catch (error) {
        console.error(`[WebSocketService] Failed to send action to room ${roomId}:`, error);
        
        // Queue for retry if critical
        if (action.isCritical) {
          this.pendingMessages.push({
            roomId,
            action,
            timestamp: Date.now()
          });
        }
        
        return false;
      }
    }).catch(error => {
      console.error(`[WebSocketService] Connection error when sending to room ${roomId}:`, error);
      
      // Queue for retry if critical
      if (action.isCritical) {
        this.pendingMessages.push({
          roomId,
          action,
          timestamp: Date.now()
        });
      }
      
      return false;
    });
  }
  
  // Send all pending messages when reconnected
  sendPendingMessages() {
    if (!this.connected || !this.client || this.pendingMessages.length === 0) return;
    
    console.log(`[WebSocketService] Sending ${this.pendingMessages.length} pending messages`);
    
    // Clone and clear the queue to avoid infinite loops if errors occur
    const messagesToSend = [...this.pendingMessages];
    this.pendingMessages = [];
    
    messagesToSend.forEach(({ roomId, action }) => {
      try {
        this.client.publish({
          destination: `/app/room/${roomId}/action`,
          body: JSON.stringify(action)
        });
      } catch (error) {
        console.error(`[WebSocketService] Failed to send pending message:`, error);
        
        // Re-queue only critical messages
        if (action.isCritical) {
          this.pendingMessages.push({
            roomId,
            action,
            timestamp: Date.now()
          });
        }
      }
    });
  }
  
  // Retry sending critical messages that haven't been acknowledged
  retryMessages() {
    if (!this.connected || this.sentMessages.size === 0) return;
    
    const now = Date.now();
    const maxRetryAge = 10000; // 10 seconds max age for retries
    const maxRetryAttempts = 5;
    
    // Check for messages that need to be retried
    this.sentMessages.forEach((message, actionId) => {
      const messageAge = now - message.timestamp;
      
      // Only retry if message is old enough but not too old
      if (messageAge > 1000 && messageAge < maxRetryAge && message.attempts < maxRetryAttempts) {
        message.attempts += 1;
        
        console.log(`[WebSocketService] Retrying message ${actionId}, attempt ${message.attempts}`);
        
        try {
          this.client.publish({
            destination: `/app/room/${message.roomId}/action`,
            body: JSON.stringify(message.action)
          });
          
          // Update timestamp for next retry calculation
          message.timestamp = now;
        } catch (error) {
          console.error(`[WebSocketService] Failed to retry message ${actionId}:`, error);
        }
      } else if (messageAge >= maxRetryAge || message.attempts >= maxRetryAttempts) {
        // Message is too old or has too many attempts, give up
        this.sentMessages.delete(actionId);
      }
    });
  }
  
  // Join a room via WebSocket
  joinRoom(roomId, playerId) {
    return this.connect().then(() => {
      if (this.connected) {
        this.client.publish({
          destination: `/app/room/${roomId}/join`,
          body: playerId
        });
        return true;
      }
      return false;
    }).catch(error => {
      console.error(`[WebSocketService] Error joining room ${roomId}:`, error);
      return false;
    });
  }
  
  // Send ping to keep connection alive
  sendPing(roomId) {
    if (!this.connected) return Promise.resolve(false);
    
    try {
      if (roomId) {
        // Room-specific ping
        this.client.publish({
          destination: `/app/room/${roomId}/ping`,
          body: ''
        });
      } else {
        // Global ping
        this.client.publish({
          destination: '/app/ping',
          body: ''
        });
      }
      
      this.lastHeartbeat = Date.now();
      return Promise.resolve(true);
    } catch (error) {
      console.error('[WebSocketService] Error sending ping:', error);
      return Promise.resolve(false);
    }
  }
  
  // Monitor connection health
  startConnectionMonitor() {
    // Clear any existing monitor
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
    }
    
    // Start a new monitor
    this.connectionMonitorInterval = setInterval(() => {
      const now = Date.now();
      const heartbeatAge = now - this.lastHeartbeat;
      
      // Send ping every 20 seconds to keep connection alive
      if (this.connected && heartbeatAge > 20000) {
        this.sendPing();
      }
      
      // If no heartbeat for too long, reconnect
      if (this.connected && heartbeatAge > 60000) {
        console.warn('[WebSocketService] No heartbeat for 60 seconds, reconnecting...');
        this.reconnect();
      }
    }, 10000); // Check every 10 seconds
  }
  
  // Resubscribe to all rooms after reconnect
  resubscribeToRooms() {
    if (!this.connected) return;
    
    this.roomSubscriptions.forEach((roomData, roomId) => {
      // Clear old subscriptions
      Object.values(roomData.subscriptions).forEach(sub => {
        if (sub && sub.unsubscribe) {
          try {
            sub.unsubscribe();
          } catch (error) {
            // Ignore errors unsubscribing, as connection might be dead
          }
        }
      });
      
      // Reset subscriptions object
      roomData.subscriptions = {};
      
      // Resubscribe to room topics
      if (roomData.callbacks.size > 0) {
        // Create a temporary callback that combines all the callbacks
        const combinedCallback = (data) => {
          roomData.callbacks.forEach(cb => cb(data));
        };
        
        // Subscribe again
        this.subscribeToRoom(roomId, combinedCallback);
      }
    });
  }
  
  // Add connection state listener
  addConnectionListener(callback) {
    if (typeof callback === 'function') {
      this.connectionCallbacks.push(callback);
      
      // Immediately call with current state
      if (this.connected) {
        callback(true);
      } else {
        callback(false);
      }
    }
  }
  
  // Remove connection state listener
  removeConnectionListener(callback) {
    const index = this.connectionCallbacks.indexOf(callback);
    if (index !== -1) {
      this.connectionCallbacks.splice(index, 1);
    }
  }
  
  // Force reconnection
  reconnect() {
    this.connected = false;
    
    if (this.client) {
      try {
        this.client.deactivate();
      } catch (error) {
        console.error('[WebSocketService] Error deactivating client:', error);
      }
      this.client = null;
    }
    
    // Schedule reconnect
    this.scheduleReconnect();
  }
  
  // Schedule reconnection with backoff
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    const delay = this.calculateReconnectDelay();
    console.log(`[WebSocketService] Scheduling reconnect in ${delay}ms (attempt ${this.connectionAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocketService] Reconnect failed:', error);
      });
    }, delay);
  }
  
  // Disconnect completely
  disconnect() {
    // Stop monitoring and reconnect attempts
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.messageRetryInterval) {
      clearInterval(this.messageRetryInterval);
      this.messageRetryInterval = null;
    }
    
    // Clear all room subscriptions
    this.roomSubscriptions.forEach((roomData) => {
      Object.values(roomData.subscriptions).forEach(sub => {
        if (sub && sub.unsubscribe) {
          try {
            sub.unsubscribe();
          } catch (error) {
            // Ignore errors unsubscribing
          }
        }
      });
    });
    
    this.roomSubscriptions.clear();
    
    // Disconnect the client
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    
    this.connected = false;
    this.connectionCallbacks.forEach(callback => callback(false));
  }
}

// Singleton instance
const webSocketService = new WebSocketService();
export default webSocketService; 