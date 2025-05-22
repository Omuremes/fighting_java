package com.example.controller;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.model.Game;
import com.example.model.GameAction;
import com.example.model.Player;
import com.example.service.GameService;

@RestController
@RequestMapping("/api/games")
public class GameController {

    @Autowired
    private GameService gameService;
    
    // Create a new game
    @PostMapping
    public ResponseEntity<Game> createGame(@RequestBody Map<String, Player> players) {
        try {
            Player player1 = players.get("player1");
            Player player2 = players.get("player2");
            
            if (player1 == null || player2 == null) {
                return ResponseEntity.badRequest().build();
            }
            
            Game game = gameService.createGame(player1, player2);
            return ResponseEntity.ok(game);
        } catch (ExecutionException | InterruptedException e) {
            return ResponseEntity.status(500).build();
        }
    }
    
    // Get a game by ID
    @GetMapping("/{id}")
    public ResponseEntity<Game> getGame(@PathVariable("id") String id) {
        try {
            Game game = gameService.getGame(id);
            if (game == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(game);
        } catch (ExecutionException | InterruptedException e) {
            return ResponseEntity.status(500).build();
        }
    }
    
    // Get all games
    @GetMapping
    public ResponseEntity<List<Game>> getAllGames() {
        try {
            List<Game> games = gameService.getAllGames();
            return ResponseEntity.ok(games);
        } catch (ExecutionException | InterruptedException e) {
            return ResponseEntity.status(500).build();
        }
    }
    
    // Submit a player action
    @PostMapping("/action")
    public ResponseEntity<Game> processAction(@RequestBody GameAction action) {
        try {
            Game game = gameService.processAction(action);
            if (game == null) {
                return ResponseEntity.badRequest().build();
            }
            return ResponseEntity.ok(game);
        } catch (ExecutionException | InterruptedException e) {
            return ResponseEntity.status(500).build();
        }
    }
}
