import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Menu = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [gameMode, setGameMode] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  useEffect(() => {
    // Проверяем авторизацию
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const handleStartSinglePlayer = () => {
    // Начать игру против компьютера
    navigate('/game/single-player');
  };

  const handleStartTwoPlayers = () => {
    // Начать игру для двух игроков на одном устройстве
    navigate('/game/two-players');
  };

  const handleCreateRoom = () => {
    // Генерируем случайный код комнаты
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/game/online/host/${newRoomCode}`);
  };

  const handleJoinRoom = () => {
    if (roomCode) {
      navigate(`/game/online/join/${roomCode}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };
  const renderGameModeSelection = () => {
    return (
      <div className="grid grid-cols-1 gap-6 mt-8">
        <button
          onClick={() => setGameMode('single-player')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-8 rounded-lg text-xl transition-colors"
        >
          Игра против компьютера
        </button>
        <button
          onClick={() => setGameMode('two-players')}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-8 rounded-lg text-xl transition-colors"
        >
          Игра на двоих (локальная)
        </button>
        <button
          onClick={() => setGameMode('online')}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 px-8 rounded-lg text-xl transition-colors"
        >
          Онлайн игра (рейтинговая)
        </button>
      </div>
    );
  };

  const renderGameOptions = () => {
    if (gameMode === 'single-player') {
      return (
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold text-white">Игра против компьютера</h2>
          <p className="text-gray-300">Сразитесь с компьютерным противником</p>
          <button
            onClick={handleStartSinglePlayer}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-colors"
          >
            Начать игру
          </button>
          <button
            onClick={() => setGameMode(null)}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Назад
          </button>
        </div>
      );
    } else if (gameMode === 'two-players') {
      return (
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold text-white">Игра на двоих</h2>
          <p className="text-gray-300">Играйте на одном устройстве с другом</p>
          <button
            onClick={handleStartTwoPlayers}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors"
          >
            Начать игру
          </button>
          <button
            onClick={() => navigate('/game')}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-6 rounded-lg transition-colors"
          >
            Классический режим
          </button>
          <button
            onClick={() => setGameMode(null)}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Назад
          </button>
        </div>
      );
    } else if (gameMode === 'online') {
      return (
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold text-white">Онлайн игра</h2>
          
          {isJoiningRoom ? (
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <label htmlFor="roomCode" className="block text-white text-sm font-medium mb-2">
                  Код комнаты
                </label>
                <input
                  type="text"
                  id="roomCode"
                  className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Введите код комнаты"
                  maxLength={6}
                />
              </div>
              <button
                onClick={handleJoinRoom}
                disabled={!roomCode}
                className={`w-full ${
                  roomCode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-900 cursor-not-allowed'
                } text-white font-bold py-3 px-6 rounded-lg transition-colors`}
              >
                Присоединиться к комнате
              </button>
              <button
                onClick={() => setIsJoiningRoom(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Назад
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleCreateRoom}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors"
              >
                Создать комнату
              </button>
              <button
                onClick={() => setIsJoiningRoom(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors"
              >
                Присоединиться к комнате
              </button>          <button
                onClick={() => setGameMode(null)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Назад
              </button>
            </div>
          )}
        </div>
      );
    } 
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 py-4 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Файтинг-игра</h1>
        <div className="flex items-center space-x-4">
          {currentUser && (
            <>
              <div className="text-right">
                <p className="font-medium">{currentUser.name}</p>
                <p className="text-sm text-gray-400">
                  Рейтинг: {currentUser.rating || 0} ({currentUser.rank || 'Бронза'})
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md text-sm transition-colors"
              >
                Выйти
              </button>
            </>
          )}
        </div>
      </header>
      
      <main className="flex-1 container mx-auto max-w-3xl py-12 px-6 text-center">
        <h1 className="text-4xl font-extrabold mb-6">Выберите режим игры</h1>
        
        {gameMode ? renderGameOptions() : renderGameModeSelection()}
      </main>
      
      <footer className="bg-gray-800 py-4 px-6 text-center text-gray-400">
        <p>&copy; 2025 Fighting Game. Все права защищены.</p>
      </footer>
    </div>
  );
};

export default Menu;