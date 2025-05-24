import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SpritesProvider } from './contexts/SpritesContext';
import Login from './pages/Login';
import Menu from './pages/Menu';
import OnlineRoom from './pages/OnlineRoom';
import GameScreen from './pages/GameScreen';

function App() {
  return (
    <AuthProvider>
      <SpritesProvider>
        <Router>
          <Routes>
            {/* Страницы аутентификации и меню */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Menu />} />

            {/* Игровые режимы */}
            <Route path="/game/single-player" element={<GameScreen />} />
            <Route path="/game/two-players" element={<GameScreen />} />

            {/* Онлайн режим */}
            <Route path="/game/online/host/:roomCode" element={<OnlineRoom isHost={true} />} />
            <Route path="/game/online/join/:roomCode" element={<OnlineRoom isHost={false} />} />
            <Route path="/game/online/play/:roomCode" element={<GameScreen />} />

            {/* Перенаправление по умолчанию */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </SpritesProvider>
    </AuthProvider>
  );
}

export default App;
