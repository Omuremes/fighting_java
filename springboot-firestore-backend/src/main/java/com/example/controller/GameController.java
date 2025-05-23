package com.example.controller;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.example.model.Game;
import com.example.model.GameAction;
import com.example.model.Player;
import com.example.service.GameService;

@RestController
@RequestMapping("/api/games")
@CrossOrigin(
    origins = "http://localhost:3000",
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS},
    allowedHeaders = "*",
    allowCredentials = "true"
)
public class GameController {

    @Autowired
    private GameService gameService;

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(GameController.class);

    // ✅ Создание новой игры
    @PostMapping({"", "/"})
    public ResponseEntity<Game> createGame(@RequestBody Map<String, Map<String, String>> request) {
        try {
            logger.info("=== Creating New Game ===");
            logger.debug("Request body: {}", request);

            Map<String, String> player1Data = request.get("player1");
            Map<String, String> player2Data = request.get("player2");

            if (player1Data == null || player2Data == null) {
                logger.warn("Missing player data in request");
                return ResponseEntity.badRequest().build();
            }

            Player player1 = new Player(player1Data.get("id"), player1Data.get("name"));
            Player player2 = new Player(player2Data.get("id"), player2Data.get("name"));            Game game = gameService.createGame(player1, player2);
            logger.info("Game created with ID: {}", game.getId());

            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(game);
        } catch (Exception e) {
            logger.error("Failed to create game", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Get a game by ID
    @GetMapping("/{id}")
    public ResponseEntity<Game> getGame(@PathVariable("id") String id) {
        try {
            Game game = gameService.getGame(id);
            if (game == null) {
                logger.warn("Game not found: {}", id);
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(game);
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error retrieving game", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ✅ Получение всех игр
    @GetMapping    public ResponseEntity<List<Game>> getAllGames() {
        try {
            List<Game> games = gameService.getAllGames();
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(games);
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error retrieving all games", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ✅ Обработка действий игрока
    @PostMapping({"/action", "/action/"})    public ResponseEntity<Game> processAction(@RequestBody GameAction action) {
        try {
            logger.info("=== Processing Action ===");
            logger.info("Action details: gameId={}, playerId={}, actionType={}, direction={}, attackType={}", 
                      action.getGameId(), action.getPlayerId(), action.getActionType(), 
                      action.getDirection(), action.getAttackType());
            
            Game updatedGame = gameService.processAction(action);
            
            if (updatedGame == null) {
                logger.warn("Invalid action or game not found");
                return ResponseEntity.badRequest().build();
            }
            
            // Логируем информацию о здоровье игроков после обработки действия
            logger.info("Updated game state: player1.health={}, player2.health={}, round={}", 
                      updatedGame.getPlayer1().getHealth(), 
                      updatedGame.getPlayer2().getHealth(),
                      updatedGame.getRound());
            
            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(updatedGame);
        } catch (ExecutionException | InterruptedException e) {
            logger.error("Error processing action", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
