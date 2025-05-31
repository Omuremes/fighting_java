package com.example.model;

public class RoomJoinResult {
    private boolean success;
    private Room room;
    private String errorCode;
    private String errorMessage;
    
    public RoomJoinResult(boolean success, Room room, String errorCode, String errorMessage) {
        this.success = success;
        this.room = room;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
    }
    
    public static RoomJoinResult success(Room room) {
        return new RoomJoinResult(true, room, null, null);
    }
    
    public static RoomJoinResult error(String errorCode, String errorMessage) {
        return new RoomJoinResult(false, null, errorCode, errorMessage);
    }
    
    // Getters
    public boolean isSuccess() {
        return success;
    }
    
    public Room getRoom() {
        return room;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
    
    public String getErrorMessage() {
        return errorMessage;
    }
    
    // Setters
    public void setSuccess(boolean success) {
        this.success = success;
    }
    
    public void setRoom(Room room) {
        this.room = room;
    }
    
    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }
    
    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }
}
