import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import GameCanvas from '../components/GameCanvas';
import GameOverModal from '../components/GameOverModal';
import GameHud from '../components/GameHud';
import { useAuth } from '../contexts/AuthContext';

const OnlineGameScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const { currentUser, updateRating, listenToRoom, updateRoomStatus, syncPlayerAction, processGameAction } = useAuth();
  
  const [isHost, setIsHost] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [playerCharacter, setPlayerCharacter] = useState(null);
  const [opponentCharacter, setOpponentCharacter] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [roomData, setRoomData] = useState(null);
  const [rewardData, setRewardData] = useState(null);
  const [playerPosition, setPlayerPosition] = useState({ x: 100, y: 0 });
  const [opponentPosition, setOpponentPosition] = useState({ x: 800, y: 0 });
  const [playerAttack, setPlayerAttack] = useState(null);
  const [opponentAttack, setOpponentAttack] = useState(null);
  
  // Health synchronization state
  const [playerHealth, setPlayerHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  
  const lastSyncedAction = useRef(null);
  const gameCanvasRef = useRef(null);
  const lastPositionUpdate = useRef(Date.now());
  
  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const connectionTimeout = useRef(null);
  const lastReceivedUpdate = useRef(Date.now());
  
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
        
        // Синхронизация действий оппонента
        const opponentActionField = isHostPlayer ? 'guestAction' : 'hostAction';
        
        if (data[opponentActionField] && data[opponentActionField].timestamp) {
          // Проверяем, что это новое действие, которое мы еще не обрабатывали
          if (!lastSyncedAction.current || 
              data[opponentActionField].timestamp > lastSyncedAction.current) {
            
            const opponentAction = data[opponentActionField];
            lastSyncedAction.current = opponentAction.timestamp;
              // Обновляем позицию оппонента с плавной интерполяцией
            if (opponentAction.position) {
              // Instead of immediate update, use requestAnimationFrame for smoother transitions
              const targetPos = opponentAction.position;
              
              // Update last received update timestamp for connection monitoring
              lastReceivedUpdate.current = Date.now();
              
              // Update opponent position directly for now - we'll add interpolation in GameCanvas
              setOpponentPosition(targetPos);
            }
            
            // Обрабатываем атаки оппонента
            if (opponentAction.attack) {
              setOpponentAttack({
                type: opponentAction.attack.type,
                hit: opponentAction.attack.hit,
                damage: opponentAction.attack.damage,
                timestamp: new Date().getTime()
              });
              
              // Если это была атака, которая должна нанести урон игроку
              if (opponentAction.attack.hit && gameCanvasRef.current) {
                gameCanvasRef.current.receiveOpponentAttack(opponentAction.attack);
                // Update local health state for UI
                setPlayerHealth(gameCanvasRef.current.getPlayerHealth());
              }
            }
            
            // Обрабатываем синхронизацию здоровья
            if (opponentAction.health) {
              if (gameCanvasRef.current) {
                gameCanvasRef.current.updateHealth(
                  opponentAction.health.playerHealth, 
                  opponentAction.health.opponentHealth
                );
                // Update local state for UI
                setPlayerHealth(opponentAction.health.playerHealth || playerHealth);
                setOpponentHealth(opponentAction.health.opponentHealth || opponentHealth);
              }
            }
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate, roomCode, location.state, listenToRoom, isGameOver]);
  
  // Monitor connection status based on opponent updates
  useEffect(() => {
    // Reset timeout when we receive opponent data
    if (opponentPosition || opponentAttack) {
      lastReceivedUpdate.current = Date.now();
      
      if (connectionStatus !== 'connected') {
        setConnectionStatus('connected');
      }
      
      // Clear any existing timeout
      if (connectionTimeout.current) {
        clearTimeout(connectionTimeout.current);
      }
    }
    
    // Create a new timeout to check connection
    connectionTimeout.current = setTimeout(() => {
      const timeSinceLastUpdate = Date.now() - lastReceivedUpdate.current;
      
      if (timeSinceLastUpdate > 5000) {
        // If no updates for 5 seconds, consider connection weak
        setConnectionStatus('weak');
      }
      
      if (timeSinceLastUpdate > 10000) {
        // If no updates for 10 seconds, consider connection lost
        setConnectionStatus('lost');
      }
    }, 5000);
    
    return () => {
      if (connectionTimeout.current) {
        clearTimeout(connectionTimeout.current);
      }
    };
  }, [opponentPosition, opponentAttack, connectionStatus]);
  
    // Обработка действий игрока
  const handlePlayerAction = async (action) => {
    // Определяем тип игрока для синхронизации (хост или гость)
    const playerType = isHost ? 'host' : 'guest';
    
    switch (action.type) {
      case 'gameOver':
        setIsGameOver(true);
        setWinner(action.winner);
        
        // Process game over through room status update (no backend action needed)
        const isWin = action.winner === 'player1';
        try {
          // Обновляем статус комнаты
          await updateRoomStatus(roomCode, {
            status: 'completed',
            winner: isHost ? (isWin ? 'host' : 'guest') : (isWin ? 'guest' : 'host')
          });
          
          // Обновляем рейтинг пользователя
          if (currentUser) {
            const result = await updateRating(currentUser.uid, isWin);
            setRewardData(result);
          }
        } catch (error) {
          console.error('Ошибка при обработке завершения игры:', error);
        }
        break;          case 'move':
        // Обновляем позицию игрока локально для мгновенного отклика
        setPlayerPosition(action.position);
        
        // Enhanced position update with smoother synchronization
        // Movement updates use Firebase for real-time sync with higher frequency
        if (!action.isCritical) {
          // Reduced throttling for smoother movement (20 updates per second)
          const now = Date.now();
          const timeSinceLastUpdate = now - lastPositionUpdate.current;
          
          if (timeSinceLastUpdate > 50) { 
            // Include movement direction and velocity for better prediction on receiver side
            await syncPlayerAction(roomCode, playerType, {
              type: 'move',
              position: action.position,
              timestamp: now,
              direction: action.direction || 'none',
              velocity: action.velocity || { x: 0, y: 0 },
              moving: action.moving || false
            });
            lastPositionUpdate.current = now;
          }
        } else {
          // Critical position updates (e.g., after an attack) are sent immediately
          await syncPlayerAction(roomCode, playerType, {
            type: 'move',
            position: action.position,
            isCritical: true,
            timestamp: Date.now(),
            direction: action.direction || 'none',
            velocity: action.velocity || { x: 0, y: 0 },
            moving: action.moving || false
          });
        }
        break;
        
      case 'attack':
        // Обновляем состояние атаки локально
        setPlayerAttack({
          type: action.attackType,
          timestamp: new Date().getTime()
        });
        
        // Process attack through backend API for authoritative game logic
        try {
          const response = await processGameAction(roomCode, {
            playerId: currentUser.uid,
            actionType: 'attack',
            attackType: action.attackType
          });
          
          // Log successful backend processing
          console.log('Attack processed through backend API:', response);
          
          // Also sync to Firebase for immediate visual feedback
          await syncPlayerAction(roomCode, playerType, {
            attack: {
              type: action.attackType,
              hit: action.hit,
              damage: action.damage,
              position: action.position || playerPosition,
              timestamp: Date.now()
            }
          });
        } catch (error) {
          console.error('Error processing attack through backend API:', error);
          // Fallback to Firebase sync only
          await syncPlayerAction(roomCode, playerType, {
            attack: {
              type: action.attackType,
              hit: action.hit,
              damage: action.damage,
              position: action.position || playerPosition,
              timestamp: Date.now()
            }
          });
        }
        break;
        
      case 'hit':
        // Handle hit through Firebase sync only (no backend action needed)
        // Update local health state immediately for responsive UI
        setPlayerHealth(action.remainingHealth);
        
        // Sync health information to opponent
        await syncPlayerAction(roomCode, playerType, {
          type: 'health',
          health: {
            playerHealth: action.remainingHealth,
            opponentHealth: gameCanvasRef.current?.getOpponentHealth() || opponentHealth
          },
          timestamp: Date.now()
        });
        break;
        
      default:
        // Для других типов событий
        console.log('Unhandled player action:', action);
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
        ref={gameCanvasRef}
        gameMode="online"
        playerCharacter={playerCharacter}
        opponentCharacter={opponentCharacter}
        playerPosition={playerPosition}
        opponentPosition={opponentPosition}
        playerAttack={playerAttack}
        opponentAttack={opponentAttack}
        onPlayerAction={handlePlayerAction}
        isHost={isHost}
      />        <GameHud 
          player1Character={playerCharacter}
          player2Character={opponentCharacter}
          player1Health={playerHealth}
          player2Health={opponentHealth}
        />
      
      {/* Connection status indicator */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-md text-white font-semibold text-sm
                     ${connectionStatus === 'connected' ? 'bg-green-600' : 
                       connectionStatus === 'weak' ? 'bg-yellow-600' : 'bg-red-600'}`}>
        {connectionStatus === 'connected' ? 'Соединение: стабильное' :
         connectionStatus === 'weak' ? 'Соединение: слабое' : 'Соединение: потеряно'}
      </div>
      
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
