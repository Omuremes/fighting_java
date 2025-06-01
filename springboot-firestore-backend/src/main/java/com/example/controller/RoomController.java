package com.example.controller;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.example.model.Game;
import com.example.model.GameAction;
import com.example.model.Room;
import com.example.model.RoomJoinResult;
import com.example.service.GameService;
import com.example.service.GameSocketService;
import com.example.service.RoomService;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(
    origins = "http://localhost:3000",
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS},
    allowedHeaders = "*",
    allowCredentials = "true"
)
public class RoomController {

    @Autowired
    private RoomService roomService;
    
    @Autowired
    private GameService gameService;
    
    @Autowired
    private GameSocketService gameSocketService;

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(RoomController.class);

    // Create a new room
    @PostMapping
    public ResponseEntity<Room> createRoom(@RequestBody Map<String, Object> request) {
        try {
            logger.info("Creating new room with request: {}", request);
            
            String hostId = (String) request.get("hostId");
            String hostName = (String) request.get("hostName");
            Map<String, Object> hostCharacter = (Map<String, Object>) request.get("hostCharacter");
            
            if (hostId == null || hostName == null || hostCharacter == null) {
                logger.warn("Missing required fields in create room request");
                return ResponseEntity.badRequest().build();
            }
            
            logger.info("Creating room with host={}, hostName={}, character={}", hostId, hostName, hostCharacter);
            Room room = roomService.createRoom(hostId, hostName, hostCharacter);
            logger.info("Room created successfully: {}", room.getRoomId());
            
            // Broadcast room creation via WebSocket
            gameSocketService.broadcastRoomUpdate(room);
            
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(room);
        } catch (Exception e) {
            logger.error("Error creating room: {}", e.getMessage(), e);
            e.printStackTrace(); // Print full stack trace
            
            // Return JSON error response with details
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "INTERNAL_ERROR");
            errorResponse.put("message", e.getMessage());
            
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(null);
        }
    }

    // Join an existing room
    @PostMapping("/{roomId}/join")
    public ResponseEntity<?> joinRoom(@PathVariable String roomId, 
                                     @RequestBody Map<String, Object> request) {
        try {
            logger.info("Joining room {} with request: {}", roomId, request);
            
            String guestId = (String) request.get("guestId");
            String guestName = (String) request.get("guestName");
            Map<String, Object> guestCharacter = (Map<String, Object>) request.get("guestCharacter");
            
            if (guestId == null || guestName == null || guestCharacter == null) {
                logger.warn("Missing required fields in join room request");
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "MISSING_FIELDS", "message", "Missing required fields"));
            }
            
            RoomJoinResult result = roomService.joinRoom(roomId, guestId, guestName, guestCharacter);
            
            if (!result.isSuccess()) {
                logger.warn("Failed to join room {}: {} - {}", roomId, result.getErrorCode(), result.getErrorMessage());
                
                HttpStatus status = switch (result.getErrorCode()) {
                    case "ROOM_NOT_FOUND" -> HttpStatus.NOT_FOUND;
                    case "ROOM_FULL", "ROOM_IN_PROGRESS", "ROOM_FINISHED", "ROOM_NOT_AVAILABLE" -> HttpStatus.CONFLICT;
                    default -> HttpStatus.BAD_REQUEST;
                };
                
                return ResponseEntity.status(status)
                    .body(Map.of("error", result.getErrorCode(), "message", result.getErrorMessage()));
            }
            
            Room room = result.getRoom();
            
            // Create a game instance when both players join
            if (room.getStatus().equals("playing")) {
                Game game = gameService.createRoomGame(room);
                room.setGameId(game.getId());
                roomService.updateRoom(room);
                logger.info("Game created for room {}: {}", roomId, game.getId());
                
                // Broadcast room state update via WebSocket
                gameSocketService.broadcastRoomUpdate(room);
            }
            
            logger.info("Successfully joined room: {}", roomId);
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(room);
        } catch (Exception e) {
            logger.error("Error joining room", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "INTERNAL_ERROR", "message", "Internal server error"));
        }
    }

    // Get room details
    @GetMapping("/{roomId}")
    public ResponseEntity<Room> getRoom(@PathVariable String roomId) {
        try {
            Room room = roomService.getRoom(roomId);
            
            if (room == null) {
                logger.warn("Room not found: {}", roomId);
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(room);
        } catch (Exception e) {
            logger.error("Error getting room", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Update room status
    @PutMapping("/{roomId}/status")
    public ResponseEntity<Room> updateRoomStatus(@PathVariable String roomId, 
                                                @RequestBody Map<String, String> request) {
        try {
            String status = request.get("status");
            String winner = request.get("winner");
            
            Room room = roomService.updateRoomStatus(roomId, status, winner);
            
            if (room == null) {
                logger.warn("Room not found: {}", roomId);
                return ResponseEntity.notFound().build();
            }
            
            // Broadcast room status update via WebSocket
            gameSocketService.broadcastRoomUpdate(room);
            
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(room);
        } catch (Exception e) {
            logger.error("Error updating room status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Process game action in a room - now with WebSocket integration
    @PostMapping("/{roomId}/action")
    public ResponseEntity<Game> processRoomAction(@PathVariable String roomId, 
                                                @RequestBody GameAction action) {
        try {
            logger.info("Processing action for room {}: {}", roomId, action.getType());
            
            Room room = roomService.getRoom(roomId);
            
            if (room == null || !room.getStatus().equals("playing")) {
                logger.warn("Room not found or not in playing state: {}", roomId);
                return ResponseEntity.badRequest().build();
            }
            
            // Set the game ID from the room
            action.setGameId(room.getGameId());
            
            // Process the action and broadcast via WebSocket
            gameSocketService.processGameAction(roomId, action);
            
            // Process the action through the game service
            Game updatedGame = gameService.processAction(action);
            
            if (updatedGame == null) {
                logger.warn("Game action processing failed");
                return ResponseEntity.badRequest().build();
            }
            
            // Check if game is over and update room accordingly
            if (updatedGame.getStatus().equals("finished")) {
                String winner = null;
                if (updatedGame.getPlayer1().getWins() >= 2) {
                    winner = room.getHostId().equals(updatedGame.getPlayer1().getId()) ? "host" : "guest";
                } else if (updatedGame.getPlayer2().getWins() >= 2) {
                    winner = room.getHostId().equals(updatedGame.getPlayer2().getId()) ? "host" : "guest";
                }
                Room updatedRoom = roomService.updateRoomStatus(roomId, "completed", winner);
                
                // Broadcast room update via WebSocket
                if (updatedRoom != null) {
                    gameSocketService.broadcastRoomUpdate(updatedRoom);
                }
            }
            
            logger.info("Action processed successfully for room {}", roomId);
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(updatedGame);
        } catch (Exception e) {
            logger.error("Error processing room action", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Get all active rooms
    @GetMapping
    public ResponseEntity<List<Room>> getAllRooms() {
        try {
            List<Room> rooms = roomService.getAllRooms();
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(rooms);
        } catch (Exception e) {
            logger.error("Error getting all rooms", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Temporary endpoint to clear all rooms (for debugging)
    @PostMapping("/clear")
    public ResponseEntity<String> clearAllRooms() {
        try {
            roomService.clearAllRooms();
            return ResponseEntity.ok("All rooms cleared successfully");
        } catch (Exception e) {
            logger.error("Error clearing all rooms", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error clearing rooms");
        }
    }
}
