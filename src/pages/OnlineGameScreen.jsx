import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import GameCanvas from '../components/GameCanvas';
import GameOverModal from '../components/GameOverModal';
import GameHud from '../components/GameHud';
import { useAuth } from '../contexts/AuthContext';

const OnlineGameScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const { currentUser, updateRating, listenToRoom, updateRoomStatus } = useAuth();
  
  const [isHost, setIsHost] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [playerCharacter, setPlayerCharacter] = useState(null);
  const [opponentCharacter, setOpponentCharacter] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [rewardData, setRewardData] = useState(null);
  
  // Инициализация состояния игры при загрузке компонента
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (!location.state?.character || !roomCode) {
      navigate('/');
      return;
    }
    
    // Определяем, является ли текущий пользователь хостом
    const isHostPlayer = location.state?.isHost || false;
    setIsHost(isHostPlayer);
    
    // Загружаем выбранных персонажей
    setPlayerCharacter(location.state.character);
    
    // Загружаем данные комнаты
    if (location.state?.roomData) {
      setRoomData(location.state.roomData);
      
      // Определяем персонажа оппонента
      if (isHostPlayer && location.state.roomData.guestCharacter) {
        setOpponentCharacter(location.state.roomData.guestCharacter);
      } else if (!isHostPlayer && location.state.roomData.hostCharacter) {
        setOpponentCharacter(location.state.roomData.hostCharacter);
      }
    }
    
    // Устанавливаем слушателя для комнаты
    const unsubscribe = listenToRoom(roomCode, (data) => {
      if (data) {
        setRoomData(data);
        
        // Обновляем персонажа оппонента, если он изменился
        if (isHostPlayer && data.guestCharacter) {
          setOpponentCharacter(data.guestCharacter);
        } else if (!isHostPlayer && data.hostCharacter) {
          setOpponentCharacter(data.hostCharacter);
        }
        
        // Если статус изменился на 'completed', и игра еще не завершена,
        // завершаем игру с соответствующим результатом
        if (data.status === 'completed' && !isGameOver && data.winner) {
          const isWinner = 
            (isHostPlayer && data.winner === 'host') ||
            (!isHostPlayer && data.winner === 'guest');
          
          setIsGameOver(true);
          setWinner(isWinner ? 'player1' : 'player2');
        }
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [currentUser, navigate, roomCode, location.state, listenToRoom]);
  
  // Обработка действий игрока
  const handlePlayerAction = async (action) => {
    if (action.type === 'gameOver') {
      setIsGameOver(true);
      setWinner(action.winner);
      
      // Обновляем статус комнаты
      const isWin = action.winner === 'player1';
      await updateRoomStatus(roomCode, 'completed');
      
      // Также обновляем победителя в комнате
      await updateRoomStatus(roomCode, {
        status: 'completed',
        winner: isHost ? (isWin ? 'host' : 'guest') : (isWin ? 'guest' : 'host')
      });
      
      // Обновляем рейтинг пользователя
      if (currentUser) {
        try {
          const result = await updateRating(currentUser.uid, isWin);
          setRewardData(result);
        } catch (error) {
          console.error('Ошибка при обновлении рейтинга', error);
        }
      }
    }
  };
  
  // Обработка завершения игры
  const handleGameFinished = () => {
    navigate('/');
  };
  
  // Обработка новой игры
  const handlePlayAgain = () => {
    navigate('/');
  };
  
  // Если персонажи еще не загружены, показываем экран загрузки
  if (!playerCharacter || !opponentCharacter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center p-12 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-2xl text-white font-bold mb-4">Загрузка игры...</h2>
          <p className="text-gray-300">Ожидание подключения оппонента</p>
          <div className="mt-6 w-32 h-32 mx-auto border-t-4 border-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative w-screen h-screen bg-black">
      <GameCanvas 
        gameMode="online"
        playerCharacter={playerCharacter}
        opponentCharacter={opponentCharacter}
        onPlayerAction={handlePlayerAction}
      />
      
      <GameHud 
        player1Character={playerCharacter}
        player2Character={opponentCharacter}
      />
      
      {isGameOver && (
        <GameOverModal 
          winner={winner}
          onNewGame={handlePlayAgain}
          onExit={handleGameFinished}
          rewardData={rewardData}
          currentUser={currentUser}
          gameMode="online"
        />
      )}
    </div>
  );
};

export default OnlineGameScreen;
