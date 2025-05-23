package com.example.controller;

import java.util.List;
import java.util.concurrent.ExecutionException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.model.User;
import com.example.service.UserService;

@RestController
@RequestMapping("/users")
@CrossOrigin(
    origins = "http://localhost:3000",
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS},
    allowedHeaders = "*",
    allowCredentials = "true"
)
public class DirectUserController {

    @Autowired
    private UserService userService;
    
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(DirectUserController.class);

    // Создание пользователя
    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody User user) {
        try {
            logger.info("Creating new user via /users: {}", user.getName());
            String userId = userService.createUser(user);
            User createdUser = userService.getUser(userId);
            
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(createdUser);
        } catch (Exception e) {
            logger.error("Error creating user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Получение пользователя по ID
    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable String id) {
        try {
            logger.info("Getting user with ID via /users: {}", id);
            User user = userService.getUser(id);
            
            if (user == null) {
                logger.warn("User not found: {}", id);
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(user);
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error getting user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Получение всех пользователей
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        try {
            logger.info("Getting all users via /users");
            List<User> users = userService.getAllUsers();
            
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(users);
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error getting all users: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Обновление пользователя
    @PutMapping("/{id}")
    public ResponseEntity<User> updateUser(@PathVariable String id, @RequestBody User user) {
        try {
            logger.info("Updating user with ID via /users: {}", id);
            
            // Убедимся, что ID в пути и в теле запроса совпадают
            if (!id.equals(user.getId())) {
                user.setId(id);
            }
            
            userService.updateUser(user);
            User updatedUser = userService.getUser(id);
            
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(updatedUser);
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error updating user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Обновление рейтинга пользователя
    @PutMapping("/{id}/rating")
    public ResponseEntity<User> updateUserRating(@PathVariable String id, @RequestParam boolean isWin) {
        try {
            logger.info("Updating rating for user with ID via /users: {}, isWin: {}", id, isWin);
            User user = userService.updateUserRating(id, isWin);
            
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(user);
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error updating user rating: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Удаление пользователя
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable String id) {
        try {
            logger.info("Deleting user with ID via /users: {}", id);
            userService.deleteUser(id);
            
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body("{\"message\": \"User deleted successfully\"}");
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error deleting user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
