package com.example.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.HashMap;

@Controller
public class TestController {
    
    private static final Logger logger = LoggerFactory.getLogger(TestController.class);
    
    /**
     * Simple test endpoint for WebSocket connectivity
     */
    @MessageMapping("/test")
    @SendTo("/topic/test")
    public Map<String, Object> handleTest(Map<String, Object> message) {
        logger.info("Received test message: {}", message);
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Server received your message!");
        response.put("received", message);
        response.put("timestamp", System.currentTimeMillis());
        
        return response;
    }
} 