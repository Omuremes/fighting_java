package com.example.model;

import java.util.UUID;

public class Game {
    private String id;
    private Player player1;
    private Player player2;
    private int round = 1;
    private String status = "waiting"; // waiting, running, finished
    private String winner = null;
    private long lastUpdated;
    
    public Game() {
        this.id = UUID.randomUUID().toString();
        this.lastUpdated = System.currentTimeMillis();
    }
    
    public Game(Player player1, Player player2) {
        this.id = UUID.randomUUID().toString();
        this.player1 = player1;
        this.player2 = player2;
        this.lastUpdated = System.currentTimeMillis();
    }
    
    // Method to check if game is over
    public boolean isGameOver() {
        return player1.getHealth() <= 0 || player2.getHealth() <= 0;
    }
    
    // Update game state after each round
    public void nextRound() {
        if (player1.getHealth() <= 0) {
            player2.setWins(player2.getWins() + 1);
        } else if (player2.getHealth() <= 0) {
            player1.setWins(player1.getWins() + 1);
        }
        
        // Reset health for next round
        player1.setHealth(100);
        player2.setHealth(100);
        
        // Reset positions and animations
        player1.setCurrentAnimation("idle");
        player2.setCurrentAnimation("idle");
        player1.setAttacking(false);
        player2.setAttacking(false);
        
        // Increment round
        round++;
        
        this.lastUpdated = System.currentTimeMillis();
    }
    
    // Helper method to get player type (player1 or player2) from player ID
    public String getPlayerId(String id) {
        if (player1 != null && id.equals(player1.getId())) {
            return "player1";
        } else if (player2 != null && id.equals(player2.getId())) {
            return "player2";
        }
        return null;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public Player getPlayer1() {
        return player1;
    }
    
    public void setPlayer1(Player player1) {
        this.player1 = player1;
    }
    
    public Player getPlayer2() {
        return player2;
    }
    
    public void setPlayer2(Player player2) {
        this.player2 = player2;
    }
    
    public int getRound() {
        return round;
    }
    
    public void setRound(int round) {
        this.round = round;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
        this.lastUpdated = System.currentTimeMillis();
    }
    
    public String getWinner() {
        return winner;
    }
    
    public void setWinner(String winner) {
        this.winner = winner;
        this.lastUpdated = System.currentTimeMillis();
    }
    
    public long getLastUpdated() {
        return lastUpdated;
    }
    
    public void setLastUpdated(long lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}
