package com.example.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.model.Room;
import com.example.model.RoomJoinResult;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;

@Service
public class RoomService {
    
    private final Firestore firestore;
    private final Map<String, Room> activeRooms;
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(RoomService.class);

    @Autowired
    public RoomService(Firestore firestore) {
        this.firestore = firestore;
        this.activeRooms = new ConcurrentHashMap<>();
        logger.info("RoomService initialized with Firestore dependency");
    }

    // Create a new room
    public Room createRoom(String hostId, String hostName, Map<String, Object> hostCharacter) 
            throws ExecutionException, InterruptedException {
        
        logger.info("Creating room for host: {} ({})", hostName, hostId);
        logger.debug("Host character data: {}", hostCharacter);
        
        try {
            Room room = new Room(hostId, hostName, hostCharacter);
            logger.debug("Room object created: {}", room.getRoomId());
            
            // Save to Firestore
            DocumentReference docRef = firestore.collection("rooms").document(room.getRoomId());
            logger.debug("Saving room to Firestore with ID: {}", room.getRoomId());
            
            ApiFuture<WriteResult> result = docRef.set(room);
            result.get(); // Wait for completion
            
            // Add to local cache
            activeRooms.put(room.getRoomId(), room);
            
            logger.info("Room created successfully: {}", room.getRoomId());
            return room;
        } catch (Exception e) {
            logger.error("Error creating room", e);
            throw e; // Re-throw to propagate to controller
        }
    }

    // Join an existing room
    public RoomJoinResult joinRoom(String roomId, String guestId, String guestName, Map<String, Object> guestCharacter) 
            throws ExecutionException, InterruptedException {
        
        logger.info("Guest {} ({}) joining room: {}", guestName, guestId, roomId);
        
        Room room = getRoom(roomId);
        
        if (room == null) {
            logger.warn("Room not found: {}", roomId);
            return RoomJoinResult.error("ROOM_NOT_FOUND", "Room not found");
        }
        
        if (!room.getStatus().equals("waiting")) {
            logger.warn("Room {} is not waiting for players. Status: {}", roomId, room.getStatus());
            if (room.getStatus().equals("playing")) {
                return RoomJoinResult.error("ROOM_IN_PROGRESS", "Game is already in progress");
            } else if (room.getStatus().equals("finished")) {
                return RoomJoinResult.error("ROOM_FINISHED", "Game has already finished");
            }
            return RoomJoinResult.error("ROOM_NOT_AVAILABLE", "Room is not available for joining");
        }
        
        if (room.getGuestId() != null) {
            logger.warn("Room {} already has a guest: {}", roomId, room.getGuestId());
            return RoomJoinResult.error("ROOM_FULL", "Room already has two players");
        }
        
        // Add guest to room
        boolean success = room.addGuest(guestId, guestName, guestCharacter);
        
        if (!success) {
            logger.warn("Failed to add guest to room: {}", roomId);
            return RoomJoinResult.error("JOIN_FAILED", "Failed to join room");
        }
        
        // Mark guest as ready when they join
        room.setGuestReady(true);
        
        // Update in Firestore and cache
        updateRoom(room);
        
        logger.info("Guest successfully joined room: {}", roomId);
        return RoomJoinResult.success(room);
    }

    // Get room by ID
    public Room getRoom(String roomId) throws ExecutionException, InterruptedException {
        // Check local cache first
        Room cachedRoom = activeRooms.get(roomId);
        if (cachedRoom != null) {
            return cachedRoom;
        }
        
        // Fetch from Firestore
        DocumentReference docRef = firestore.collection("rooms").document(roomId);
        ApiFuture<DocumentSnapshot> future = docRef.get();
        DocumentSnapshot document = future.get();
        
        if (document.exists()) {
            Room room = document.toObject(Room.class);
            if (room != null) {
                // Add to cache
                activeRooms.put(roomId, room);
                return room;
            }
        }
        
        return null;
    }

    // Update room status
    public Room updateRoomStatus(String roomId, String status, String winner) 
            throws ExecutionException, InterruptedException {
        
        logger.info("Updating room {} status to: {} (winner: {})", roomId, status, winner);
        
        Room room = getRoom(roomId);
        
        if (room == null) {
            logger.warn("Room not found for status update: {}", roomId);
            return null;
        }
        
        room.updateStatus(status, winner);
        updateRoom(room);
        
        logger.info("Room status updated successfully: {}", roomId);
        return room;
    }

    // Update room in Firestore and cache
    public void updateRoom(Room room) throws ExecutionException, InterruptedException {
        // Update in Firestore
        DocumentReference docRef = firestore.collection("rooms").document(room.getRoomId());
        ApiFuture<WriteResult> result = docRef.set(room);
        result.get(); // Wait for completion
        
        // Update cache
        activeRooms.put(room.getRoomId(), room);
        
        logger.debug("Room updated: {}", room.getRoomId());
    }

    // Get all active rooms
    public List<Room> getAllRooms() throws ExecutionException, InterruptedException {
        List<Room> rooms = new ArrayList<>();
        
        // Fetch from Firestore to get latest data
        ApiFuture<QuerySnapshot> future = firestore.collection("rooms").get();
        QuerySnapshot querySnapshot = future.get();
        
        for (QueryDocumentSnapshot document : querySnapshot.getDocuments()) {
            try {
                Room room = document.toObject(Room.class);
                if (room != null) {
                    rooms.add(room);
                    // Update cache
                    activeRooms.put(room.getRoomId(), room);
                }
            } catch (Exception e) {
                logger.error("Error converting document to Room: {}", document.getId(), e);
                // Continue processing other documents even if this one fails
            }
        }
        
        logger.info("Retrieved {} rooms from Firestore", rooms.size());
        return rooms;
    }

    // Get available rooms (waiting for players)
    public List<Room> getAvailableRooms() throws ExecutionException, InterruptedException {
        List<Room> allRooms = getAllRooms();
        List<Room> availableRooms = new ArrayList<>();
        
        for (Room room : allRooms) {
            if ("waiting".equals(room.getStatus()) && room.getGuestId() == null) {
                availableRooms.add(room);
            }
        }
        
        logger.info("Found {} available rooms", availableRooms.size());
        return availableRooms;
    }

    // Remove room (for cleanup)
    public void removeRoom(String roomId) throws ExecutionException, InterruptedException {
        logger.info("Removing room: {}", roomId);
        
        // Remove from Firestore
        DocumentReference docRef = firestore.collection("rooms").document(roomId);
        ApiFuture<WriteResult> result = docRef.delete();
        result.get(); // Wait for completion
        
        // Remove from cache
        activeRooms.remove(roomId);
        
        logger.info("Room removed successfully: {}", roomId);
    }

    // Clean up old/completed rooms (utility method)
    public void cleanupOldRooms() throws ExecutionException, InterruptedException {
        String cutoffTime = String.valueOf(System.currentTimeMillis() - (24 * 60 * 60 * 1000)); // 24 hours ago
        
        List<Room> allRooms = getAllRooms();
        int removedCount = 0;
        
        for (Room room : allRooms) {
            // Remove rooms that are completed or very old
            try {
                // Compare as longs to handle proper time comparison
                long roomLastUpdated = Long.parseLong(room.getLastUpdated());
                long cutoffTimeLong = Long.parseLong(cutoffTime);
                
                if ("completed".equals(room.getStatus()) || roomLastUpdated < cutoffTimeLong) {
                    try {
                        removeRoom(room.getRoomId());
                        removedCount++;
                    } catch (Exception e) {
                        logger.warn("Failed to remove old room: {}", room.getRoomId(), e);
                    }
                }
            } catch (NumberFormatException e) {
                logger.warn("Could not parse lastUpdated time for room {}: {}", room.getRoomId(), room.getLastUpdated());
            }
        }
        
        logger.info("Cleaned up {} old rooms", removedCount);
    }

    // Temporary method to clear all rooms (for debugging data structure issues)
    public void clearAllRooms() throws ExecutionException, InterruptedException {
        ApiFuture<QuerySnapshot> future = firestore.collection("rooms").get();
        QuerySnapshot querySnapshot = future.get();
        
        int deletedCount = 0;
        for (QueryDocumentSnapshot document : querySnapshot.getDocuments()) {
            document.getReference().delete();
            deletedCount++;
        }
        
        // Clear cache as well
        activeRooms.clear();
        
        logger.info("Cleared {} rooms from Firestore", deletedCount);
    }
}
