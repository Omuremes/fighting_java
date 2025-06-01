package com.example.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMethod;

import com.example.model.Room;
import com.example.service.RoomService;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteResult;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

/**
 * Debug controller for testing API functionality and Firestore connectivity
 */
@RestController
@RequestMapping("/api/debug")
@CrossOrigin(
    origins = "http://localhost:3000",
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS},
    allowedHeaders = "*",
    allowCredentials = "true"
)
public class DebugController {
    
    @Autowired
    private Firestore firestore;
    
    @Autowired
    private RoomService roomService;
    
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(DebugController.class);
    
    /**
     * Test Firestore connectivity
     * @return Firestore test result
     */
    @GetMapping("/firestore")
    public ResponseEntity<Map<String, Object>> testFirestore() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Create a test document with a unique ID
            String testId = "test-" + UUID.randomUUID().toString();
            Map<String, Object> testData = new HashMap<>();
            testData.put("timestamp", System.currentTimeMillis());
            testData.put("message", "Test document");
            
            // Write to Firestore
            WriteResult result = firestore.collection("debug")
                .document(testId)
                .set(testData)
                .get();
                
            // Fetch the document we just wrote
            Map<String, Object> fetchedData = firestore.collection("debug")
                .document(testId)
                .get()
                .get()
                .getData();
                
            // Delete the document
            firestore.collection("debug")
                .document(testId)
                .delete()
                .get();
                
            // Success response
            response.put("success", true);
            response.put("updateTime", result.getUpdateTime().toString());
            response.put("fetchedData", fetchedData);
            
            logger.info("Firestore test successful. Document created and deleted.");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Firestore test failed", e);
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * Test room creation
     * @param request Room creation request
     * @return Created room
     */
    @PostMapping("/room")
    public ResponseEntity<?> testCreateRoom(@RequestBody Map<String, Object> request) {
        try {
            logger.info("Testing room creation with request: {}", request);
            
            String hostId = (String) request.get("hostId");
            String hostName = (String) request.get("hostName");
            Map<String, Object> hostCharacter = (Map<String, Object>) request.get("hostCharacter");
            
            if (hostId == null) hostId = "test-" + UUID.randomUUID().toString().substring(0, 8);
            if (hostName == null) hostName = "Test User";
            if (hostCharacter == null) {
                hostCharacter = new HashMap<>();
                hostCharacter.put("id", "player1");
                hostCharacter.put("name", "Test Character");
            }
            
            logger.info("Creating test room with hostId={}, hostName={}, hostCharacter={}",
                      hostId, hostName, hostCharacter);
                      
            // Create room through service
            Room room = roomService.createRoom(hostId, hostName, hostCharacter);
            
            logger.info("Test room created: {}", room.getRoomId());
            
            return ResponseEntity.ok().body(room);
            
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error creating test room", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to create room");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("stackTrace", e.getStackTrace()[0].toString());
            return ResponseEntity.status(500).body(errorResponse);
        } catch (Exception e) {
            logger.error("Unexpected error creating test room", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Unexpected error");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
} 