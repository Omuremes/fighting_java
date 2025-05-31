import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import GameCanvas from '../components/GameCanvas';
import GameOverModal from '../components/GameOverModal';
import GameHud from '../components/GameHud';
import { useAuth } from '../contexts/AuthContext';
import webSocketService from '../services/WebSocketService';

const OnlineGameScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const { currentUser, updateRating, listenToRoom, updateRoomStatus, processGameAction } = useAuth();
  
  const [isHost, setIsHost] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [playerCharacter, setPlayerCharacter] = useState(null);
  const [opponentCharacter, setOpponentCharacter] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [rewardData, setRewardData] = useState(null);
  const [playerPosition, setPlayerPosition] = useState({ x: 100, y: 0 });
  const [opponentPosition, setOpponentPosition] = useState({ x: 800, y: 0 });
  const [playerAttack, setPlayerAttack] = useState(null);
  const [opponentAttack, setOpponentAttack] = useState(null);
  
  // Health synchronization state
  const [playerHealth, setPlayerHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  
  // WebSocket state
  const [webSocketConnected, setWebSocketConnected] = useState(false);
  const wsSubscription = useRef(null);
  const actionSequence = useRef(0);
  
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
    
    // Connect to WebSocket
    webSocketService.connect()
      .then(() => {
        setWebSocketConnected(true);
        console.log('%c[WebSocket] Connected successfully', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;');
      })
      .catch(error => {
        console.error('%c[WebSocket] Connection failed', 'background: #F44336; color: white; padding: 2px 5px; border-radius: 2px;', error);
      });
    
    // Register for WebSocket connection changes
    const unsubscribeWs = webSocketService.onConnectionChange((connected) => {
      setWebSocketConnected(connected);
      setConnectionStatus(connected ? 'connected' : 'lost');
    });
    
    // Устанавливаем слушателя для комнаты
    const unsubscribe = listenToRoom(roomCode, handleRoomMessage);
    
    return () => {
      unsubscribe();
      unsubscribeWs();
      
      // Clean up WebSocket subscription
      if (wsSubscription.current) {
        wsSubscription.current.unsubscribe();
        wsSubscription.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate, roomCode, location.state, listenToRoom, isGameOver]);
  
  // Handler for all room messages (Firestore and WebSocket)
  const handleRoomMessage = (message) => {
    // Update connection monitoring
    lastReceivedUpdate.current = Date.now();
    
    // If connection was weak/lost, restore it
    if (connectionStatus !== 'connected') {
      setConnectionStatus('connected');
    }
    
    // For room metadata updates from Firestore
    if (message.type === 'room_metadata') {
      const data = message.data;
      
      if (data) {
        setRoomData(data);
        
        // Update opponent character
        if (isHost && data.guestCharacter && !opponentCharacter) {
          setOpponentCharacter(data.guestCharacter);
        } else if (!isHost && data.hostCharacter && !opponentCharacter) {
          setOpponentCharacter(data.hostCharacter);
        }
        
        // If status changed to 'completed' and game isn't over yet
        if (data.status === 'completed' && !isGameOver && data.winner) {
          const isWinner = 
            (isHost && data.winner === 'host') ||
            (!isHost && data.winner === 'guest');
          
          setIsGameOver(true);
          setWinner(isWinner ? 'player1' : 'player2');
        }
      }
      
      return;
    }
    
    // Handle WebSocket error
    if (message.type === 'error') {
      console.error(`WebSocket error: ${message.error}`, message.message);
      return;
    }
    
    // For room state updates from WebSocket
    if (message.type === 'room_state') {
      // Process room state update
      console.log('Room state update:', message.data);
      return;
    }
    
    // Process action messages from opponent
    if (message.playerType) {
      const isOpponentAction = 
        (isHost && message.playerType === 'guest') || 
        (!isHost && message.playerType === 'host');
      
      if (isOpponentAction) {
        processOpponentAction(message);
      }
    }
  };
  
  // Process actions received from opponent
  const processOpponentAction = (action) => {
    // Ignore our own actions that come back from server
    if (action.playerId === currentUser?.uid) {
      return;
    }
    
    // Check if this is a newer action than the last one
    if (lastSyncedAction.current && 
        action.timestamp <= lastSyncedAction.current.timestamp) {
      return; // Skip older or duplicate actions
    }
    
    lastSyncedAction.current = action;
    
    // Update last received update timestamp
    lastReceivedUpdate.current = Date.now();
    
    // Handle different action types
    if (action.type === 'move') {
      if (action.data?.position) {
        setOpponentPosition(action.data.position);
      }
    } else if (action.type === 'attack') {
      setOpponentAttack({
        type: action.data.attackType,
        hit: action.data.hit,
        damage: action.data.damage,
        timestamp: action.timestamp || Date.now()
      });
      
      // If hit, update player health through GameCanvas
      if (action.data.hit && gameCanvasRef.current) {
        gameCanvasRef.current.receiveOpponentAttack(action.data);
        setPlayerHealth(gameCanvasRef.current.getPlayerHealth());
      }
    } else if (action.type === 'hit' || action.type === 'health') {
      // Update health values
      if (gameCanvasRef.current) {
        if (action.data.health) {
          gameCanvasRef.current.updateHealth(
            action.data.health.playerHealth, 
            action.data.health.opponentHealth
          );
          
          // Update UI state
          setPlayerHealth(action.data.health.playerHealth || playerHealth);
          setOpponentHealth(action.data.health.opponentHealth || opponentHealth);
        }
      }
    }
  };
  
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
    // Increment sequence number for ordering
    actionSequence.current += 1;
    
    // Определяем тип игрока для синхронизации (хост или гость)
    const playerType = isHost ? 'host' : 'guest';
    
    switch (action.type) {
      case 'gameOver':
        setIsGameOver(true);
        setWinner(action.winner);
        
        // Process game over through room status update
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
        break;
      
      case 'move':
        // Обновляем позицию игрока локально для мгновенного отклика
        setPlayerPosition(action.position);
        
        // Movement updates get bundled and throttled
        // Send via WebSocket for real-time sync
        // If WebSocket isn't available, fall back to API
        action.sequence = actionSequence.current;
        
        if (!action.isCritical) {
          // Throttle regular movement updates
          const now = Date.now();
          const timeSinceLastUpdate = now - lastPositionUpdate.current;
          
          if (timeSinceLastUpdate > 33) {
            if (webSocketConnected) {
              webSocketService.sendGameAction(roomCode, {
                playerType,
                type: 'move',
                data: {
                  position: action.position,
                  direction: action.direction || 'none',
                  velocity: action.velocity || { x: 0, y: 0 },
                  moving: action.moving || false,
                  isCritical: false
                },
                sequence: actionSequence.current
              });
            } else {
              // Fall back to API if WebSocket isn't available
              await processGameAction(roomCode, {
                actionType: 'move',
                playerType,
                data: {
                  position: action.position,
                  direction: action.direction || 'none'
                }
              });
            }
            lastPositionUpdate.current = now;
          }
        } else {
          // Critical position updates are sent immediately
          if (webSocketConnected) {
            webSocketService.sendGameAction(roomCode, {
              playerType,
              type: 'move',
              data: {
                position: action.position,
                direction: action.direction || 'none',
                velocity: action.velocity || { x: 0, y: 0 },
                moving: action.moving || false,
                isCritical: true
              },
              sequence: actionSequence.current
            });
          } else {
            // Fall back to API
            await processGameAction(roomCode, {
              actionType: 'move',
              playerType,
              data: {
                position: action.position,
                isCritical: true
              }
            });
          }
        }
        break;
        
      case 'attack':
        // Обновляем состояние атаки локально
        setPlayerAttack({
          type: action.attackType,
          timestamp: Date.now()
        });
        
        // Send attack via WebSocket with high priority
        if (webSocketConnected) {
          webSocketService.sendGameAction(roomCode, {
            playerType,
            type: 'attack',
            data: {
              attackType: action.attackType,
              hit: action.hit,
              damage: action.damage,
              position: action.position || playerPosition,
            },
            sequence: actionSequence.current
          });
        }
        
        // Always process through backend for authoritative game logic
        try {
          await processGameAction(roomCode, {
            actionType: 'attack',
            playerType,
            playerId: currentUser.uid,
            attackType: action.attackType,
            data: {
              hit: action.hit,
              damage: action.damage,
              position: action.position || playerPosition
            }
          });
          
          console.log('%c[GAME] Attack processed successfully', 'background: #4CAF50; color: white; padding: 2px 5px; border-radius: 2px;');
        } catch (error) {
          console.error('Error processing attack:', error);
        }
        break;
        
      case 'hit':
        // Update local health state immediately for responsive UI
        setPlayerHealth(action.remainingHealth);
        
        // Sync health information to opponent via WebSocket
        if (webSocketConnected) {
          webSocketService.sendGameAction(roomCode, {
            playerType,
            type: 'health',
            data: {
              health: {
                playerHealth: action.remainingHealth,
                opponentHealth: gameCanvasRef.current?.getOpponentHealth() || opponentHealth
              }
            },
            sequence: actionSequence.current
          });
        } else {
          // Fall back to API
          await processGameAction(roomCode, {
            actionType: 'health',
            playerType,
            data: {
              playerHealth: action.remainingHealth,
              opponentHealth: gameCanvasRef.current?.getOpponentHealth() || opponentHealth
            }
          });
        }
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
      />
      
      <GameHud 
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
