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
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QuerySnapshot;

@Service
public class GameService {

    private final Firestore firestore;
    private final Map<String, Game> activeGames = new HashMap<>(); // In-memory cache

    // Constants for game mechanics
    private static final int MOVE_SPEED = 8;
    private static final int ATTACK_DAMAGE = 10;
    private static final int CANVAS_WIDTH = 1200;
    private static final int PLAYER_WIDTH = 500;
    private static final int ATTACK_RANGE = 250; // Attack range in pixels

    public GameService(Firestore firestore) {
        this.firestore = firestore;
    }

    // 🎮 Create new game
    public Game createGame(Player player1, Player player2) throws ExecutionException, InterruptedException {
        Game game = new Game(player1, player2);
        game.setStatus("running");
        
        // Set player dimensions
        player1.setWidth(PLAYER_WIDTH);
        player2.setWidth(PLAYER_WIDTH);
        
        // Initialize player positions
        player1.setX(0);
        player2.setX(CANVAS_WIDTH - PLAYER_WIDTH);
        
        // Initialize player facing directions
        player1.setFacing("right");
        player2.setFacing("left");
        
        // Store in memory and Firestore
        activeGames.put(game.getId(), game);
        firestore.collection("games").document(game.getId()).set(game).get();

        return game;
    }

    // 📦 Get game by ID
    public Game getGame(String gameId) throws ExecutionException, InterruptedException {
        if (activeGames.containsKey(gameId)) {
            return activeGames.get(gameId);
        }

        DocumentReference docRef = firestore.collection("games").document(gameId);
        DocumentSnapshot document = docRef.get().get();

        if (document.exists()) {
            Game game = document.toObject(Game.class);
            activeGames.put(gameId, game);
            return game;
        }

        return null;
    }

    // 📋 Get all games
    public List<Game> getAllGames() throws ExecutionException, InterruptedException {
        List<Game> games = new ArrayList<>();
        QuerySnapshot querySnapshot = firestore.collection("games").get().get();

        for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
            games.add(doc.toObject(Game.class));
        }

        return games;
    }

    // ⚔️ Process player action
    public Game processAction(GameAction action) throws ExecutionException, InterruptedException {
        Game game = getGame(action.getGameId());
        if (game == null) {
            throw new IllegalArgumentException("Game not found: " + action.getGameId());
        }

        String playerId = game.getPlayerId(action.getPlayerId());
        if (playerId == null) {
            throw new IllegalArgumentException("Invalid player ID: " + action.getPlayerId());
        }

        Player player = playerId.equals("player1") ? game.getPlayer1() : game.getPlayer2();
        Player opponent = playerId.equals("player1") ? game.getPlayer2() : game.getPlayer1();

        switch (action.getActionType()) {
            case "move" -> handleMoveAction(player, action.getDirection());
            case "attack" -> handleAttackAction(player, opponent, action.getAttackType());
            case "jump" -> player.setCurrentAnimation("jump");
        }

        // Round logic
        if (game.isGameOver()) {
            game.nextRound();

            if (game.getPlayer1().getWins() >= 2) {
                game.setStatus("finished");
                game.setWinner(game.getPlayer1().getName());
            } else if (game.getPlayer2().getWins() >= 2) {
                game.setStatus("finished");
                game.setWinner(game.getPlayer2().getName());
            }
        }

        updateGame(game);
        return game;
    }

    // ⬅️➡️ Move logic
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

    // 🥊 Attack logic
    private void handleAttackAction(Player attacker, Player defender, String attackType) {
        attacker.setAttacking(true);
        attacker.setCurrentAnimation(attackType);

        System.out.println("Attack! Attacker: " + attacker.getId() + ", Facing: " + attacker.getFacing() + 
                          ", Position: " + attacker.getX() + ", Defender position: " + defender.getX());
        
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
        System.out.println("Defender health after hit: " + defender.getHealth());
    }

    // 💾 Save to Firestore and update cache
    private void updateGame(Game game) throws ExecutionException, InterruptedException {
        activeGames.put(game.getId(), game);
        firestore.collection("games").document(game.getId()).set(game).get();
    }
}
