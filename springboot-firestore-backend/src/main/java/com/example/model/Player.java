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
    private int width = 500; // Default width for player sprites
    private int height = 267; // Default height for player sprites
    
    public Player() {
    }
    
    public Player(String id, String name, int x, int y) {
        this.id = id;
        this.name = name;
        this.x = x;
        this.y = y;
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
    
    public int getWidth() {
        return width;
    }
    
    public void setWidth(int width) {
        this.width = width;
    }
    
    public int getHeight() {
        return height;
    }
    
    public void setHeight(int height) {
        this.height = height;
    }
}
