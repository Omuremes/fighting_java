package com.example.model;

public class Player {
    private String id;
    private String name;
    private int health = 100;
    private int x;
    private int y;
    private String facing = "right";
    private int wins = 0;
    private String currentAnimation = "idle";
    private boolean isAttacking = false;
    
    public Player() {
    }
    
    public Player(String id, String name) {
        this.id = id;
        this.name = name;
        this.x = 0;  // Will be set in GameService
        this.y = 0;  // Will be set in GameService
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public int getHealth() {
        return health;
    }
    
    public void setHealth(int health) {
        this.health = health;
    }
    
    public int getX() {
        return x;
    }
    
    public void setX(int x) {
        this.x = x;
    }
    
    public int getY() {
        return y;
    }
    
    public void setY(int y) {
        this.y = y;
    }
    
    public String getFacing() {
        return facing;
    }
    
    public void setFacing(String facing) {
        this.facing = facing;
    }
    
    public int getWins() {
        return wins;
    }
    
    public void setWins(int wins) {
        this.wins = wins;
    }
    
    public String getCurrentAnimation() {
        return currentAnimation;
    }
    
    public void setCurrentAnimation(String currentAnimation) {
        this.currentAnimation = currentAnimation;
    }
    
    public boolean isAttacking() {
        return isAttacking;
    }
    
    public void setAttacking(boolean attacking) {
        isAttacking = attacking;
    }
}
