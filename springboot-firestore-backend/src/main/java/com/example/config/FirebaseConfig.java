package com.example.config;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;

@Configuration
public class FirebaseConfig {
    
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(FirebaseConfig.class);
    
    @Bean
    public Firestore firestore() throws IOException {
        logger.info("Initializing Firestore...");
        
        // Load the service account file from classpath
        var serviceAccount = getClass().getClassLoader().getResourceAsStream("firebase-service-account.json");
        if (serviceAccount == null) {
            throw new IOException("Could not find firebase-service-account.json");
        }
        
        GoogleCredentials credentials = GoogleCredentials.fromStream(serviceAccount);
        logger.info("Credentials loaded successfully");

        FirebaseOptions options = FirebaseOptions.builder()
            .setCredentials(credentials)
            .setProjectId("fighting-game-199e4")
            .build();

        // Проверяем, не инициализировано ли уже приложение
        if (FirebaseApp.getApps().isEmpty()) {
            FirebaseApp.initializeApp(options);
            logger.info("Firebase app initialized successfully");
        } else {
            logger.info("Firebase app already initialized");
        }
        
        Firestore db = FirestoreClient.getFirestore();
        
        // Проверяем соединение, создавая тестовый документ
        try {
            Map<String, Object> testData = new HashMap<>();
            testData.put("test", "connection");
            
            db.collection("games").document("test")
                .set(testData)
                .get();
            logger.info("Firebase connection test successful");
            
            // Удаляем тестовый документ
            db.collection("games").document("test")
                .delete()
                .get();
        } catch (Exception e) {
            logger.error("Firebase connection error", e);
            throw new RuntimeException("Failed to connect to Firebase", e);
        }
        
        return db;
    }
}