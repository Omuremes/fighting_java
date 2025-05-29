/**
 * Client-side prediction for player movement in networked games
 * This reduces perceived lag by applying local movement immediately
 * while still syncing with the server.
 */

import { useRef, useEffect } from 'react';

/**
 * Hook for implementing client-side prediction in networked games
 * @param {Object} options Configuration options
 * @returns {Object} Prediction control functions
 */
export default function useMovementPrediction(options = {}) {
  const {
    updateInterval = 100, // How often to send updates (ms)
    snapThreshold = 20,   // Distance at which to snap rather than interpolate
    maxPredictionTime = 1000 // Max time to predict ahead (ms)
  } = options;
  
  const positionHistoryRef = useRef([]);
  const predictedPositionRef = useRef(null);
  const lastSyncTimeRef = useRef(Date.now());
  const lastUpdateRef = useRef(Date.now());
  
  // Add a position to the history
  const recordPosition = (position, timestamp = Date.now()) => {
    // Keep history limited to avoid memory issues
    if (positionHistoryRef.current.length > 20) {
      positionHistoryRef.current = positionHistoryRef.current.slice(-20);
    }
    
    positionHistoryRef.current.push({
      position: { ...position },
      timestamp
    });
  };
  
  // Predict future position based on past movement
  const predictPosition = (lookAheadTime = 100) => {
    const history = positionHistoryRef.current;
    
    // Need at least 2 points to predict
    if (history.length < 2) {
      return history.length ? { ...history[0].position } : null;
    }
    
    // Get the two most recent positions
    const recent = history[history.length - 1];
    const previous = history[history.length - 2];
    
    // Calculate velocity (distance/time)
    const dt = recent.timestamp - previous.timestamp;
    
    // Avoid division by zero
    if (dt === 0) return { ...recent.position };
    
    const vx = (recent.position.x - previous.position.x) / dt;
    const vy = (recent.position.y - previous.position.y) / dt;
    
    // Predict position after lookAheadTime
    return {
      x: recent.position.x + vx * lookAheadTime,
      y: recent.position.y + vy * lookAheadTime
    };
  };
  
  // Get current predicted position
  const getCurrentPrediction = () => {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimeRef.current;
    
    // Only predict up to maxPredictionTime ahead
    if (timeSinceLastSync > maxPredictionTime) {
      return null;
    }
    
    return predictPosition(timeSinceLastSync);
  };
  
  // Check if we need to send an update
  const shouldUpdate = () => {
    const now = Date.now();
    return (now - lastUpdateRef.current) >= updateInterval;
  };
  
  // Apply received server position
  const applyServerPosition = (serverPosition, serverTime = Date.now()) => {
    // Update sync time
    lastSyncTimeRef.current = serverTime;
    
    // Get current prediction
    const currentPrediction = predictedPositionRef.current;
    
    // If no prediction or large discrepancy, just use server position
    if (!currentPrediction || 
        Math.abs(serverPosition.x - currentPrediction.x) > snapThreshold ||
        Math.abs(serverPosition.y - currentPrediction.y) > snapThreshold) {
      recordPosition(serverPosition, serverTime);
      predictedPositionRef.current = { ...serverPosition };
      return { ...serverPosition };
    }
    
    // Add server position to history
    recordPosition(serverPosition, serverTime);
    
    // Update prediction
    predictedPositionRef.current = getCurrentPrediction() || { ...serverPosition };
    
    return { ...predictedPositionRef.current };
  };
  
  return {
    recordPosition,
    predictPosition,
    getCurrentPrediction,
    shouldUpdate,
    applyServerPosition,
    markUpdated: () => { lastUpdateRef.current = Date.now(); }
  };
}
