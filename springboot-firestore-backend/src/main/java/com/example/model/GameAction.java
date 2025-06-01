package com.example.model;

import java.util.Map;
import java.util.UUID;
import java.util.HashMap;

/**
 * Represents a game action that can be processed through the WebSocket system.
 * This can be movements, attacks, or other game events.
 */
public class GameAction {
    private String actionId;
    private String gameId;
    private String playerId;
    private String playerType; // "host" or "guest"
    private String type; // "move", "attack", "health", etc.
    private Map<String, Object> data;
    private Map<String, Object> position;
    private long timestamp;
    private long serverTimestamp;
    private int sequence; // Client-side sequence number for ordering
    private boolean isCritical; // Whether this action is critical and should be processed immediately
    
    public GameAction() {
        this.actionId = UUID.randomUUID().toString();
        this.data = new HashMap<>();
        this.timestamp = System.currentTimeMillis();
        this.isCritical = false;
    }
    
    /**
     * @return True if this action has valid position data
     */
    public boolean hasPositionData() {
        return position != null && !position.isEmpty();
    }
    
    /**
     * @return The position data as a map with x and y coordinates
     */
    public Map<String, Object> getPosition() {
        return position;
    }
    
    /**
     * @return True if this action has valid velocity data
     */
    public boolean hasVelocityData() {
        if (data == null) return false;
        
        if (data.containsKey("velocity")) {
            Object velObj = data.get("velocity");
            if (velObj instanceof Map) {
                Map<?, ?> velMap = (Map<?, ?>) velObj;
                return velMap.containsKey("x") && velMap.containsKey("y");
            }
        }
        return false;
    }
    
    /**
     * @return The velocity data as a map with x and y components
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> getVelocity() {
        if (hasVelocityData()) {
            return (Map<String, Object>) data.get("velocity");
        }
        return null;
    }
    
    /**
     * @return True if this action has attack data
     */
    public boolean hasAttackData() {
        if (data == null) return false;
        return "attack".equals(type) && data.containsKey("attackType");
    }
    
    /**
     * @return True if this action has health data
     */
    public boolean hasHealthData() {
        return data != null && data.containsKey("health");
    }

    public String getActionId() {
        return actionId;
    }

    public void setActionId(String actionId) {
        this.actionId = actionId;
    }

    public String getGameId() {
        return gameId;
    }

    public void setGameId(String gameId) {
        this.gameId = gameId;
    }

    public String getPlayerId() {
        return playerId;
    }

    public void setPlayerId(String playerId) {
        this.playerId = playerId;
    }

    public String getPlayerType() {
        return playerType;
    }

    public void setPlayerType(String playerType) {
        this.playerType = playerType;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Map<String, Object> getData() {
        return data;
    }

    public void setData(Map<String, Object> data) {
        this.data = data;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public long getServerTimestamp() {
        return serverTimestamp;
    }

    public void setServerTimestamp(long serverTimestamp) {
        this.serverTimestamp = serverTimestamp;
    }

    public int getSequence() {
        return sequence;
    }

    public void setSequence(int sequence) {
        this.sequence = sequence;
    }

    public boolean isCritical() {
        return isCritical;
    }

    public void setCritical(boolean critical) {
        isCritical = critical;
    }

    public void setPosition(Map<String, Object> position) {
        this.position = position;
    }
}
