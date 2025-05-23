import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import GameCanvas from './components/GameCanvas';
import Login from './pages/Login';
import Menu from './pages/Menu';
import OnlineRoom from './pages/OnlineRoom';
import GameScreen from './pages/GameScreen';

function App() {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gameId, setGameId] = useState(null);

  const fetchGameState = useCallback(() => {
    if (!gameId) return;
    
    setLoading(true);    fetch(`/api/games/${gameId}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP status ${res.status}`);
        }
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Expected JSON but got ${contentType}`);
        }
        return res.json();
      })
      .then(data => setGameState(data))
      .catch(err => {
        console.error("Fetch game error:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [gameId]);
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

    fetch('/api/games/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(newGame)    })
    .then(res => {
      if (!res.ok) {
        // Если ошибка 405, пробуем альтернативный URL
        if (res.status === 405) {
          console.log("Trying alternative URL: /games/");
          return fetch('/games/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(newGame)
          }).then(alternativeRes => {
            if (!alternativeRes.ok) {
              throw new Error(`HTTP status ${alternativeRes.status}`);
            }
            
            const contentType = alternativeRes.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              throw new Error(`Expected JSON but got ${contentType || 'unknown'}`);
            }
            
            return alternativeRes.json();
          });
        }
        throw new Error(`HTTP status ${res.status}`);
      }      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON but got ${contentType || 'unknown'}`);
      }
      return res.json();
    })
    .then(data => {
      setGameId(data.id);
      setGameState(data);
    })
    .catch(err => {
      console.error("Game creation error:", err);
      setError(err.message)
    })
    .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!gameId) {
      createNewGame();
    } else {
      fetchGameState();
    }
  }, [gameId, fetchGameState, createNewGame]);
  const sendPlayerAction = (playerId, actionType, direction = null, attackType = null) => {
    if (!gameId) return;

    const action = {
      gameId: gameId,
      playerId: playerId,
      actionType: actionType,
      direction: direction,
      attackType: attackType
    };
    
    console.log("Отправка действия на сервер:", action);
    
    fetch('/api/games/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(action)
    })
    .then(res => {
      if (!res.ok) {
        if (res.status === 405) {
          console.log("Trying alternative URL for action: /games/action");
          return fetch('/games/action', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(action)
          }).then(alternativeRes => {
            if (!alternativeRes.ok) {
              throw new Error(`Failed to process action: ${alternativeRes.status}`);
            }
            
            const contentType = alternativeRes.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              throw new Error(`Expected JSON but got ${contentType || 'unknown'}`);
            }
            
            return alternativeRes.json();
          });
        }
        throw new Error(`Failed to process action: ${res.status}`);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON but got ${contentType || 'unknown'}`);
      }
      return res.json();
    })
    .then(data => {
      console.log("Получен ответ от сервера:", data);
      setGameState(data);
    })
    .catch(err => console.error('Error sending action:', err));
  };  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Компонент игры */}
          <Route path="/game" element={
            <div className="bg-gray-900 h-screen flex flex-col items-center justify-center">
              {loading && <div className="absolute top-4 left-4 text-white bg-blue-600 px-4 py-2 rounded-lg">Loading...</div>}
              {error && <div className="absolute top-4 left-4 text-white bg-red-600 px-4 py-2 rounded-lg">Error: {error}</div>}
              {gameState && (
                <div className="absolute top-4 right-4 bg-gray-800 p-4 rounded-lg text-white">
                  <h2 className="text-lg font-bold mb-2">Game Status: {gameState?.status || 'Unknown'}</h2>
                  <p>Round: {gameState?.round || 1}</p>
                  <div className="flex justify-between mt-2">
                    <div>
                      <p>Player 1: {gameState?.player1?.wins || 0} wins</p>
                      <p>Health: {gameState?.player1?.health || 100}</p>
                    </div>
                    <div className="ml-8">
                      <p>Player 2: {gameState?.player2?.wins || 0} wins</p>
                      <p>Health: {gameState?.player2?.health || 100}</p>
                    </div>
                  </div>
                  {gameState?.status === "finished" && (
                    <div className="mt-4">
                      <p className="font-bold text-yellow-400">Winner: {gameState?.winner || 'Unknown'}</p>
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
          } />
          
          {/* Страницы аутентификации и меню */}
          <Route path="/login" element={<Login />} />
          <Route path="/menu" element={<Menu />} />
          
          {/* Игровые режимы */}
          <Route path="/game/single-player" element={<GameScreen mode="single-player" />} />
          <Route path="/game/two-players" element={<GameScreen mode="two-players" />} />
          
          {/* Онлайн режим */}
          <Route path="/game/online/host/:roomCode" element={<OnlineRoom isHost={true} />} />
          <Route path="/game/online/join/:roomCode" element={<OnlineRoom isHost={false} />} />
          <Route path="/game/online/play/:roomCode" element={<GameScreen mode="online" />} />
          
          {/* Перенаправления */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
