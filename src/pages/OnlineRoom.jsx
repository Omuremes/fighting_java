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
  const [selectedCharacter, setSelectedCharacter] = useState(location.state?.character || null);
  const [roomData, setRoomData] = useState(null);
  const [opponentData, setOpponentData] = useState(null);
  const [error, setError] = useState(null);
  
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
    } else {
      // Если гость не выбрал персонажа, показываем экран выбора
      setShowCharacterSelect(true);
    }

    // Загружаем данные комнаты
    // Inside your useEffect or where you handle joining rooms:
    const fetchRoomData = async () => {
      try {
        // Только пытаемся присоединиться к комнате, если у нас есть выбранный персонаж
        // или из состояния навигации
        const character = selectedCharacter || location.state?.character;
        
        // When joining a room as a guest
        if (!isHost && currentUser && character) {
          try {
            console.log('Joining room with character:', character);
            
            const joinResult = await joinRoom(
              roomCode,
              currentUser.uid, 
              currentUser.name || 'Guest',
              character
            );
            setRoomData(joinResult);
            setOpponentData({
              id: joinResult.hostId,
              name: joinResult.hostName,
              character: joinResult.hostCharacter
            });
          } catch (error) {
            console.error("Error joining room:", error);

            // Handle specific error cases
            if (error.message && error.message.includes("Game is already in progress")) {
              setError("This game has already started. Please join another room.");
            } else if (error.message && error.message.includes("Room is full")) {
              setError("This room is already full. Please join another room.");
            } else if (error.message && error.message.includes("Room not found")) {
              setError("Room not found. Please check the room code and try again.");
            } else if (error.message && error.message.includes("Missing required fields")) {
              setShowCharacterSelect(true);
              setError("Please select a character before joining.");
            } else if (error.message && error.message.includes("Bad Request")) {
              setError("Не удалось присоединиться к комнате. Проверьте правильность кода комнаты или попробуйте позже.");
            } else {
              setError(`Failed to join room: ${error.message || "Unknown error"}`);
            }
          }
        } else if (isHost) {
          // Если хост, просто загружаем существующие данные комнаты
          try {
            const roomData = await getRoomData(roomCode);
            if (roomData) {
              setRoomData(roomData);
              
              // Устанавливаем данные оппонента, если гость присоединился
              if (roomData.guestId) {
                setOpponentData({
                  id: roomData.guestId,
                  name: roomData.guestName,
                  character: roomData.guestCharacter
                });
                setOpponentReady(roomData.guestReady || false);
              }
            } else {
              setError("Room not found. Please check the code and try again.");
            }
          } catch (error) {
            setError(`Error loading room: ${error.message}`);
          }
        }
      } catch (error) {
        console.error("Error in fetchRoomData:", error);
        setError(`Error: ${error.message || "Failed to load room data"}`);
      }
    };

    fetchRoomData();
      // Устанавливаем слушатель изменений в комнате
    const setupRoomListener = () => {
      roomListener.current = listenToRoom(roomCode, (data) => {
        if (data && data.type === 'room_metadata' && data.data) {
          const roomData = data.data;
          setRoomData(roomData);
          
          // Обновляем данные оппонента
          if (isHost && roomData.guestId) {
            setOpponentData({
              id: roomData.guestId,
              name: roomData.guestName,
              character: roomData.guestCharacter
            });
            setOpponentReady(roomData.guestReady || false);
          } else if (!isHost && roomData.hostId) {
            setOpponentData({
              id: roomData.hostId,
              name: roomData.hostName,
              character: roomData.hostCharacter
            });
            setOpponentReady(roomData.hostReady || false);
          }
            // Обновляем статус игры
          if (roomData.status === 'playing' && isReady && opponentReady) {
            navigate(`/game/online/play/${roomCode}`, {
              state: { 
                character: selectedCharacter,
                isHost,
                roomData: roomData
              }
            });
          }
        } else if (data && data.type === 'error') {
          console.error("Room listener error:", data.error, data.message);
          setError(`Connection error: ${data.message}`);
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
  
  const handleCharacterSelect = async (character) => {
    setSelectedCharacter(character);
    setShowCharacterSelect(false);
    setIsReady(true);
    
    // Если гость выбирает персонажа, пытаемся присоединиться к комнате снова
    if (!isHost && character) {
      try {
        const joinResult = await joinRoom(
          roomCode,
          currentUser.uid, 
          currentUser.name || 'Guest',
          character
        );
        setRoomData(joinResult);
        setOpponentData({
          id: joinResult.hostId,
          name: joinResult.hostName,
          character: joinResult.hostCharacter
        });
        // Очищаем любые предыдущие ошибки, так как присоединение было успешным
        setError(null);
      } catch (error) {
        console.error("Error joining room after character selection:", error);
        setError(`Failed to join room: ${error.message || "Unknown error"}`);
      }
    }
  };
  
  const handleCancelSelect = () => {
    setShowCharacterSelect(false);
    navigate('/');
  };
  
  const handleLeaveRoom = () => {
    navigate('/');
  };
  
  return (
    <div className="online-room min-h-screen bg-gray-900 text-white flex flex-col">
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
        <h2>Room: {roomCode}</h2>
        {error && (
          <div className="error-container bg-red-500 text-white p-6 rounded-lg mb-6">
            <div className="error-message mb-4">
              {error === 'Room not found. Please check the room code and try again.' || error.includes('Failed to join room')
                ? 'Не удалось присоединиться к комнате. Проверьте правильность кода комнаты или попробуйте позже.'
                : error}
            </div>
            <button 
              className="primary-button bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={() => navigate('/menu')}
            >
              Назад в меню
            </button>
          </div>
        )}
        {/* Only render the rest of the UI if there is no error */}
        {!error && roomData && (
          <>
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-bold mb-6">Комната: {roomCode}</h2>
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                {isHost && (
                  <div className="mb-6 bg-gray-800 p-3 rounded-lg">
                    <h3 className="text-xl font-semibold mb-2 text-yellow-300">Информация о комнате</h3>
                    <div className="flex flex-col space-y-2">
                      <p className="text-white"><span className="font-bold">Код комнаты:</span> {roomCode}</p>
                      <div className="mt-2 bg-gray-700 p-2 rounded">
                        <p className="text-sm text-gray-300">Для подключения другого игрока, сообщите ему код комнаты:</p>
                        <div className="mt-1 p-2 bg-gray-600 rounded font-mono text-white text-sm break-all select-all">
                          {roomCode}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Нажмите на код, чтобы выделить и скопировать</p>
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
            {showCharacterSelect && (
              <CharacterSelect 
                onSelectCharacter={handleCharacterSelect}
                onCancel={handleCancelSelect}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default OnlineRoom;