import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class WebSocketService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.roomSubscriptions = new Map();
    this.reconnectTimer = null;
    this.connectionCallbacks = [];
    
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
      
      try {
        // Clean up any existing connection
        this.disconnect();
        
        console.log(`[WebSocketService] Attempting to connect to ${this.baseUrl}`);
        
        // Create SockJS instance with explicit socket transport preference
        const sockjs = new SockJS(this.baseUrl, null, {
          transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
          timeout: 15000  // Increased timeout for more reliable connection
        });
        
        sockjs.onopen = () => {
          console.log('[WebSocketService] SockJS connection opened successfully');
        };
        
        sockjs.onclose = (e) => {
          console.log(`[WebSocketService] SockJS connection closed. Code: ${e.code}, reason: ${e.reason}`);
          
          // If wasn't intentionally disconnected, try to reconnect
          if (e.code !== 1000) {
            this._scheduleReconnect();
          }
        };
        
        sockjs.onerror = (e) => {
          console.error('[WebSocketService] SockJS error:', e);
        };
        
        // Create a new STOMP client
        this.client = new Client({
          webSocketFactory: () => sockjs,
          debug: function(str) {
            console.log('STOMP: ' + str);
          },
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          connectionTimeout: 20000,  // Increased connection timeout
          connectHeaders: {
            'Accept-Version': '1.1,1.0',  // STOMP protocol versions
            'Heart-Beat': '10000,10000'   // Heartbeat interval
          }
        });

        // On connection
        this.client.onConnect = (frame) => {
          console.log('%c[WebSocket] Connected', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;', frame);
          this.connected = true;
          
          // Notify all listeners
          this.connectionCallbacks.forEach(callback => callback(true));
          
          resolve(this.client);
        };

        // On disconnection
        this.client.onDisconnect = () => {
          console.log('%c[WebSocket] Disconnected', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 2px;');
          this.connected = false;
          
          // Notify all listeners
          this.connectionCallbacks.forEach(callback => callback(false));
        };

        // On WebSocket error
        this.client.onStompError = (frame) => {
          console.error('%c[WebSocket] Error', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 2px;', frame);
          this.connected = false;
          reject(new Error(`WebSocket error: ${frame.headers?.message || 'Unknown error'}`));
        };
        
        // Add a transport error handler
        this.client.onWebSocketError = (event) => {
          console.error('%c[WebSocket] Transport Error', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 2px;', event);
          // Schedule reconnect
          this._scheduleReconnect();
        };

        // Activate the connection
        console.log('[WebSocketService] Activating STOMP connection');
        this.client.activate();
      } catch (error) {
        console.error('%c[WebSocket] Connection error', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 2px;', error);
        reject(error);
        // Schedule reconnect on failed connection
        this._scheduleReconnect();
      }
    });
  }
  
  // Private method to schedule reconnection
  _scheduleReconnect() {
    if (!this.reconnectTimer) {
      console.log('[WebSocketService] Scheduling reconnect in 5 seconds');
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        console.log('[WebSocketService] Attempting to reconnect');
        this.connect().catch(error => {
          console.error('[WebSocketService] Reconnect failed:', error);
        });
      }, 5000);
    }
  }

  disconnect() {
    if (this.client) {
      try {
        // Clear all subscriptions
        this.roomSubscriptions.forEach((subscription) => {
          if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
          }
        });
        this.roomSubscriptions.clear();
        
        if (this.connected) {
          console.log('[WebSocketService] Deactivating STOMP connection');
          this.client.deactivate();
        }
      } catch (error) {
        console.warn('Error during WebSocket disconnect:', error);
      }
      
      this.client = null;
      this.connected = false;
    }
    
    // Clear reconnect timer if active
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // Subscribe to a room's action channel
  subscribeToRoom(roomId, callback) {
    return this.connect().then(() => {
      if (!this.roomSubscriptions.has(roomId)) {
        console.log(`%c[WebSocket] Subscribing to room ${roomId}`, 'background: #2196F3; color: white; padding: 2px 5px; border-radius: 2px;');
        
        // Subscribe to the room's action channel
        const actionSubscription = this.client.subscribe(`/topic/room/${roomId}`, (message) => {
          try {
            const action = JSON.parse(message.body);
            console.log(`%c[WebSocket] Received action for room ${roomId}:`, 'background: #9C27B0; color: white; padding: 2px 5px; border-radius: 2px;', action);
            callback(action);
          } catch (error) {
            console.error('Error handling WebSocket message:', error);
          }
        });
        
        // Subscribe to the room's state channel
        const stateSubscription = this.client.subscribe(`/topic/room/${roomId}/state`, (message) => {
          try {
            const state = JSON.parse(message.body);
            console.log(`%c[WebSocket] Received state update for room ${roomId}:`, 'background: #FF9800; color: white; padding: 2px 5px; border-radius: 2px;', state);
            callback({
              type: 'room_state',
              data: state
            });
          } catch (error) {
            console.error('Error handling WebSocket state message:', error);
          }
        });
        
        // Store the subscriptions
        this.roomSubscriptions.set(roomId, {
          action: actionSubscription,
          state: stateSubscription,
          unsubscribe: () => {
            actionSubscription.unsubscribe();
            stateSubscription.unsubscribe();
          }
        });
        
        // Send join message
        this.sendRoomJoin(roomId, callback.playerId);
      }
      
      return {
        unsubscribe: () => this.unsubscribeFromRoom(roomId)
      };
    });
  }

  // Unsubscribe from a room
  unsubscribeFromRoom(roomId) {
    const subscription = this.roomSubscriptions.get(roomId);
    if (subscription) {
      console.log(`%c[WebSocket] Unsubscribing from room ${roomId}`, 'background: #607D8B; color: white; padding: 2px 5px; border-radius: 2px;');
      subscription.unsubscribe();
      this.roomSubscriptions.delete(roomId);
      return true;
    }
    return false;
  }

  // Send a message to join a room
  sendRoomJoin(roomId, playerId) {
    if (!this.connected || !this.client) {
      console.warn('Cannot send room join - WebSocket not connected');
      return false;
    }
    
    try {
      this.client.publish({
        destination: `/app/room/${roomId}/join`,
        body: playerId,
        headers: { 'content-type': 'text/plain' }
      });
      return true;
    } catch (error) {
      console.error('Error sending room join message:', error);
      return false;
    }
  }

  // Send a game action
  sendGameAction(roomId, action) {
    if (!this.connected || !this.client) {
      console.warn('Cannot send action - WebSocket not connected');
      return false;
    }
    
    try {
      // Set timestamp to ensure ordering
      action.timestamp = Date.now();
      
      this.client.publish({
        destination: `/app/room/${roomId}/action`,
        body: JSON.stringify(action),
        headers: { 'content-type': 'application/json' }
      });
      return true;
    } catch (error) {
      console.error('Error sending game action:', error);
      return false;
    }
  }

  // Register a connection status callback
  onConnectionChange(callback) {
    this.connectionCallbacks.push(callback);
    // Call immediately with current state
    if (callback && typeof callback === 'function') {
      callback(this.connected);
    }
    
    // Return unsubscribe function
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();

export default webSocketService; 