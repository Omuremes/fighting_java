import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CharacterSelect from '../components/CharacterSelect';

const OnlineRoom = ({ isHost }) => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  
  // Получение выбранного персонажа из state навигации
  useEffect(() => {
    if (location.state?.character) {
      setSelectedCharacter(location.state.character);
      // Если персонаж уже выбран, считаем пользователя готовым к игре
      setIsReady(true);
    } else if (isHost) {
      // Если хост не выбрал персонажа, показываем экран выбора
      setShowCharacterSelect(true);
    }
  }, [location.state, isHost]);
  
  useEffect(() => {
    // В реальном приложении здесь будет код для подключения к онлайн комнате
    // через WebSocket или Firebase Realtime Database
    
    // Имитация получения статуса готовности оппонента через 3 секунды
    const timer = setTimeout(() => {
      if (isReady) {
        setOpponentReady(true);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [isReady]);
  
  useEffect(() => {
    // Когда оба игрока готовы, переходим к игре
    if (isReady && opponentReady) {
      navigate(`/game/online/play/${roomCode}`, { 
        state: { character: selectedCharacter } 
      });
    }
  }, [isReady, opponentReady, navigate, roomCode, selectedCharacter]);
  
  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    setShowCharacterSelect(false);
    setIsReady(true);
  };
  
  const handleCancelSelect = () => {
    setShowCharacterSelect(false);
    navigate('/');
  };
  
  const handleLeaveRoom = () => {
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 py-4 px-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Онлайн комната</h1>
        <button
          onClick={handleLeaveRoom}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          Покинуть комнату
        </button>
      </header>
      
      <main className="flex-1 container mx-auto max-w-3xl py-12 px-6 text-center">
        {showCharacterSelect ? (
          <CharacterSelect 
            onSelectCharacter={handleCharacterSelect}
            onCancel={handleCancelSelect}
          />
        ) : (
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Комната: {roomCode}</h2>
            
            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-2">Игроки:</h3>
              <div className="flex justify-between items-center mb-2 p-2 bg-gray-800 rounded">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-blue-500 rounded-full mr-3"></div>
                  <span>{currentUser?.name || 'Вы'} {isHost && '(Хост)'}</span>
                </div>
                <span className={`px-3 py-1 rounded ${isReady ? 'bg-green-600' : 'bg-yellow-600'}`}>
                  {isReady ? 'Готов' : 'Не готов'}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-2 bg-gray-800 rounded">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-red-500 rounded-full mr-3"></div>
                  <span>Оппонент {!isHost && '(Хост)'}</span>
                </div>
                <span className={`px-3 py-1 rounded ${opponentReady ? 'bg-green-600' : 'bg-yellow-600'}`}>
                  {opponentReady ? 'Готов' : 'Ожидание...'}
                </span>
              </div>
            </div>
            
            {selectedCharacter && (
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                <h3 className="text-xl font-semibold mb-2">Ваш персонаж:</h3>
                <div className="flex justify-center">
                  <div className="text-center">                    <img 
                      src={`/assets/${selectedCharacter.id === 'character1' ? 'player1' : 'player2'}/Sprites/Idle.png`} 
                      alt={selectedCharacter.name} 
                      className="w-32 h-32 object-contain mx-auto mb-2"
                    />
                    <h4 className="font-semibold">{selectedCharacter.name}</h4>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-8">
              {!isReady ? (
                <button
                  onClick={() => setShowCharacterSelect(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-xl transition-colors w-full"
                >
                  Выбрать персонажа
                </button>
              ) : (
                <p className="text-xl">
                  {opponentReady 
                    ? 'Начинаем игру...' 
                    : 'Ожидание оппонента...'}
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default OnlineRoom;