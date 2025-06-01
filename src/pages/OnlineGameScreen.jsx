import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import GameCanvas from '../components/GameCanvas';
import GameOverModal from '../components/GameOverModal';
import GameHud from '../components/GameHud';
import { useAuth } from '../contexts/AuthContext';
import webSocketService from '../services/WebSocketService';
import apiService from '../services/api';

const OnlineGameScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { roomCode } = useParams();
  // eslint-disable-next-line no-unused-vars
  const { currentUser, updateRating, listenToRoom, updateRoomStatus, processGameAction } = useAuth();
  
  const [isHost, setIsHost] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [playerCharacter, setPlayerCharacter] = useState(null);
  const [opponentCharacter, setOpponentCharacter] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [roomData, setRoomData] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [rewardData, setRewardData] = useState(null);
  const [playerPosition, setPlayerPosition] = useState({ x: 100, y: 0 });
  const [opponentPosition, setOpponentPosition] = useState({ x: 800, y: 0 });
  // eslint-disable-next-line no-unused-vars
  const [playerAttack, setPlayerAttack] = useState(null);
  const [opponentAttack, setOpponentAttack] = useState(null);
  
  // Health synchronization state
  const [playerHealth, setPlayerHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  
  // WebSocket state
  // eslint-disable-next-line no-unused-vars
  const [webSocketConnected, setWebSocketConnected] = useState(false);
  const wsSubscription = useRef(null);
  const actionSequence = useRef(0);
  
  // Position interpolation refs
  const opponentPositionRef = useRef({ x: 800, y: 0 });
  const opponentTargetPosition = useRef({ x: 800, y: 0 });
  const lastPositionUpdateTime = useRef(Date.now());
  
  const lastSyncedAction = useRef(null);
  const gameCanvasRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const lastPositionUpdate = useRef(Date.now());
  const animationFrameRef = useRef(null);
  
  // Rate limiting
  // eslint-disable-next-line no-unused-vars
  const attackThrottleTime = useRef(500); // ms between attacks
  // eslint-disable-next-line no-unused-vars
  const movementThrottleTime = useRef(33); // ~30fps updates
  // eslint-disable-next-line no-unused-vars
  const lastAttackTime = useRef(0);
  // eslint-disable-next-line no-unused-vars
  const lastMovementTime = useRef(0);
  const lastActionTimes = useRef({ move: 0, attack: 0 });
  
  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const connectionTimeout = useRef(null);
  const lastReceivedUpdate = useRef(Date.now());
  
  // Connection callback reference for cleaning up
  const connectionCallback = useRef(null);
  
  // Helper function to calculate attack damage based on attack type and character stats
  const calculateAttackDamage = (attackType, character) => {
    if (!character || !character.stats) {
      return 10; // Default damage
    }
    
    const baseAttack = character.stats.attack || 5;
    let damageMultiplier = 1.0;
    
    // Different attack types have different damage multipliers
    switch(attackType) {
      case 'attack1':
        damageMultiplier = 1.0;
        break;
      case 'attack2':
        damageMultiplier = 1.5;
        break;
      case 'attack3':
        damageMultiplier = 2.0;
        break;
      default:
        damageMultiplier = 1.0;
    }
    
    // Calculate final damage with some randomness
    const baseDamage = baseAttack * damageMultiplier;
    const randomFactor = 0.9 + (Math.random() * 0.2); // 0.9-1.1 random factor
    
    return Math.round(baseDamage * randomFactor);
  };
  
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
    
    // Initialize positions based on host/guest role
    const initialPlayerX = isHostPlayer ? 100 : 800; 
    const initialOpponentX = isHostPlayer ? 800 : 100;
    
    setPlayerPosition({ x: initialPlayerX, y: 0 });
    setOpponentPosition({ x: initialOpponentX, y: 0 });
    opponentPositionRef.current = { x: initialOpponentX, y: 0 };
    opponentTargetPosition.current = { x: initialOpponentX, y: 0 };
    
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
    // Store the callback function for later cleanup
    const handleConnectionChange = (connected) => {
      setWebSocketConnected(connected);
      setConnectionStatus(connected ? 'connected' : 'lost');
    };
    
    connectionCallback.current = handleConnectionChange;
    webSocketService.addConnectionListener(handleConnectionChange);
    
    // Start position interpolation animation frame
    startPositionInterpolation();
    
    // Устанавливаем слушателя для комнаты
    const unsubscribe = listenToRoom(roomCode, handleRoomMessage);
    
    return () => {
      unsubscribe();
      
      // Clean up WebSocket connection listener
      if (connectionCallback.current) {
        webSocketService.removeConnectionListener(connectionCallback.current);
        connectionCallback.current = null;
      }
      
      // Clean up WebSocket subscription
      if (wsSubscription.current) {
        wsSubscription.current.unsubscribe();
        wsSubscription.current = null;
      }
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate, roomCode, location.state, listenToRoom, isGameOver]);
  
  // Start position interpolation
  const startPositionInterpolation = () => {
    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const interpolatePositions = () => {
      // Interpolate opponent position smoothly
      const currentTime = Date.now();
      const timeDelta = currentTime - lastPositionUpdateTime.current;
      
      // Smooth interpolation factor (adjust for desired smoothness)
      // Higher values = faster movement to target
      const interpolationFactor = Math.min(0.15, timeDelta / 100);
      
      // Interpolate between current position and target position
      opponentPositionRef.current = {
        x: opponentPositionRef.current.x + (opponentTargetPosition.current.x - opponentPositionRef.current.x) * interpolationFactor,
        y: opponentPositionRef.current.y + (opponentTargetPosition.current.y - opponentPositionRef.current.y) * interpolationFactor
      };
      
      // Update state only if position changed significantly
      const diff = Math.sqrt(
        Math.pow(opponentPositionRef.current.x - opponentPosition.x, 2) +
        Math.pow(opponentPositionRef.current.y - opponentPosition.y, 2)
      );
      
      if (diff > 0.1) {
        setOpponentPosition({
          x: opponentPositionRef.current.x,
          y: opponentPositionRef.current.y
        });
      }
      
      lastPositionUpdateTime.current = currentTime;
      animationFrameRef.current = requestAnimationFrame(interpolatePositions);
    };
    
    animationFrameRef.current = requestAnimationFrame(interpolatePositions);
  };
  
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
    if ((isHost && action.playerType === 'host') || (!isHost && action.playerType === 'guest')) {
      return;
    }
    
    // Update connection monitoring
    lastReceivedUpdate.current = Date.now();
    if (connectionStatus !== 'connected') {
      setConnectionStatus('connected');
    }
    
    // Handle different action types
    switch (action.type) {
      case 'move':
        // Update opponent position for smooth interpolation
        if (action.position) {
          opponentTargetPosition.current = action.position;
          
          // For direct teleport moves (like death reset), use immediate position update
          const distance = Math.sqrt(
            Math.pow(opponentPositionRef.current.x - action.position.x, 2) +
            Math.pow(opponentPositionRef.current.y - action.position.y, 2)
          );
          
          // If large position change, apply immediately instead of interpolating
          if (distance > 200) {
            opponentPositionRef.current = { ...action.position };
            setOpponentPosition({ ...action.position });
          }
          
          // Update opponent animation if direction is provided
          if (action.data?.direction && gameCanvasRef.current) {
            // Handle explicit stop command to fix continuous movement
            if (action.data.direction === 'stop' || action.data.moving === false) {
              gameCanvasRef.current.updateOpponentDirection?.('idle');
            } else {
              gameCanvasRef.current.updateOpponentDirection?.(action.data.direction);
            }
          }
        }
        break;
      
      case 'attack':
        // Process attack from opponent
        if (action.data) {
          // Extract attack data
          const { attackType, hit, damage, timestamp, position } = action.data;
          
          // Update opponent position if available for attack accuracy
          if (position) {
            // Minor position adjustment to ensure accurate hit detection
            opponentTargetPosition.current = {
              x: position.x,
              y: opponentTargetPosition.current.y // Keep vertical position
            };
          }
          
          // Trigger opponent attack animation
          setOpponentAttack({
            type: attackType || 'attack1',
            hit: hit || false,
            damage: damage || 0,
            timestamp: timestamp || Date.now(),
            position: position
          });
          
          // If hit was successful, update player health
          if (hit && gameCanvasRef.current) {
            const finalDamage = damage || calculateAttackDamage(attackType || 'attack1', opponentCharacter);
            
            // Update health state for UI immediately
            setPlayerHealth(prevHealth => Math.max(0, prevHealth - finalDamage));
            
            // Allow game canvas to handle hit effects
            gameCanvasRef.current.receiveOpponentAttack({
              attackType: attackType || 'attack1',
              hit: true,
              damage: finalDamage,
              position: position
            });
          }
        }
        break;
        
      case 'hit':
        // Explicit hit confirmation - update health directly
        if (action.data && typeof action.data.damage === 'number') {
          const newHealth = Math.max(0, playerHealth - action.data.damage);
          setPlayerHealth(newHealth);
          
          // Update game canvas health
          if (gameCanvasRef.current) {
            gameCanvasRef.current.updateHealth?.(newHealth, opponentHealth);
          }
        }
        break;
        
      case 'gameOver':
        // Handle game over state from the opponent
        if (action.data && action.data.winner) {
          const winner = action.data.winner;
          const isPlayerWinner = (isHost && winner === 'host') || (!isHost && winner === 'guest');
          
          setIsGameOver(true);
          setWinner(isPlayerWinner ? 'player1' : 'player2');
        }
        break;
        
      case 'health_sync':
        // Sync health data from server (authoritative)
        if (action.data) {
          const { hostHealth, guestHealth } = action.data;
          
          if (isHost && typeof guestHealth === 'number') {
            // Host receives guest health
            setOpponentHealth(guestHealth);
          } else if (!isHost && typeof hostHealth === 'number') {
            // Guest receives host health
            setOpponentHealth(hostHealth);
          }
          
          // Update health in GameCanvas component
          if (gameCanvasRef.current && typeof hostHealth === 'number' && typeof guestHealth === 'number') {
            gameCanvasRef.current.updateHealth(
              isHost ? hostHealth : guestHealth, 
              isHost ? guestHealth : hostHealth
            );
          }
        }
        break;
        
      default:
        console.log(`Unknown action type: ${action.type}`);
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
  
  // Add health synchronization effect
  useEffect(() => {
    if (!gameCanvasRef.current || !webSocketConnected || !roomCode) {
      return;
    }
    
    // Send health sync every 2 seconds to keep both clients consistent
    const syncInterval = setInterval(() => {
      if (gameCanvasRef.current && webSocketConnected) {
        // Get current health values from game canvas
        const playerHealth = gameCanvasRef.current.getPlayerHealth?.() || 100;
        const opponentHealth = gameCanvasRef.current.getOpponentHealth?.() || 100;
        
        // Create health sync action
        const healthSyncAction = {
          type: 'health_sync',
          playerType: isHost ? 'host' : 'guest',
          playerId: currentUser?.uid,
          data: {
            hostHealth: isHost ? playerHealth : opponentHealth,
            guestHealth: isHost ? opponentHealth : playerHealth
          },
          timestamp: Date.now(),
          sequence: actionSequence.current++
        };
        
        // Send health sync action
        webSocketService.sendAction(roomCode, healthSyncAction);
      }
    }, 1000); // Reduced from 2000ms to 1000ms for more frequent updates
    
    return () => {
      clearInterval(syncInterval);
    };
  }, [webSocketConnected, roomCode, isHost, currentUser, actionSequence]);
  
  // Handle player actions like moves and attacks
  const handlePlayerAction = async (action) => {
    // Implement rate limiting for actions
    const now = Date.now();
    
    // Increment sequence number for ordering
    actionSequence.current += 1;
    
    // Determine player type for synchronization (host or guest)
    const playerType = isHost ? 'host' : 'guest';
    
    switch (action.type) {
      case 'move':
        // Check if we should throttle movement updates
        const lastMoveTime = lastActionTimes.current.move || 0;
        if (now - lastMoveTime < 33) { // ~30 updates per second max
          return; // Skip this update, too soon
        }
        lastActionTimes.current.move = now;
        
        // Create movement action
        const moveAction = {
          type: 'move',
          playerType,
          playerId: currentUser.uid,
          position: action.position,
          data: {
            direction: action.direction,
            velocity: action.velocity,
            moving: action.moving || false // Add explicit moving flag
          },
          timestamp: now,
          sequence: actionSequence.current
        };
        
        // Send through WebSocket
        webSocketService.sendAction(roomCode, moveAction);
        break;
        
      case 'attack':
        // Rate limit attacks
        const lastAttackTime = lastActionTimes.current.attack || 0;
        if (now - lastAttackTime < 500) { // Max 2 attacks per second
          return;
        }
        lastActionTimes.current.attack = now;
        
        // Get current position data for hit detection (including hitbox)
        const attackPosition = gameCanvasRef.current?.getPlayerPosition() || { x: 0, y: 0 };
        
        // Get additional attack details
        const attackType = action.attackType || 'attack1';
        const damage = action.damage || calculateAttackDamage(attackType, playerCharacter);
        
        // Update local animation immediately for responsive gameplay
        setPlayerAttack({
          type: attackType,
          timestamp: now
        });
        
        // Check if hit was successful
        const wasHit = typeof action.hit === 'boolean' ? action.hit : false;
        
        // If hit was successful, update opponent health immediately for local feedback
        if (wasHit) {
          // Update health state for UI
          setOpponentHealth(prevHealth => Math.max(0, prevHealth - damage));
          
          // Also trigger immediate health sync to ensure both clients are updated
          if (gameCanvasRef.current && webSocketConnected) {
            const playerHealth = gameCanvasRef.current.getPlayerHealth?.() || 100;
            // Calculate new opponent health after hit
            const newOpponentHealth = Math.max(0, opponentHealth - damage);
            
            // Immediate health sync after successful hit
            const healthSyncAction = {
              type: 'health_sync',
              playerType,
              playerId: currentUser.uid,
              data: {
                hostHealth: isHost ? playerHealth : newOpponentHealth,
                guestHealth: isHost ? newOpponentHealth : playerHealth
              },
              timestamp: now,
              sequence: actionSequence.current + 1,
              isCritical: true // Mark as critical for reliable delivery
            };
            
            // Send immediate health sync
            webSocketService.sendAction(roomCode, healthSyncAction);
          }
        }
        
        // Create attack action with comprehensive position and attack data
        const attackAction = {
          type: 'attack',
          playerType,
          playerId: currentUser.uid,
          position: attackPosition,
          data: {
            attackType,
            position: attackPosition,
            direction: action.direction || attackPosition.facing || 'right',
            hit: wasHit,
            damage: damage,
            timestamp: now
          },
          timestamp: now,
          sequence: actionSequence.current,
          isCritical: true // Mark as critical for reliable delivery
        };
        
        // Send through WebSocket
        webSocketService.sendAction(roomCode, attackAction);
        break;
        
      case 'gameOver':
        setIsGameOver(true);
        setWinner(action.winner);
        
        // Process game over through room status update with critical flag
        const isWin = action.winner === 'player1';
        try {
          // Create reliable game over action
          const gameOverAction = {
            type: 'gameOver',
            playerType,
            playerId: currentUser.uid,
            data: {
              winner: isHost ? (isWin ? 'host' : 'guest') : (isWin ? 'guest' : 'host')
            },
            timestamp: now,
            sequence: actionSequence.current,
            isCritical: true
          };
          
          // Send game over action through WebSocket
          webSocketService.sendAction(roomCode, gameOverAction);
          
          // Update room status through REST API as well
          await updateRoomStatus(roomCode, {
            status: 'completed',
            winner: isHost ? (isWin ? 'host' : 'guest') : (isWin ? 'guest' : 'host')
          });
          
          // Update user rating
          if (currentUser && currentUser.uid) {
            console.log('Updating rating for user:', currentUser.uid, 'isWin:', isWin);
            await apiService.updateUserRating(currentUser.uid, isWin);
          } else {
            console.error('Cannot update rating: currentUser.uid is null');
          }
        } catch (error) {
          console.error('Error updating game over status:', error);
        }
        break;
        
      default:
        console.log(`Unhandled action type: ${action.type}`);
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
          player1Character={{
            name: isHost ? roomData?.hostName || currentUser?.displayName || 'You' : roomData?.guestName || currentUser?.displayName || 'You'
          }}
          player2Character={{
            name: isHost ? roomData?.guestName || 'Opponent' : roomData?.hostName || 'Opponent'
          }}
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
