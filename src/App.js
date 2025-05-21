import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';

function App() {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gameId, setGameId] = useState(null);

  // Fetch current game state
  const fetchGameState = useCallback(() => {
    if (!gameId) return;
    
    setLoading(true);
    fetch(`http://localhost:8082/api/games/${gameId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch game state');
        return res.json();
      })
      .then(data => setGameState(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [gameId]);

  // Create a new game with two players
  const createNewGame = useCallback(() => {
    setLoading(true);
    setError(null);
    
    const newGame = {
      player1: {
        id: "player1",
        name: "Player 1"
      },
      player2: {
        id: "player2",
        name: "Player 2"
      }
    };
    
    fetch('http://localhost:8082/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newGame)
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to create game');
      return res.json();
    })
    .then(data => {
      setGameId(data.id);
      setGameState(data);
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
  }, []);

  // Fetch current game or create new game on component mount
  useEffect(() => {
    if (!gameId) {
      createNewGame();
    } else {
      fetchGameState();
    }
  }, [gameId, fetchGameState, createNewGame]);

  // Send player action to backend
  const sendPlayerAction = (playerId, actionType, direction = null, attackType = null) => {
    if (!gameId) return;
    
    const action = {
      gameId: gameId,
      playerId: playerId,
      actionType: actionType,
      direction: direction,
      attackType: attackType
    };
    
    fetch('http://localhost:8082/api/games/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(action)
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to process action');
      return res.json();
    })
    .then(data => setGameState(data))
    .catch(err => console.error('Error sending action:', err));
  };

  return (
    <div className="bg-gray-900 h-screen flex flex-col items-center justify-center">
      {loading && <div className="absolute top-4 left-4 text-white bg-blue-600 px-4 py-2 rounded-lg">Loading...</div>}
      {error && <div className="absolute top-4 left-4 text-white bg-red-600 px-4 py-2 rounded-lg">Error: {error}</div>}
      
      {gameState && (
        <div className="absolute top-4 right-4 bg-gray-800 p-4 rounded-lg text-white">
          <h2 className="text-lg font-bold mb-2">Game Status: {gameState.status}</h2>
          <p>Round: {gameState.round}</p>
          <div className="flex justify-between mt-2">
            <div>
              <p>Player 1: {gameState.player1.wins} wins</p>
              <p>Health: {gameState.player1.health}</p>
            </div>
            <div className="ml-8">
              <p>Player 2: {gameState.player2.wins} wins</p>
              <p>Health: {gameState.player2.health}</p>
            </div>
          </div>
          {gameState.status === "finished" && (
            <div className="mt-4">
              <p className="font-bold text-yellow-400">Winner: {gameState.winner}</p>
              <button 
                onClick={createNewGame}
                className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg w-full"
              >
                New Game
              </button>
            </div>
          )}
        </div>
      )}
      
      <GameCanvas 
        gameState={gameState} 
        onPlayerAction={sendPlayerAction} 
      />
    </div>
  );
}

export default App;
