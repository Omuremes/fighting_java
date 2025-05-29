package com.example.service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

import org.springframework.stereotype.Service;

import com.example.model.User;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;

@Service
public class UserService {
    
    private final Firestore firestore;
    
    public UserService(Firestore firestore) {
        this.firestore = firestore;
    }
    
    // Создание пользователя
    public String createUser(User user) throws ExecutionException, InterruptedException {
        // Если id не указан, генерируем новый документ с автогенерированным ID
        DocumentReference docRef = user.getId() != null 
            ? firestore.collection("users").document(user.getId())
            : firestore.collection("users").document();
            
        // Если ID был автогенерирован, устанавливаем его в объект
        if (user.getId() == null) {
            user.setId(docRef.getId());
        }
        
        // Записываем данные пользователя
        ApiFuture<WriteResult> result = docRef.set(user);
        
        // Ждем завершения записи
        result.get();
        
        return user.getId();
    }
    
    // Получение пользователя по ID
    public User getUser(String userId) throws ExecutionException, InterruptedException {
        DocumentReference docRef = firestore.collection("users").document(userId);
        ApiFuture<DocumentSnapshot> future = docRef.get();
        DocumentSnapshot document = future.get();
        
        if (document.exists()) {
            return document.toObject(User.class);
        }
        
        return null;
    }
    
    // Получение всех пользователей
    public List<User> getAllUsers() throws ExecutionException, InterruptedException {
        List<User> users = new ArrayList<>();
        ApiFuture<QuerySnapshot> future = firestore.collection("users").get();
        List<QueryDocumentSnapshot> documents = future.get().getDocuments();
        
        for (QueryDocumentSnapshot document : documents) {
            users.add(document.toObject(User.class));
        }
        
        return users;
    }
      // Обновление пользователя
    public String updateUser(User user) throws ExecutionException, InterruptedException {
        if (user.getId() == null) {
            throw new IllegalArgumentException("User ID cannot be null for update");
        }
        
        DocumentReference docRef = firestore.collection("users").document(user.getId());
        ApiFuture<WriteResult> result = docRef.set(user);
        
        result.get();
        
        return user.getId();
    }
    
    // Обновление рейтинга пользователя
    public User updateUserRating(String userId, boolean isWin) throws ExecutionException, InterruptedException {
        User user = getUser(userId);
        
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }
        
        // Обновление рейтинга
        int ratingChange = isWin ? 15 : -10;
        int newRating = Math.max(0, user.getRating() + ratingChange);
        user.setRating(newRating);
        
        // Обновление игровой валюты
        int coinChange = isWin ? 25 : 5;  // 25 монет за победу, 5 за участие
        int gemChange = isWin ? 1 : 0;    // 1 кристалл за победу
        
        int currentCoins = user.getCoin();
        int currentGems = user.getGem();
        
        user.setCoin(currentCoins + coinChange);
        user.setGem(currentGems + gemChange);
        
        // Сохранение обновленных данных пользователя
        updateUser(user);
        
        return user;
    }
    
    // Обновление игровой валюты пользователя
    public User updateCurrency(String userId, int coinChange, int gemChange) throws ExecutionException, InterruptedException {
        User user = getUser(userId);
        
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }
        
        int currentCoins = user.getCoin();
        int currentGems = user.getGem();
        
        user.setCoin(Math.max(0, currentCoins + coinChange));
        user.setGem(Math.max(0, currentGems + gemChange));
        
        // Сохранение обновленных данных пользователя
        updateUser(user);
        
        return user;
    }
    
    // Удаление пользователя
    public String deleteUser(String userId) throws ExecutionException, InterruptedException {
        ApiFuture<WriteResult> result = firestore.collection("users").document(userId).delete();
        result.get();
        
        return userId;
    }
    
    // Добавление предмета в инвентарь
    public User addToInventory(String userId, String itemId) throws ExecutionException, InterruptedException {
        User user = getUser(userId);
        
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }
        
        user.addToInventory(itemId);
        
        // Сохранение обновленных данных пользователя
        updateUser(user);
        
        return user;
    }
    
    // Проверка наличия предмета в инвентаре
    public boolean hasItem(String userId, String itemId) throws ExecutionException, InterruptedException {
        User user = getUser(userId);
        
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }
        
        return user.hasItem(itemId);
    }
}
