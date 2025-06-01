package com.example.model;

import java.util.Map;
import java.util.HashMap;
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
    private String lastUpdated; // Changed from long to String to match Firestore data
    
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
        this.lastUpdated = String.valueOf(System.currentTimeMillis());
        this.guestReady = false;
        this.hostReady = false;
    }

    public Room(String hostId, String hostName, Map<String, Object> hostCharacter) {
        this();
        this.hostId = hostId;
        this.hostName = hostName;
        
        // Ensure character data is properly formatted for Firestore
        this.hostCharacter = sanitizeCharacterData(hostCharacter);
        
        this.hostReady = true; // Host is ready when they create the room
    }
    
    // Helper method to sanitize character data for Firestore storage
    private Map<String, Object> sanitizeCharacterData(Map<String, Object> character) {
        if (character == null) {
            return new HashMap<>();
        }
        
        Map<String, Object> sanitized = new HashMap<>();
        
        // Copy each field, ensuring it's a type Firestore can handle
        for (Map.Entry<String, Object> entry : character.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();
            
            if (value == null) {
                // Skip null values
                continue;
            }
            
            // Handle nested maps (like stats)
            if (value instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> nestedMap = (Map<String, Object>) value;
                Map<String, Object> sanitizedNested = new HashMap<>();
                
                for (Map.Entry<String, Object> nestedEntry : nestedMap.entrySet()) {
                    Object nestedValue = nestedEntry.getValue();
                    if (nestedValue != null) {
                        // Convert numeric types to Double for consistency
                        if (nestedValue instanceof Number) {
                            sanitizedNested.put(nestedEntry.getKey(), ((Number) nestedValue).doubleValue());
                        } else {
                            sanitizedNested.put(nestedEntry.getKey(), String.valueOf(nestedValue));
                        }
                    }
                }
                
                sanitized.put(key, sanitizedNested);
            } else if (value instanceof Number) {
                // Convert all numeric types to Double for consistency
                sanitized.put(key, ((Number) value).doubleValue());
            } else {
                // Strings and other primitives
                sanitized.put(key, String.valueOf(value));
            }
        }
        
        // Ensure required fields are present
        if (!sanitized.containsKey("id")) {
            sanitized.put("id", "default");
        }
        if (!sanitized.containsKey("name")) {
            sanitized.put("name", "Unknown");
        }
        
        return sanitized;
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
        this.guestCharacter = sanitizeCharacterData(guestCharacter);
        
        if (hasAllPlayers()) {
            this.status = "playing";
        }
        
        this.lastUpdated = String.valueOf(System.currentTimeMillis());
        return true;
    }

    // Update room status
    public void updateStatus(String status, String winner) {
        this.status = status;
        this.winner = winner;
        this.lastUpdated = String.valueOf(System.currentTimeMillis());
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
        this.lastUpdated = String.valueOf(System.currentTimeMillis());
    }

    public String getHostName() {
        return hostName;
    }

    public void setHostName(String hostName) {
        this.hostName = hostName;
        this.lastUpdated = String.valueOf(System.currentTimeMillis());
    }

    public Map<String, Object> getHostCharacter() {
        return hostCharacter;
    }

    public void setHostCharacter(Map<String, Object> hostCharacter) {
        this.hostCharacter = sanitizeCharacterData(hostCharacter);
        this.lastUpdated = String.valueOf(System.currentTimeMillis());
    }

    public String getGuestId() {
        return guestId;
    }

    public void setGuestId(String guestId) {
        this.guestId = guestId;
        this.lastUpdated = String.valueOf(System.currentTimeMillis());
    }

    public String getGuestName() {
        return guestName;
    }

    public void setGuestName(String guestName) {
        this.guestName = guestName;
        this.lastUpdated = String.valueOf(System.currentTimeMillis());
    }

    public Map<String, Object> getGuestCharacter() {
        return guestCharacter;
    }

    public void setGuestCharacter(Map<String, Object> guestCharacter) {
        this.guestCharacter = sanitizeCharacterData(guestCharacter);
        this.lastUpdated = String.valueOf(System.currentTimeMillis());
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
        this.lastUpdated = String.valueOf(System.currentTimeMillis());
    }

    public String getGameId() {
        return gameId;
    }

    public void setGameId(String gameId) {
        this.gameId = gameId;
        this.lastUpdated = String.valueOf(System.currentTimeMillis());
    }

    public String getWinner() {
        return winner;
    }

    public void setWinner(String winner) {
        this.winner = winner;
        this.lastUpdated = String.valueOf(System.currentTimeMillis());
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(String lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    // Remove this overloaded method to prevent deserialization issues
    /*
    public void setLastUpdated(Long lastUpdated) {
        this.lastUpdated = lastUpdated != null ? lastUpdated.toString() : null;
    }
    */

    // New method to handle all timestamp formats
    public void setLastUpdatedTimestamp(Object timestamp) {
        if (timestamp == null) {
            this.lastUpdated = String.valueOf(System.currentTimeMillis());
        } else if (timestamp instanceof String) {
            this.lastUpdated = (String) timestamp;
        } else if (timestamp instanceof Number) {
            this.lastUpdated = String.valueOf(((Number) timestamp).longValue());
        } else {
            this.lastUpdated = timestamp.toString();
        }
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
