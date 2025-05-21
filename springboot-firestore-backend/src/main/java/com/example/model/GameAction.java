package com.example.model;

public class GameAction {
    private String gameId;
    private String playerId;
    private String actionType; // move, attack, jump
    private String direction;  // left, right (for move)
    private String attackType; // attack1, attack2 (for attack)
    
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
}
