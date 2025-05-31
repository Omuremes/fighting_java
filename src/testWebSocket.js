const SockJS = require('sockjs-client');
const { Client } = require('@stomp/stompjs');

console.log('WebSocket Test Script');
console.log('=====================');

// Connect directly to backend
const socketUrl = 'http://localhost:8082/ws';
console.log(`Connecting to: ${socketUrl}`);

try {
  // Create SockJS instance
  console.log('Creating SockJS instance...');
  const socket = new SockJS(socketUrl);
  
  socket.onopen = function() {
    console.log('SockJS connection opened');
  };
  
  socket.onmessage = function(e) {
    console.log('SockJS message received:', e.data);
  };
  
  socket.onclose = function(e) {
    console.log('SockJS connection closed', e);
  };
  
  socket.onerror = function(e) {
    console.error('SockJS error:', e);
  };
  
  // Create STOMP client over SockJS
  console.log('Creating STOMP client...');
  const stompClient = new Client({
    webSocketFactory: () => socket,
    debug: str => console.log('STOMP:', str),
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000
  });
  
  // Connect handlers for STOMP
  stompClient.onConnect = function(frame) {
    console.log('STOMP connection established');
    console.log('Connected headers:', frame.headers);
    
    // Subscribe to test topic
    console.log('Subscribing to test topic...');
    stompClient.subscribe('/topic/test', function(message) {
      console.log('Received message on /topic/test:', message.body);
    });
    
    // Send test message
    console.log('Sending test message...');
    stompClient.publish({
      destination: '/app/test',
      body: JSON.stringify({ message: 'Hello from test client!' }),
      headers: { 'content-type': 'application/json' }
    });
  };
  
  stompClient.onStompError = function(frame) {
    console.error('STOMP protocol error:', frame.headers.message);
    console.error('Additional details:', frame.body);
  };
  
  stompClient.onWebSocketError = function(event) {
    console.error('WebSocket error:', event);
  };
  
  // Activate connection
  console.log('Activating STOMP connection...');
  stompClient.activate();
  
  // Keep script running for a bit
  console.log('WebSocket test initiated, waiting for connection events...');
  
} catch (error) {
  console.error('Error in WebSocket test:', error);
} 