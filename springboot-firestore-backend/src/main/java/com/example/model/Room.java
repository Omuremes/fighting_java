package com.example.model;

import java.util.Map;
import java.util.UUID;

public class Room {
    private String roomId;
    private String hostId;
    private String hostName;
    private Map<String, Object> hostCharacter;
    private String guestId;
    private String guestName;
    private Map<String, Object> guestCharacter;
    private String status; // "waiting", "playing", "completed"
    private String gameId;
    private String winner; // null, "host", "guest"
    private String createdAt; // Changed to String to match Firestore data
    private long lastUpdated;
    
    // Additional fields found in Firestore (excluding 'ready' to avoid conflicts)
    private String backendRoomId;
    private Map<String, Object> guestAction;
    private Map<String, Object> hostAction;
    private boolean guestReady;
    private boolean hostReady;

    public Room() {
        this.roomId = UUID.randomUUID().toString();
        this.status = "waiting";
        this.createdAt = String.valueOf(System.currentTimeMillis());
        this.lastUpdated = System.currentTimeMillis();
        this.guestReady = false;
        this.hostReady = false;
    }

    public Room(String hostId, String hostName, Map<String, Object> hostCharacter) {
        this();
        this.hostId = hostId;
        this.hostName = hostName;
        this.hostCharacter = hostCharacter;
        this.hostReady = true; // Host is ready when they create the room
    }

    // Check if room is ready to start (has both players)
    public boolean hasAllPlayers() {
        return hostId != null && guestId != null && 
               hostName != null && guestName != null &&
               hostCharacter != null && guestCharacter != null;
    }

    // Add guest player to room
    public boolean addGuest(String guestId, String guestName, Map<String, Object> guestCharacter) {
        if (this.guestId != null) {
            return false; // Room already has a guest
        }
        
        this.guestId = guestId;
        this.guestName = guestName;
        this.guestCharacter = guestCharacter;
        
        if (hasAllPlayers()) {
            this.status = "playing";
        }
        
        this.lastUpdated = System.currentTimeMillis();
        return true;
    }

    // Update room status
    public void updateStatus(String status, String winner) {
        this.status = status;
        this.winner = winner;
        this.lastUpdated = System.currentTimeMillis();
    }

    // Getters and Setters
    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getHostId() {
        return hostId;
    }

    public void setHostId(String hostId) {
        this.hostId = hostId;
        this.lastUpdated = System.currentTimeMillis();
    }

    public String getHostName() {
        return hostName;
    }

    public void setHostName(String hostName) {
        this.hostName = hostName;
        this.lastUpdated = System.currentTimeMillis();
    }

    public Map<String, Object> getHostCharacter() {
        return hostCharacter;
    }

    public void setHostCharacter(Map<String, Object> hostCharacter) {
        this.hostCharacter = hostCharacter;
        this.lastUpdated = System.currentTimeMillis();
    }

    public String getGuestId() {
        return guestId;
    }

    public void setGuestId(String guestId) {
        this.guestId = guestId;
        this.lastUpdated = System.currentTimeMillis();
    }

    public String getGuestName() {
        return guestName;
    }

    public void setGuestName(String guestName) {
        this.guestName = guestName;
        this.lastUpdated = System.currentTimeMillis();
    }

    public Map<String, Object> getGuestCharacter() {
        return guestCharacter;
    }

    public void setGuestCharacter(Map<String, Object> guestCharacter) {
        this.guestCharacter = guestCharacter;
        this.lastUpdated = System.currentTimeMillis();
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
        this.lastUpdated = System.currentTimeMillis();
    }

    public String getGameId() {
        return gameId;
    }

    public void setGameId(String gameId) {
        this.gameId = gameId;
        this.lastUpdated = System.currentTimeMillis();
    }

    public String getWinner() {
        return winner;
    }

    public void setWinner(String winner) {
        this.winner = winner;
        this.lastUpdated = System.currentTimeMillis();
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public long getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(long lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    // New field getters and setters
    public String getBackendRoomId() {
        return backendRoomId;
    }

    public void setBackendRoomId(String backendRoomId) {
        this.backendRoomId = backendRoomId;
    }

    public Map<String, Object> getGuestAction() {
        return guestAction;
    }

    public void setGuestAction(Map<String, Object> guestAction) {
        this.guestAction = guestAction;
    }

    public Map<String, Object> getHostAction() {
        return hostAction;
    }

    public void setHostAction(Map<String, Object> hostAction) {
        this.hostAction = hostAction;
    }

    public boolean isGuestReady() {
        return guestReady;
    }

    public void setGuestReady(boolean guestReady) {
        this.guestReady = guestReady;
    }

    public boolean isHostReady() {
        return hostReady;
    }

    public void setHostReady(boolean hostReady) {
        this.hostReady = hostReady;
    }
}
