import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CharacterSelect from '../components/CharacterSelect';

const Menu = () => {
  const { currentUser, logout, createRoom, getRoomData } = useAuth();
  const navigate = useNavigate();
  const [gameMode, setGameMode] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [hostIp, setHostIp] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [pendingGameMode, setPendingGameMode] = useState(null);
  const [selectingPlayerNumber, setSelectingPlayerNumber] = useState(1); // Какой игрок выбирает персонажа (1 или 2)
  const [player1Character, setPlayer1Character] = useState(null); // Персонаж первого иг��ока
  const [player2Character, setPlayer2Character] = useState(null); // Персонаж второго игрока

  useEffect(() => {
    // Проверяем авторизацию
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);
  const handleStartSinglePlayer = () => {
    // Показываем выбор персонажа перед началом игры
    setPendingGameMode('single-player');
    setShowCharacterSelect(true);
  };
  const handleStartTwoPlayers = () => {
    // Показываем выбор персонажа перед началом игры
    setPendingGameMode('two-players');
    setShowCharacterSelect(true);
  };
  
  const handleCharacterSelect = async (character) => {
    if (pendingGameMode === 'two-players') {
      // Для двух игроков на одном устройстве
      if (selectingPlayerNumber === 1) {
        // Сохраняем выбор первого игрока и переходим к выбору второго
        const firstPlayer = {
          ...character,
          spritePath: `/assets/${character.id}/Sprites/`
        };
        setPlayer1Character(firstPlayer);
        setSelectingPlayerNumber(2);
        return; // Не закрываем окно выбора, продолжаем для второго игрока
      } else {
        // Сохраняем выбор второго игрока
        const secondPlayer = {
          ...character,
          spritePath: `/assets/${character.id}/Sprites/`
        };
        setPlayer2Character(secondPlayer);
        setSelectingPlayerNumber(1); // Сбрасываем для следующего раза
        setShowCharacterSelect(false);
        
        // Переходим к игре с выбранными персонажами для обоих игроков
        navigate('/game/two-players', { 
          state: { 
            player1Character: player1Character,
            player2Character: secondPlayer 
          } 
        });
        return;
      }
    }
    
    // Для других режимов (одиночной игры или онлайн)
    setSelectedCharacter(character);
    setShowCharacterSelect(false);
    
    // Переходим к игре с выбранным персонажем
    if (pendingGameMode === 'single-player') {
      navigate('/game/single-player', { state: { character } });
    } else if (pendingGameMode === 'online') {
      // Для онлайн режима создаем комнату с информацией о выбранном персонаже в Firebase
      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      try {
        await createRoom(
          newRoomCode, 
          currentUser.uid, 
          currentUser.name || currentUser.email, 
          character
        );
        
        // Переходим в комнату с созданным кодом
        navigate(`/game/online/host/${newRoomCode}`, { 
          state: { 
            character,
            isHost: true 
          } 
        });
      } catch (error) {
        console.error('Error creating room:', error);
        alert('Ошибка при создании комнаты. Пожалуйста, попробуйте еще раз.');
      }
    } else if (pendingGameMode === 'join-room') {
      // Для присоединения к комнате
      try {
        // Переходим в комнату с выбранным персонажем и IP хоста
        navigate(`/game/online/join/${roomCode}`, { 
          state: { 
            character,
            isHost: false,
            hostIp: hostIp // Передаем IP хоста для подключения
          } 
        });
      } catch (error) {
        console.error('Error joining room:', error);
        alert('Ошибка при присоединении к комнате. Пожалуйста, проверьте код комнаты и IP адрес хоста, затем попробуйте еще раз.');
      }
    }
  };

  const handleCreateRoom = () => {
    // Показываем выбор персонажа перед созданием комнаты
    setPendingGameMode('online');
    setShowCharacterSelect(true);
  };
  
  const handleJoinRoom = async () => {
    if (roomCode) {
      try {
        // Проверяем существование комнаты перед выбором персонажа
        const roomData = await getRoomData(roomCode);
        
        if (!roomData) {
          alert('Комната не найдена. Проверьте код комнаты и попробуйте еще раз.');
          return;
        }
        
        if (roomData.status !== 'waiting') {
          alert('Невозможно присоединиться к комнате. Игра уже началась или комната закрыта.');
          return;
        }
        
        // Показываем выбор персонажа перед присоединением к комнате
        setPendingGameMode('join-room');
        setShowCharacterSelect(true);
      } catch (error) {
        console.error('Error checking room:', error);
        alert('Ошибка при проверке комнаты. Пожалуйста, попробуйте еще раз.');
      }
    } else {
      alert('Пожалуйста, введите код комнаты.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };  const renderGameModeSelection = () => {
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
        <button
          onClick={() => navigate('/shop')}
          className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-6 px-8 rounded-lg text-xl transition-colors"
        >
          Магазин
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
      );    } else if (gameMode === 'online') {
      return (
        <div className="mt-8 space-y-6">
          <h2 className="text-2xl font-bold text-white">Онлайн игра</h2>
          
          <div className="bg-blue-900 p-4 rounded-lg">
            <h3 className="font-semibold text-white text-lg mb-2">Локальное подключение</h3>
            <p className="text-gray-300 text-sm">
              Для игры по локальной сети один игрок создает комнату, а второй подключается к ней, 
              используя код комнаты и IP-адрес хоста.
            </p>
          </div>
          
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
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <label htmlFor="hostIp" className="block text-white text-sm font-medium mb-2">
                  IP адрес хоста (локальный)
                </label>
                <input
                  type="text"
                  id="hostIp"
                  className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  onChange={(e) => setHostIp(e.target.value)}
                  placeholder="Например: 192.168.1.100"
                />
                <p className="mt-2 text-sm text-gray-400">
                  Введите локальный IP-адрес компьютера, на котором создана комната
                </p>
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
              </button>              <button
                onClick={() => setIsJoiningRoom(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-colors"
              >
                Присоединиться к комнате
              </button>
              <button
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
  };  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 py-4 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Файтинг-игра</h1>
        <div className="flex items-center space-x-4">
          {currentUser && (
            <>              <div className="flex items-center mr-4" onClick={() => navigate('/shop')} style={{ cursor: 'pointer' }}>
                <div className="flex items-center bg-yellow-700 px-3 py-1 rounded-md mr-2 hover:bg-yellow-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  <span className="text-yellow-400 font-bold">{currentUser.coin || 0}</span>
                </div>
                <div className="flex items-center bg-purple-900 px-3 py-1 rounded-md hover:bg-purple-800 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  <span className="text-purple-400 font-bold">{currentUser.gem || 0}</span>
                </div>
                <div className="ml-1 text-xs text-gray-400">Нажмите для перехода в магазин</div>
              </div>
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
        </div>      </header>
      
      <main className="flex-1 container mx-auto max-w-3xl py-12 px-6 text-center">
        {showCharacterSelect ? (
          <>
            {pendingGameMode === 'two-players' && (
              <div className="bg-gray-700 p-3 rounded-lg mb-4 flex justify-between items-center">
                <div className={`flex items-center ${selectingPlayerNumber === 1 ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2">1</span>
                  <span>Игрок 1 {player1Character ? `(${player1Character.name})` : ''}</span>
                </div>
                <div className="mx-2 text-gray-400">→</div>
                <div className={`flex items-center ${selectingPlayerNumber === 2 ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
                  <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2">2</span>
                  <span>Игрок 2 {player2Character ? `(${player2Character.name})` : ''}</span>
                </div>
              </div>
            )}
            <CharacterSelect 
              onSelectCharacter={handleCharacterSelect}
              onCancel={() => setShowCharacterSelect(false)}
              playerNumber={pendingGameMode === 'two-players' ? selectingPlayerNumber : null}
            />
          </>
        ) : (
          <>
            <h1 className="text-4xl font-extrabold mb-6">Выберите режим игры</h1>
            {gameMode ? renderGameOptions() : renderGameModeSelection()}
          </>
        )}
      </main>
      
      <footer className="bg-gray-800 py-4 px-6 text-center text-gray-400">
        <p>&copy; 2025 Fighting Game. Все права защищены.</p>
      </footer>
    </div>
  );
};

export default Menu;