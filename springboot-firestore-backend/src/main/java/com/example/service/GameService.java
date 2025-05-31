package com.example.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.model.Game;
import com.example.model.GameAction;
import com.example.model.Player;
import com.example.model.Room;
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
    
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(GameService.class);

    @Autowired
    public GameService(Firestore firestore) {
        this.firestore = firestore;
        logger.info("GameService initialized with Firestore dependency");
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

        logger.info("Game created: {}", game.getId());
        return game;
    }

    // 🏠 Create game from room data
    public Game createRoomGame(Room room) throws ExecutionException, InterruptedException {
        logger.info("Creating game for room: {}", room.getRoomId());
        
        // Create players from room data
        Player player1 = new Player(room.getHostId(), room.getHostName());
        Player player2 = new Player(room.getGuestId(), room.getGuestName());
        
        // Create and configure the game
        Game game = new Game(player1, player2);
        game.setStatus("running");

        // Initial positions
        player1.setX(0);
        player1.setY(0);
        player2.setX(CANVAS_WIDTH - PLAYER_WIDTH);
        player2.setY(0);

        // Store in memory and Firestore
        activeGames.put(game.getId(), game);
        firestore.collection("games").document(game.getId()).set(game).get();

        logger.info("Room game created: {} for room: {}", game.getId(), room.getRoomId());
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

        // Вычисляем урон в зависимости от типа атаки
        int damage = ATTACK_DAMAGE;
        if ("attack2".equals(attackType)) {
            damage = ATTACK_DAMAGE + 5; // Усиленная атака
        }
        
        // Проверяем расстояние между игроками для определения попадания
        int attackerX = attacker.getX();
        int defenderX = defender.getX();
        int distance = Math.abs(attackerX - defenderX);
        
        // Дистанция атаки (половина ширины персонажа + небольшое расстояние)
        int attackRange = PLAYER_WIDTH / 2 + 50;
        
        // Проверяем, что атакующий повернут в сторону защищающегося
        boolean facingRight = "right".equals(attacker.getFacing());
        boolean defenderIsRight = attackerX < defenderX;
        
        boolean canHit = distance <= attackRange && (facingRight == defenderIsRight);
        
        // Логгирование для отладки
        logger.debug("Attack info - Attacker: {} Facing: {} Position: {} Defender position: {} Distance: {} Range: {} Can hit: {}",
                    attacker.getId(), attacker.getFacing(), attackerX, defenderX, distance, attackRange, canHit);
        
        // Если можем попасть, наносим урон
        if (canHit || true) { // Убрать "|| true" когда захотите включить точный расчет попаданий
            int newHealth = Math.max(0, defender.getHealth() - damage);
            logger.debug("Damage calculation: current health={} damage={} new health={}", 
                        defender.getHealth(), damage, newHealth);
            defender.setHealth(newHealth);
            defender.setCurrentAnimation("getHit");
            
            logger.debug("Defender health after hit: {}", defender.getHealth());
        } else {
            logger.debug("Attack missed!");
        }
    }

    // 💾 Save to Firestore and update cache
    private void updateGame(Game game) throws ExecutionException, InterruptedException {
        activeGames.put(game.getId(), game);
        firestore.collection("games").document(game.getId()).set(game).get();
    }
}
