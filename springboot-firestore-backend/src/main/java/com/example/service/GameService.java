package com.example.service;

import java.util.*;
import java.util.concurrent.ExecutionException;

import org.springframework.stereotype.Service;

import com.example.model.Game;
import com.example.model.GameAction;
import com.example.model.Player;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;

@Service
public class GameService {

    private final Firestore firestore;
    private final Map<String, Game> activeGames = new HashMap<>(); // In-memory cache

    // Constants for game mechanics
    private static final int MOVE_SPEED = 8;
    private static final int ATTACK_DAMAGE = 10;
    private static final int CANVAS_WIDTH = 1200;
    private static final int PLAYER_WIDTH = 500;

    public GameService(Firestore firestore) {
        this.firestore = firestore;
    }

    // 🎮 Create new game
    public Game createGame(Player player1, Player player2) throws ExecutionException, InterruptedException {
        Game game = new Game(player1, player2);
        game.setStatus("running");

        // Initial positions
        player1.setX(0);
        player2.setX(CANVAS_WIDTH - PLAYER_WIDTH);

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

        if (game == null || !"running".equals(game.getStatus())) return null;

        Player player, opponent;

        if (action.getPlayerId().equals(game.getPlayer1().getId())) {
            player = game.getPlayer1();
            opponent = game.getPlayer2();
        } else if (action.getPlayerId().equals(game.getPlayer2().getId())) {
            player = game.getPlayer2();
            opponent = game.getPlayer1();
        } else {
            return null; // Invalid player
        }

        switch (action.getActionType()) {
            case "move":
                handleMoveAction(player, action.getDirection());
                break;
            case "attack":
                handleAttackAction(player, opponent, action.getAttackType());
                break;
            case "jump":
                player.setCurrentAnimation("jump");
                break;
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
            player.setX(Math.min(CANVAS_WIDTH - PLAYER_WIDTH, player.getX() + MOVE_SPEED));
            player.setFacing("right");
            player.setCurrentAnimation("run");
        }
    }

    // 🥊 Attack logic
    private void handleAttackAction(Player attacker, Player defender, String attackType) {
        attacker.setAttacking(true);
        attacker.setCurrentAnimation(attackType);

        // Для отладки
        System.out.println("Attack! Attacker: " + attacker.getId() + ", Facing: " + attacker.getFacing() + 
                          ", Position: " + attacker.getX() + ", Defender position: " + defender.getX());

        // Упрощенная логика попадания - всегда наносим урон
        int newHealth = Math.max(0, defender.getHealth() - ATTACK_DAMAGE);
        System.out.println("Damage calculation: current health=" + defender.getHealth() + 
                          ", damage=" + ATTACK_DAMAGE + ", new health=" + newHealth);
        defender.setHealth(newHealth);
        defender.setCurrentAnimation("getHit");
        
        System.out.println("Defender health after hit: " + defender.getHealth());
    }

    // 💾 Save to Firestore and update cache
    private void updateGame(Game game) throws ExecutionException, InterruptedException {
        activeGames.put(game.getId(), game);
        firestore.collection("games").document(game.getId()).set(game).get();
    }
}
