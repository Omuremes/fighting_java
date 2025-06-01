package com.example.service;

import com.example.model.GameAction;
import com.example.model.Room;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class GameSocketService {

    private static final Logger logger = LoggerFactory.getLogger(GameSocketService.class);
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private GameService gameService;
    
    @Autowired
    private RoomService roomService;
    
    // Map of room IDs to last movement timestamp (for rate limiting)
    private final Map<String, Map<String, Long>> lastActionTimes = new ConcurrentHashMap<>();
    
    // Rate limiting constants
    private static final long MOVEMENT_RATE_LIMIT_MS = 33; // ~30 updates per second
    private static final long ATTACK_RATE_LIMIT_MS = 500; // 2 attacks per second
    
    // Action sequence tracking
    private final Map<String, AtomicLong> roomSequenceNumbers = new ConcurrentHashMap<>();
    
    /**
     * Process a game action and broadcast it to other players in the room
     * @param roomId The room ID
     * @param action The game action
     * @return true if successful, false otherwise
     */
    public boolean processGameAction(String roomId, GameAction action) {
        try {
            // Apply rate limiting unless action is marked as critical
            if (!action.isCritical()) {
                if (!checkRateLimit(roomId, action)) {
                    logger.debug("Rate limited action {} for room {} player {}", 
                               action.getType(), roomId, action.getPlayerType());
                    return true; // We just ignore rate-limited actions, not treat them as errors
                }
            }
            
            // Track action for room
            trackAction(roomId, action);
            
            // Validate and preprocess the action
            if (!validateAction(roomId, action)) {
                logger.warn("Invalid action received: {}", action.getType());
                return false;
            }
            
            // For certain actions that affect game state, process through game service
            if ("attack".equals(action.getType()) || "health".equals(action.getType())) {
                boolean requiresSync = processGameStateAction(roomId, action);
                if (requiresSync) {
                    // If game state changed significantly, broadcast an update
                    Room room = roomService.getRoom(roomId);
                    if (room != null) {
                        broadcastRoomUpdate(room);
                    }
                }
            }
            
            // Broadcast the action to all clients in the room
            messagingTemplate.convertAndSend("/topic/room/" + roomId, action);
            
            return true;
        } catch (Exception e) {
            logger.error("Error processing game action", e);
            return false;
        }
    }
    
    /**
     * Broadcast room state update to all clients in the room
     * @param room The room to broadcast
     */
    public void broadcastRoomUpdate(Room room) {
        try {
            Map<String, Object> stateUpdate = new HashMap<>();
            stateUpdate.put("roomId", room.getRoomId());
            stateUpdate.put("status", room.getStatus());
            stateUpdate.put("timestamp", System.currentTimeMillis());
            
            // Include player info
            Map<String, Object> hostInfo = new HashMap<>();
            hostInfo.put("id", room.getHostId());
            hostInfo.put("name", room.getHostName());
            
            Map<String, Object> guestInfo = new HashMap<>();
            if (room.getGuestId() != null) {
                guestInfo.put("id", room.getGuestId());
                guestInfo.put("name", room.getGuestName());
            }
            
            stateUpdate.put("host", hostInfo);
            stateUpdate.put("guest", guestInfo);
            
            // Send state update
            messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/state", stateUpdate);
        } catch (Exception e) {
            logger.error("Error broadcasting room update", e);
        }
    }
    
    /**
     * Check if an action passes rate limiting
     * @param roomId The room ID
     * @param action The game action
     * @return true if action is allowed, false if rate limited
     */
    private boolean checkRateLimit(String roomId, GameAction action) {
        String actionKey = action.getPlayerType() + "_" + action.getType();
        Map<String, Long> roomActionTimes = lastActionTimes.computeIfAbsent(
            roomId, k -> new ConcurrentHashMap<>()
        );
        
        long now = System.currentTimeMillis();
        long lastTime = roomActionTimes.getOrDefault(actionKey, 0L);
        
        long minInterval;
        if ("move".equals(action.getType())) {
            minInterval = MOVEMENT_RATE_LIMIT_MS;
        } else if ("attack".equals(action.getType())) {
            minInterval = ATTACK_RATE_LIMIT_MS;
        } else {
            minInterval = 0; // No rate limiting for other action types
        }
        
        if (now - lastTime < minInterval) {
            return false; // Rate limited
        }
        
        // Update last action time
        roomActionTimes.put(actionKey, now);
        return true;
    }
    
    /**
     * Track action sequence for a room
     * @param roomId The room ID
     * @param action The game action
     */
    private void trackAction(String roomId, GameAction action) {
        // Set the room's sequence number
        AtomicLong sequence = roomSequenceNumbers.computeIfAbsent(
            roomId, k -> new AtomicLong(0)
        );
        action.setSequence((int)sequence.incrementAndGet());
        
        // If the client didn't set a timestamp, set it now
        if (action.getTimestamp() <= 0) {
            action.setTimestamp(System.currentTimeMillis());
        }
    }
    
    /**
     * Validate an action is allowed
     * @param roomId The room ID
     * @param action The game action
     * @return true if valid, false otherwise
     */
    private boolean validateAction(String roomId, GameAction action) {
        // Basic validation
        if (action.getPlayerType() == null || action.getType() == null) {
            return false;
        }
        
        // Position validation for movement actions
        if ("move".equals(action.getType()) && action.hasPositionData()) {
            Map<String, Object> position = action.getPosition();
            if (position != null) {
                // Check position is within valid game bounds
                Object xObj = position.get("x");
                Object yObj = position.get("y");
                
                if (xObj instanceof Number && yObj instanceof Number) {
                    double x = ((Number) xObj).doubleValue();
                    double y = ((Number) yObj).doubleValue();
                    
                    // Simple bounds check - adjust according to your game's needs
                    if (x < 0 || x > 1280 || y < 0 || y > 720) {
                        logger.warn("Position out of bounds: {},{}", x, y);
                        return false;
                    }
                }
            }
        }
        
        return true;
    }
    
    /**
     * Process actions that affect game state
     * @param roomId The room ID
     * @param action The game action
     * @return true if game state was significantly changed, false otherwise
     */
    private boolean processGameStateAction(String roomId, GameAction action) {
        try {
            Room room = roomService.getRoom(roomId);
            if (room == null || room.getGameId() == null) {
                return false;
            }
            
            // Special handling for attack actions
            if ("attack".equals(action.getType()) && action.getData() != null) {
                action.setGameId(room.getGameId());
                
                // Extract hit information if present
                boolean didHit = false;
                int damage = 0;
                
                if (action.getData().containsKey("hit")) {
                    didHit = Boolean.TRUE.equals(action.getData().get("hit"));
                }
                
                if (action.getData().containsKey("damage")) {
                    Object damageObj = action.getData().get("damage");
                    if (damageObj instanceof Number) {
                        damage = ((Number) damageObj).intValue();
                    }
                }
                
                logger.debug("Attack action: hit={}, damage={}, player={}", 
                           didHit, damage, action.getPlayerType());
                
                // If this is a hit, calculate health reduction
                if (didHit) {
                    // Create a health update action to broadcast
                    Map<String, Object> healthData = new HashMap<>();
                    
                    // Determine whose health is reduced based on player type
                    String attackerType = action.getPlayerType();
                    boolean isHostAttacker = "host".equals(attackerType);
                    
                    // Get the current health states from game service or create defaults
                    int hostHealth = 100;
                    int guestHealth = 100;
                    
                    try {
                        // Try to get current game state for health values
                        com.example.model.Game game = gameService.getGame(room.getGameId());
                        if (game != null) {
                            hostHealth = game.getPlayer1().getHealth();
                            guestHealth = game.getPlayer2().getHealth();
                            logger.debug("Current health - host: {}, guest: {}", hostHealth, guestHealth);
                        }
                    } catch (Exception e) {
                        logger.warn("Could not retrieve current health values", e);
                    }
                    
                    // Apply damage to appropriate player
                    if (isHostAttacker) {
                        guestHealth = Math.max(0, guestHealth - damage);
                        logger.debug("Host hit guest - new health: {}", guestHealth);
                    } else {
                        hostHealth = Math.max(0, hostHealth - damage);
                        logger.debug("Guest hit host - new health: {}", hostHealth);
                    }
                    
                    // Create health data update
                    Map<String, Object> healthUpdate = new HashMap<>();
                    healthUpdate.put("hostHealth", hostHealth);
                    healthUpdate.put("guestHealth", guestHealth);
                    healthData.put("health", healthUpdate);
                    
                    // Create health action to broadcast
                    GameAction healthAction = new GameAction();
                    healthAction.setGameId(room.getGameId());
                    healthAction.setPlayerType(attackerType); // Same player that caused the damage
                    healthAction.setType("health"); 
                    healthAction.setData(healthData);
                    healthAction.setTimestamp(System.currentTimeMillis());
                    healthAction.setServerTimestamp(System.currentTimeMillis());
                    healthAction.setCritical(true); // Mark as critical to skip rate limiting
                    
                    // Broadcast health update - reliable message
                    messagingTemplate.convertAndSend("/topic/room/" + roomId + "/reliable", healthAction);
                    
                    // Also broadcast to the normal topic for backward compatibility
                    messagingTemplate.convertAndSend("/topic/room/" + roomId, healthAction);
                    
                    // Check for game over condition
                    if (hostHealth <= 0 || guestHealth <= 0) {
                        // Create game over action
                        GameAction gameOverAction = new GameAction();
                        gameOverAction.setGameId(room.getGameId());
                        gameOverAction.setType("gameOver");
                        gameOverAction.setServerTimestamp(System.currentTimeMillis());
                        gameOverAction.setCritical(true);
                        
                        String winner = hostHealth <= 0 ? "guest" : "host";
                        Map<String, Object> gameOverData = new HashMap<>();
                        gameOverData.put("winner", winner);
                        gameOverAction.setData(gameOverData);
                        
                        logger.info("Game over! Winner: {}", winner);
                        
                        // Broadcast game over - reliable message
                        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/reliable", gameOverAction);
                        
                        // Also broadcast to the normal topic
                        messagingTemplate.convertAndSend("/topic/room/" + roomId, gameOverAction);
                        
                        // Update room status
                        try {
                            roomService.updateRoomStatus(roomId, "completed", winner);
                        } catch (Exception e) {
                            logger.error("Failed to update room status after game over", e);
                        }
                        
                        return true;
                    }
                    
                    // Update the game state in the database
                    try {
                        // Update player health in the game
                        com.example.model.Game game = gameService.getGame(room.getGameId());
                        if (game != null) {
                            if (isHostAttacker) {
                                game.getPlayer2().setHealth(guestHealth);
                            } else {
                                game.getPlayer1().setHealth(hostHealth);
                            }
                            gameService.updateGame(game);
                        }
                    } catch (Exception e) {
                        logger.warn("Could not update game health values", e);
                    }
                    
                    return true;
                }
                
                // Process the game action through game service as well
                gameService.processAction(action);
                return didHit; // Only return true if there was a hit
            } else if ("health".equals(action.getType()) && action.hasHealthData()) {
                // Health updates should be validated and tracked
                Map<String, Object> healthData = (Map<String, Object>) action.getData().get("health");
                if (healthData != null) {
                    logger.info("Health update: {}", healthData);
                    
                    // Re-broadcast the health update to ensure all clients have it
                    messagingTemplate.convertAndSend("/topic/room/" + roomId + "/reliable", action);
                    
                    return true;
                }
            } else if ("move".equals(action.getType()) && action.hasPositionData()) {
                // Process position updates
                Map<String, Object> position = action.getPosition();
                if (position != null) {
                    // For moves, we just need to broadcast the action
                    // but we also want to validate the position is reasonable
                    Object xObj = position.get("x");
                    Object yObj = position.get("y");
                    
                    if (xObj instanceof Number && yObj instanceof Number) {
                        double x = ((Number) xObj).doubleValue();
                        double y = ((Number) yObj).doubleValue();
                        
                        // Debug position at a lower log level
                        if (logger.isDebugEnabled() && Math.random() < 0.01) { // Only log 1% of moves
                            logger.debug("Movement: player={}, pos=({}, {})", 
                                       action.getPlayerType(), x, y);
                        }
                    }
                }
            }
            
            return false;
        } catch (Exception e) {
            logger.error("Error processing game state action", e);
            return false;
        }
    }
} 