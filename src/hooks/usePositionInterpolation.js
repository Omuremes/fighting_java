/**
 * Position interpolation helper hook for smooth online position updates
 */

import { useRef, useEffect } from 'react';

/**
 * Hook for smoothly interpolating between positions
 * @param {Object} targetPosition - The target position to move towards
 * @param {Object} currentPosition - Reference to current position object
 * @param {Function} onUpdate - Callback when position is updated
 * @param {Object} options - Configuration options
 * @returns {Object} - Position control functions
 */
export default function usePositionInterpolation(targetPosition, currentPosition, onUpdate, options = {}) {
  const {
    minDistance = 3,
    baseSpeed = 0.15,
    adaptiveScale = true,
    maxSpeed = 0.5,
    fps = 60
  } = options;
  
  const frameIdRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());
  const prevTargetRef = useRef(null);
  const velocityRef = useRef({ x: 0, y: 0 });
  
  // Start the interpolation
  const start = () => {
    if (frameIdRef.current) return;
    
    const updateLoop = () => {
      const now = Date.now();
      const dt = Math.min(1000/30, now - lastUpdateRef.current) / (1000/60); // time delta with fps adjustment
      
      if (targetPosition && currentPosition.current) {
        // Calculate distance to target position
        const dx = targetPosition.x - currentPosition.current.x;
        const dy = targetPosition.y - currentPosition.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If we're close enough, just snap to the position
        if (distance < minDistance) {
          currentPosition.current.x = targetPosition.x;
          currentPosition.current.y = targetPosition.y;
          velocityRef.current = { x: 0, y: 0 };
        } else {
          // Adaptive lerp factor - move faster when further away
          const lerpFactor = adaptiveScale 
            ? Math.min(maxSpeed, baseSpeed + (distance / 200))
            : baseSpeed;
          
          // Calculate smooth velocity change (acceleration)
          const targetVelocityX = dx * lerpFactor;
          const targetVelocityY = dy * lerpFactor;
          
          // Apply velocity with smoothing
          velocityRef.current.x = velocityRef.current.x * 0.8 + targetVelocityX * 0.2;
          velocityRef.current.y = velocityRef.current.y * 0.8 + targetVelocityY * 0.2;
          
          // Apply to position
          currentPosition.current.x += velocityRef.current.x * dt;
          currentPosition.current.y += velocityRef.current.y * dt;
        }
        
        // Call update callback
        onUpdate?.(currentPosition.current, distance);
      }
      
      lastUpdateRef.current = now;
      frameIdRef.current = requestAnimationFrame(updateLoop);
    };
    
    frameIdRef.current = requestAnimationFrame(updateLoop);
  };
  
  // Stop the interpolation
  const stop = () => {
    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }
  };
  
  // Clean up on unmount
  useEffect(() => {
    start();
    return stop;
  }, []);
  
  // When target position changes
  useEffect(() => {
    // Check if this is an important change
    if (!prevTargetRef.current || 
        !targetPosition ||
        Math.abs(targetPosition.x - prevTargetRef.current.x) > 10 || 
        Math.abs(targetPosition.y - prevTargetRef.current.y) > 10) {
      
      // Store for next comparison
      prevTargetRef.current = { ...targetPosition };
    }
  }, [targetPosition]);
  
  return {
    start,
    stop,
    isRunning: !!frameIdRef.current
  };
}
