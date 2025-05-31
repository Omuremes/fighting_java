package com.example.service;

import com.example.model.GameAction;
import com.example.model.Room;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameSocketService {
    private static final Logger logger = LoggerFactory.getLogger(GameSocketService.class);
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    // Store last action timestamp to prevent spam
    private final Map<String, Long> playerLastActionTime = new ConcurrentHashMap<>();
    
    // Rate limiting constants
    private static final long ATTACK_RATE_LIMIT_MS = 500; // 500ms between attacks
    private static final long MOVEMENT_RATE_LIMIT_MS = 33; // 30 movements per second
    
    /**
     * Process a game action and broadcast to room subscribers
     */
    public boolean processGameAction(String roomId, GameAction action) {
        try {
            String playerId = action.getPlayerId();
            String playerKey = roomId + "-" + playerId + "-" + action.getType();
            long currentTime = System.currentTimeMillis();
            
            // Apply rate limiting based on action type
            if ("attack".equals(action.getType())) {
                if (!checkRateLimit(playerKey, currentTime, ATTACK_RATE_LIMIT_MS)) {
                    logger.warn("Attack rate limited for player {} in room {}", playerId, roomId);
                    return false;
                }
            } else if ("move".equals(action.getType()) && !Boolean.TRUE.equals(action.getData().get("isCritical"))) {
                if (!checkRateLimit(playerKey, currentTime, MOVEMENT_RATE_LIMIT_MS)) {
                    // Silent skip for movement rate limiting
                    return false;
                }
            }
            
            // Add server timestamp for ordering
            action.setServerTimestamp(currentTime);
            
            // Broadcast to room subscribers
            messagingTemplate.convertAndSend("/topic/room/" + roomId, action);
            return true;
        } catch (Exception e) {
            logger.error("Error processing game action", e);
            return false;
        }
    }
    
    /**
     * Send room state update to all subscribers
     */
    public void broadcastRoomUpdate(Room room) {
        messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/state", room);
    }
    
    /**
     * Check if an action passes rate limiting
     */
    private boolean checkRateLimit(String key, long currentTime, long limitMs) {
        Long lastTime = playerLastActionTime.get(key);
        if (lastTime != null && currentTime - lastTime < limitMs) {
            return false;
        }
        playerLastActionTime.put(key, currentTime);
        return true;
    }
} 