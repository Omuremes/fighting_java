package com.example.model;

public class User {
    private String id;
    private String name;
    private String email;
    private int rating;
    private String rank;
    
    public User() {
        // Пустой конструктор для Firebase
    }
    
    public User(String id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.rating = 100; // Начальный рейтинг
        this.rank = "Бронза"; // Начальный ранг
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public int getRating() {
        return rating;
    }
    
    public void setRating(int rating) {
        this.rating = rating;
        updateRank();
    }
    
    public String getRank() {
        return rank;
    }
    
    public void setRank(String rank) {
        this.rank = rank;
    }
    
    // Обновление ранга на основе рейтинга
    private void updateRank() {
        if (rating < 100) {
            rank = "Бронза";
        } else if (rating < 200) {
            rank = "Серебро";
        } else if (rating < 400) {
            rank = "Золото";
        } else if (rating < 600) {
            rank = "Платина";
        } else if (rating < 800) {
            rank = "Алмаз";
        } else {
            rank = "Легенда";
        }
    }
}
