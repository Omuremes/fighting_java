package com.example.model;

import java.util.Map;

public class GameAction {
    private String gameId;
    private String playerId;
    private String playerType; // host or guest
    private String actionType; // move, attack, jump, hit, special, health
    private String direction;  // left, right (for move)
    private String attackType; // attack1, attack2 (for attack)
    private Map<String, Object> data; // For complex data like position, damage, etc.
    private long timestamp;     // Client timestamp
    private long serverTimestamp; // Server timestamp for ordering
    private int sequence;       // Sequence number for ordering
    
    public GameAction() {
    }
    
    // Getters and Setters
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
        return actionType;
    }
    
    public String getActionType() {
        return actionType;
    }
    
    public void setActionType(String actionType) {
        this.actionType = actionType;
    }
    
    public String getDirection() {
        return direction;
    }
    
    public void setDirection(String direction) {
        this.direction = direction;
    }
    
    public String getAttackType() {
        return attackType;
    }
    
    public void setAttackType(String attackType) {
        this.attackType = attackType;
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
}
