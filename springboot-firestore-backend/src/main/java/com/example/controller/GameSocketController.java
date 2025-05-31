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
import org.springframework.stereotype.Controller;

@Controller
public class GameSocketController {
    private static final Logger logger = LoggerFactory.getLogger(GameSocketController.class);
    
    @Autowired
    private GameSocketService gameSocketService;
    
    @Autowired
    private RoomService roomService;
    
    @Autowired
    private GameService gameService;
    
    /**
     * Process a game action sent via WebSocket
     */
    @MessageMapping("/room/{roomId}/action")
    @SendTo("/topic/room/{roomId}")
    public GameAction processGameAction(@DestinationVariable String roomId, GameAction action) {
        logger.info("Received WebSocket action for room {}: {}", roomId, action.getType());
        
        // Process the action
        boolean success = gameSocketService.processGameAction(roomId, action);
        if (!success) {
            logger.warn("Failed to process action: {}", action.getType());
            // Return the action with an error flag
            action.setServerTimestamp(-1); // Use negative value to indicate error
            return action;
        }
        
        // For game-changing actions, update the game state
        if ("attack".equals(action.getType()) && action.getData() != null) {
            try {
                Room room = roomService.getRoom(roomId);
                if (room != null && room.getStatus().equals("playing") && room.getGameId() != null) {
                    // Process through game service for state management
                    gameService.processAction(action);
                }
            } catch (Exception e) {
                logger.error("Error updating game state", e);
            }
        }
        
        return action;
    }
    
    /**
     * Join a room's WebSocket channel
     */
    @MessageMapping("/room/{roomId}/join")
    @SendTo("/topic/room/{roomId}/players")
    public String joinRoom(@DestinationVariable String roomId, String userId) {
        logger.info("Player {} joined room {} WebSocket channel", userId, roomId);
        return userId;
    }
} 