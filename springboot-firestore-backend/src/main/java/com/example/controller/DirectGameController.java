package com.example.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.model.Game;
import com.example.model.GameAction;
import com.example.model.Player;
import com.example.service.GameService;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/games")
@CrossOrigin(
    origins = "http://localhost:3000",
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS},
    allowedHeaders = "*",
    allowCredentials = "true"
)
public class DirectGameController {

    @Autowired
    private GameService gameService;

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(DirectGameController.class);

    @PostMapping({"", "/"})
    public ResponseEntity<Game> createGame(@RequestBody Map<String, Map<String, String>> request) {
        logger.info("=== Request received on /games ===");
        try {
            Map<String, String> player1Data = request.get("player1");
            Map<String, String> player2Data = request.get("player2");

            if (player1Data == null || player2Data == null) {
                logger.warn("Missing player data in request");
                return ResponseEntity.badRequest().build();
            }

            Player player1 = new Player(player1Data.get("id"), player1Data.get("name"));
            Player player2 = new Player(player2Data.get("id"), player2Data.get("name"));            
            Game game = gameService.createGame(player1, player2);
            logger.info("Game created with ID: {}", game.getId());

            return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(game);
        } catch (Exception e) {
            logger.error("Failed to create game: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
        }
    }
    
    @PostMapping({"/action", "/action/"})
    public ResponseEntity<Game> processAction(@RequestBody GameAction action) {
        logger.info("=== Processing action on /games/action ===");
        logger.info("Action details: gameId={}, playerId={}, type={}", 
                  action.getGameId(), action.getPlayerId(), action.getType());
        
        try {
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
    
    @GetMapping("/{id}")
    public ResponseEntity<Game> getGame(@PathVariable("id") String id) {
        logger.info("=== Getting game on /games/{} ===", id);
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
}