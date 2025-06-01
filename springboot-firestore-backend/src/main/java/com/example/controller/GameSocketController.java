package com.example.controller;

import com.example.model.GameAction;
import com.example.model.Room;
import com.example.service.GameService;
import com.example.service.GameSocketService;
import com.example.service.RoomService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.Map;

@Controller
public class GameSocketController {
    private static final Logger logger = LoggerFactory.getLogger(GameSocketController.class);
    
    @Autowired
    private GameSocketService gameSocketService;
    
    @Autowired
    private RoomService roomService;
    
    @Autowired
    private GameService gameService;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Process a game action sent via WebSocket
     */
    @MessageMapping("/room/{roomId}/action")
    public void processGameAction(@DestinationVariable String roomId, GameAction action) {
        try {
            long startTime = System.currentTimeMillis();
            logger.info("Processing action for room {}: type={}, playerType={}", 
                        roomId, action.getType(), action.getPlayerType());
            
            // Set server timestamp for ordering
            action.setServerTimestamp(System.currentTimeMillis());
            
            // Process the action
            boolean success = gameSocketService.processGameAction(roomId, action);
            
            if (!success) {
                throw new RuntimeException("Failed to process action");
            }
            
            long processingTime = System.currentTimeMillis() - startTime;
            logger.info("Action processed in {}ms for room {}", processingTime, roomId);
        } catch (Exception e) {
            logger.error("Error processing action for room " + roomId, e);
            // Send error response
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("type", "error");
            errorResponse.put("error", "PROCESSING_ERROR");
            errorResponse.put("message", "Failed to process action: " + e.getMessage());
            messagingTemplate.convertAndSend("/topic/room/" + roomId, errorResponse);
        }
    }
    
    /**
     * Handle room join messages
     */
    @MessageMapping("/room/{roomId}/join")
    public void handleRoomJoin(@DestinationVariable String roomId, String playerId) {
        try {
            logger.info("Player {} joining room {} via WebSocket", playerId, roomId);
            
            // Get the room
            Room room = roomService.getRoom(roomId);
            
            if (room != null) {
                // Create join notification
                Map<String, Object> joinNotification = new HashMap<>();
                joinNotification.put("type", "player_joined");
                joinNotification.put("playerId", playerId);
                joinNotification.put("roomId", roomId);
                joinNotification.put("timestamp", System.currentTimeMillis());
                
                // Send to all clients in this room
                messagingTemplate.convertAndSend("/topic/room/" + roomId, joinNotification);
                
                // Also send current room state
                gameSocketService.broadcastRoomUpdate(room);
            } else {
                logger.warn("Player {} tried to join non-existent room {}", playerId, roomId);
            }
        } catch (Exception e) {
            logger.error("Error handling room join for room " + roomId, e);
        }
    }
    
    /**
     * Handle ping messages to check connection status
     */
    @MessageMapping("/ping")
    @SendTo("/topic/pong")
    public Map<String, Object> handlePing() {
        Map<String, Object> response = new HashMap<>();
        response.put("type", "pong");
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }
    
    /**
     * Handle room-specific ping messages
     */
    @MessageMapping("/room/{roomId}/ping")
    public void handleRoomPing(@DestinationVariable String roomId, String playerId) {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("type", "pong");
            response.put("timestamp", System.currentTimeMillis());
            response.put("playerId", playerId);
            
            // Send pong response to all clients in this room
            messagingTemplate.convertAndSend("/topic/room/" + roomId, response);
        } catch (Exception e) {
            logger.error("Error handling room ping for room " + roomId, e);
        }
    }
} 