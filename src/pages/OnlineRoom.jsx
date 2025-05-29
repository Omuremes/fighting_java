import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CharacterSelect from '../components/CharacterSelect';

const OnlineRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, joinRoom, listenToRoom, updateRoomStatus, getRoomData } = useAuth();
  
  const isHost = location.state?.isHost || false;
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [opponentData, setOpponentData] = useState(null);
  const [error, setError] = useState(null);
  const [localIpAddress, setLocalIpAddress] = useState(null);
  
  const roomListener = useRef(null);
    // Получение выбранного персонажа из state навигации и инициализация комнаты
  useEffect(() => {
    // Загружаем выбранного персонажа
    if (location.state?.character) {
      setSelectedCharacter(location.state.character);
      setIsReady(true);
    } else if (isHost) {
      // Если хост не выбрал персонажа, показываем экран выбора
      setShowCharacterSelect(true);
    }

    // Загружаем данные комнаты
    const fetchRoomData = async () => {
      try {
        const data = await getRoomData(roomCode);
        if (data) {
          setRoomData(data);
          setLocalIpAddress(data.localIp);
          
          // Если пользователь не хост, попытаемся присоединиться к комнате
          if (!isHost && location.state?.character) {
            try {
              await joinRoom(
                roomCode,
                currentUser.uid,
                currentUser.name || currentUser.email,
                location.state.character
              );
            } catch (joinError) {
              console.error("Error joining room:", joinError);
              setError("Не удалось присоединиться к комнате. Проверьте код и попробуйте еще раз.");
            }
          }
          
          // Определяем данные оппонента
          if (isHost && data.guestId) {
            setOpponentData({
              id: data.guestId,
              name: data.guestName,
              character: data.guestCharacter
            });
            setOpponentReady(data.guestReady);
          } else if (!isHost && data.hostId) {
            setOpponentData({
              id: data.hostId,
              name: data.hostName,
              character: data.hostCharacter
            });
            setOpponentReady(data.hostReady);
          }
        } else {
          setError("Комната не найдена");
        }
      } catch (error) {
        console.error("Error fetching room data:", error);
        setError("Ошибка при загрузке данных комнаты");
      }
    };

    fetchRoomData();
      // Устанавливаем слушатель изменений в комнате
    const setupRoomListener = () => {
      roomListener.current = listenToRoom(roomCode, (data) => {
        if (data) {
          setRoomData(data);
          
          // Обновляем данные оппонента
          if (isHost && data.guestId) {
            setOpponentData({
              id: data.guestId,
              name: data.guestName,
              character: data.guestCharacter
            });
            setOpponentReady(data.guestReady);
          } else if (!isHost && data.hostId) {
            setOpponentData({
              id: data.hostId,
              name: data.hostName,
              character: data.hostCharacter
            });
            setOpponentReady(data.hostReady);
          }
            // Обновляем статус игры
          if (data.status === 'playing' && isReady && opponentReady) {
            navigate(`/game/online/play/${roomCode}`, {
              state: { 
                character: selectedCharacter,
                isHost,
                roomData: data
              }
            });
          }
        }
      });
    };
    
    setupRoomListener();
    
    // Очищаем слушателя при размонтировании
    return () => {
      if (roomListener.current) {
        roomListener.current();
      }
    };
  }, [roomCode, currentUser, isHost, isReady, location.state, navigate, getRoomData, joinRoom, listenToRoom, selectedCharacter, opponentReady]);
  
  // Когда оба игрока готовы, обновляем статус комнаты
  useEffect(() => {
    const startGame = async () => {
      if (isReady && opponentReady && isHost && roomData) {
        // Только хост может обновить статус до "playing"
        await updateRoomStatus(roomCode, 'playing');
      }
    };
    
    if (isReady && opponentReady) {
      startGame();
    }
  }, [isReady, opponentReady, isHost, roomCode, roomData, updateRoomStatus]);
  
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
              {error && (
                <div className="bg-red-500 text-white p-3 rounded-md mb-4">
                  {error}
                </div>
              )}
              
              {isHost && localIpAddress && (
                <div className="mb-6 bg-gray-800 p-3 rounded-lg">
                  <h3 className="text-xl font-semibold mb-2 text-yellow-300">Информация о комнате</h3>
                  <div className="flex flex-col space-y-2">
                    <p className="text-white"><span className="font-bold">Код комнаты:</span> {roomCode}</p>
                    <p className="text-white"><span className="font-bold">IP адрес:</span> {localIpAddress}</p>
                    <div className="mt-2 bg-gray-700 p-2 rounded">
                      <p className="text-sm text-gray-300">Для подключения другого игрока, сообщите ему:</p>
                      <ol className="list-decimal list-inside text-sm text-gray-300 mt-1">
                        <li>Код комнаты: <span className="text-white">{roomCode}</span></li>
                        <li>Ваш IP адрес: <span className="text-white">{localIpAddress}</span></li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
              
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
                  <span>
                    {opponentData ? opponentData.name : 'Ожидание оппонента...'} 
                    {!isHost && '(Хост)'}
                  </span>
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