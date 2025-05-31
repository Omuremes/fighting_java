import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SpritesProvider } from './contexts/SpritesContext';
import Login from './pages/Login';
import Menu from './pages/Menu';
import OnlineRoom from './pages/OnlineRoom';
import GameScreen from './pages/GameScreen';
import OnlineGameScreen from './pages/OnlineGameScreen';
import Shop from './pages/Shop';
import webSocketService from './services/WebSocketService';

function App() {
  // Initialize WebSocket connection when the app starts
  useEffect(() => {
    // Try to establish WebSocket connection
    webSocketService.connect()
      .then(() => {
        console.log('%c[App] WebSocket connection initialized', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;');
      })
      .catch(error => {
        console.error('%c[App] WebSocket initial connection failed', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 2px;', error);
      });
    
    // Clean up WebSocket connection on app unmount
    return () => {
      webSocketService.disconnect();
    };
  }, []);

  return (
    <AuthProvider>
      <SpritesProvider>
        <Router>
          <Routes>
            {/* Страницы аутентификации и меню */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Menu />} />
            <Route path="/shop" element={<Shop />} />

            {/* Игровые режимы */}
            <Route path="/game/single-player" element={<GameScreen />} />
            <Route path="/game/two-players" element={<GameScreen />} />            {/* Онлайн режим */}
            <Route path="/game/online/host/:roomCode" element={<OnlineRoom />} />
            <Route path="/game/online/join/:roomCode" element={<OnlineRoom />} />
            <Route path="/game/online/play/:roomCode" element={<OnlineGameScreen />} />
            
            {/* Перенаправление по умолчанию */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </SpritesProvider>
    </AuthProvider>
  );
}

export default App;
