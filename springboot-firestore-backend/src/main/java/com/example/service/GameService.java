package com.example.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

import org.springframework.stereotype.Service;

import com.example.model.Game;
import com.example.model.GameAction;
import com.example.model.Player;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.WriteResult;

@Service
public class GameService {
    private final Firestore firestore;
    private final Map<String, Game> activeGames = new HashMap<>(); // In-memory cache for active games
    
    // Constants for game mechanics
    private static final int MOVE_SPEED = 8;
    private static final int ATTACK_DAMAGE = 10;
    private static final int CANVAS_WIDTH = 1200; // Approximate, adjust as needed
    private static final int PLAYER_WIDTH = 500;
    private static final int ATTACK_RANGE = 250; // Attack range in pixels
    
    public GameService(Firestore firestore) {
        this.firestore = firestore;
    }
    
    // Create a new game
    public Game createGame(Player player1, Player player2) throws ExecutionException, InterruptedException {
        Game game = new Game(player1, player2);
        game.setStatus("running");
        
        // Set player dimensions
        player1.setWidth(PLAYER_WIDTH);
        player2.setWidth(PLAYER_WIDTH);
        
        // Initialize player positions
        player1.setX(0);
        player2.setX(CANVAS_WIDTH - player2.getWidth());
        
        // Initialize player facing directions
        player1.setFacing("right");
        player2.setFacing("left");
        
        // Store in memory
        activeGames.put(game.getId(), game);
        
        // Store in Firestore
        DocumentReference docRef = firestore.collection("games").document(game.getId());
        ApiFuture<WriteResult> result = docRef.set(game);
        result.get(); // Wait for write to complete
        
        return game;
    }
    
    // Get a game by ID
    public Game getGame(String gameId) throws ExecutionException, InterruptedException {
        // Check in-memory cache first
        if (activeGames.containsKey(gameId)) {
            return activeGames.get(gameId);
        }
        
        // Fallback to Firestore
        DocumentReference docRef = firestore.collection("games").document(gameId);
        ApiFuture<DocumentSnapshot> future = docRef.get();
        DocumentSnapshot document = future.get();
        
        if (document.exists()) {
            Game game = document.toObject(Game.class);
            activeGames.put(gameId, game); // Cache it
            return game;
        }
        
        return null;
    }
    
    // Get all active games
    public List<Game> getAllGames() throws ExecutionException, InterruptedException {
        List<Game> games = new ArrayList<>();
        ApiFuture<QuerySnapshot> future = firestore.collection("games").get();
        QuerySnapshot querySnapshot = future.get();
        
        for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
            games.add(doc.toObject(Game.class));
        }
        
        return games;
    }
    
    // Process a player action
    public Game processAction(GameAction action) throws ExecutionException, InterruptedException {
        Game game = getGame(action.getGameId());
        if (game == null || !game.getStatus().equals("running")) {
            return null;
        }
        
        Player player;
        Player opponent;
        
        // Determine which player is acting
        if (action.getPlayerId().equals(game.getPlayer1().getId())) {
            player = game.getPlayer1();
            opponent = game.getPlayer2();
        } else if (action.getPlayerId().equals(game.getPlayer2().getId())) {
            player = game.getPlayer2();
            opponent = game.getPlayer1();
        } else {
            return null; // Invalid player ID
        }
        
        // Process the action
        switch (action.getActionType()) {
            case "move":
                handleMoveAction(player, action.getDirection());
                break;
                
            case "attack":
                handleAttackAction(player, opponent, action.getAttackType());
                break;
                
            case "jump":
                // Jump logic would be handled on frontend via velocity changes
                player.setCurrentAnimation("jump");
                break;
        }
        
        // Check if round is over
        if (game.isGameOver()) {
            game.nextRound();
            
            // Check if game is over (e.g., a player reached 2 wins)
            if (game.getPlayer1().getWins() >= 2) {
                game.setStatus("finished");
                game.setWinner(game.getPlayer1().getName());
            } else if (game.getPlayer2().getWins() >= 2) {
                game.setStatus("finished");
                game.setWinner(game.getPlayer2().getName());
            }
        }
        
        // Update game in Firestore
        updateGame(game);
        
        return game;
    }
    
    // Handle player movement
    private void handleMoveAction(Player player, String direction) {
        if ("left".equals(direction)) {
            player.setX(Math.max(0, player.getX() - MOVE_SPEED));
            player.setFacing("left");
            player.setCurrentAnimation("run");
        } else if ("right".equals(direction)) {
            // Use player's actual width instead of a constant
            player.setX(Math.min(CANVAS_WIDTH - player.getWidth(), player.getX() + MOVE_SPEED));
            player.setFacing("right");
            player.setCurrentAnimation("run");
        }
    }
    
    // Handle attack actions
    private void handleAttackAction(Player attacker, Player defender, String attackType) {
        attacker.setAttacking(true);
        attacker.setCurrentAnimation(attackType);
        
        boolean canHit = false;
        
        // Calculate distance between players
        int distance = Math.abs(attacker.getX() - defender.getX());
        
        // Direction-based collision check
        boolean correctDirection = false;
        if (attacker.getFacing().equals("right") && attacker.getX() < defender.getX()) {
            correctDirection = true;
        } else if (attacker.getFacing().equals("left") && attacker.getX() > defender.getX()) {
            correctDirection = true;
        }
        
        // Log attack attempt for debugging
        System.out.println("Attack attempt: Distance between players = " + distance + 
                          ", Attacker facing: " + attacker.getFacing() + 
                          ", Attacker pos: " + attacker.getX() + 
                          ", Defender pos: " + defender.getX() + 
                          ", Correct direction: " + correctDirection);
        
        // Hit is successful if within range AND facing the correct direction
        canHit = distance <= ATTACK_RANGE && correctDirection;
        
        System.out.println("Attack hit: " + canHit);
        
        if (canHit) {
            // Apply damage
            int newHealth = Math.max(0, defender.getHealth() - ATTACK_DAMAGE);
            defender.setHealth(newHealth);
            defender.setCurrentAnimation("getHit");
            System.out.println("Hit registered! Defender health: " + newHealth);
        }
    }
    
    // Update game state in Firestore
    private void updateGame(Game game) throws ExecutionException, InterruptedException {
        // Update in-memory cache
        activeGames.put(game.getId(), game);
        
        // Update in Firestore
        DocumentReference docRef = firestore.collection("games").document(game.getId());
        ApiFuture<WriteResult> result = docRef.set(game);
        result.get(); // Wait for write to complete
    }
}
