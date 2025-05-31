package com.example.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    private static final Logger logger = LoggerFactory.getLogger(WebSocketConfig.class);

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Topic prefix for broadcasts to all subscribers
        config.enableSimpleBroker("/topic");
        // Application prefix for client-to-server messages
        config.setApplicationDestinationPrefixes("/app");
        
        logger.info("WebSocket message broker configured with topic prefix: /topic and app prefix: /app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint for WebSocket connection with SockJS fallback
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS()
                .setWebSocketEnabled(true)
                .setDisconnectDelay(30 * 1000)
                .setHeartbeatTime(25 * 1000)
                .setSuppressCors(false)  // Handle CORS
                .setSessionCookieNeeded(false);  // No session cookies needed
                
        logger.info("WebSocket STOMP endpoint registered at /ws with SockJS support and all origins allowed");
    }
    
    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(64 * 1024) // 64KB
                    .setSendBufferSizeLimit(512 * 1024) // 512KB
                    .setSendTimeLimit(20 * 1000); // 20 seconds
                    
        logger.info("WebSocket transport configured with extended limits");
    }
    
    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
        container.setMaxTextMessageBufferSize(8192);
        container.setMaxBinaryMessageBufferSize(8192);
        container.setMaxSessionIdleTimeout(60 * 1000L);
        
        logger.info("WebSocket container configured with session timeout: 60 seconds");
        return container;
    }
} 