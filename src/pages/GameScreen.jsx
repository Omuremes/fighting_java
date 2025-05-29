import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import GameCanvas from '../components/GameCanvas';
import GameOverModal from '../components/GameOverModal';
import GameHud from '../components/GameHud';
import { useAuth } from '../contexts/AuthContext';

const GameScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { currentUser, updateRating } = useAuth();
  
  const [gameMode, setGameMode] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [opponentCharacter, setOpponentCharacter] = useState(null);
    // Инициализация состояния игры при загрузке компонента
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Получаем режим игры из URL параметров
    const mode = params.mode || 'two-players';
    setGameMode(mode);
    
    // Обработка для режима двух игроков
    if (mode === 'two-players' && location.state?.player1Character && location.state?.player2Character) {
      setSelectedCharacter(location.state.player1Character);
      setOpponentCharacter(location.state.player2Character);
    }
    // Обработка для одиночной игры или онлайн режима
    else if (location.state?.character) {
      setSelectedCharacter(location.state.character);
      // Для одиночной игры выбираем противника случайно
      if (mode === 'single-player' && !opponentCharacter) {
        // Используем локальный путь для спрайтов
        setOpponentCharacter({
          id: 'character2',
          name: 'Рыцарь',
          // Не нужно указывать полный путь к изображению,
          // так как GameCanvas теперь всегда использует локальные пути
        });
      }
    } else {
      // Если персонаж не выбран, возвращаемся в меню
      navigate('/');
    }
  }, [currentUser, navigate, params, location.state]);
    // Для хранения информации о наградах
  const [rewardData, setRewardData] = useState(null);  // Обработка действий игрока
  const handlePlayerAction = async (action) => {
    if (action.type === 'gameOver') {
      setIsGameOver(true);
      setWinner(action.winner);
      
      // Обновляем рейтинг пользователя в онлайн режиме или в одиночной игре
      if ((gameMode === 'online' || gameMode === 'single-player') && currentUser) {
        const isWin = action.winner === 'player1';
        
        logDiagnostic('Game over - updating rewards', { 
          uid: currentUser.uid,
          isWin,
          gameMode,
          beforeUpdate: {
            coin: currentUser.coin,
            gem: currentUser.gem,
            rating: currentUser.rating
          }
        });
        
        try {
          // Проверяем доступность бэкенда перед продолжением
          logDiagnostic('Checking backend connectivity', {timestamp: new Date().toISOString()});
          
          let backendAvailable = false;
          try {
            const testResponse = await fetch('/api/users', {
              signal: AbortSignal.timeout(2000) // Таймаут 2 секунды
            });
            backendAvailable = testResponse.ok;
            logDiagnostic('Backend check result', {available: backendAvailable, status: testResponse.status});
          } catch (err) {
            logDiagnostic('Backend check failed', {error: err.message});
          }
          
          // Фиксируем начальное состояние для сравнения
          const initialState = {
            coin: currentUser.coin,
            gem: currentUser.gem,
            rating: currentUser.rating
          };
          
          // Вызываем обновление рейтинга
          logDiagnostic('Calling updateRating', {isWin, backendAvailable});
          const result = await updateRating(currentUser.uid, isWin);
          
          logDiagnostic('Rating update result', result);
          
          if (result) {
            const rewardInfo = {
              coinEarned: result.coinEarned,
              gemEarned: result.gemEarned,
              totalCoin: result.totalCoin,
              totalGem: result.totalGem
            };
            
            setRewardData(rewardInfo);
            
            logDiagnostic('Reward data set', rewardInfo);
            
            // Несколько проверок для убеждения, что onSnapshot работает и обновления применились
            const multipleChecks = async () => {
              for (let i = 1; i <= 3; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000 * i));
                
                logDiagnostic(`Verification check #${i}`, {
                  expected: {
                    coin: result.totalCoin,
                    gem: result.totalGem
                  },
                  actual: {
                    coin: currentUser.coin,
                    gem: currentUser.gem
                  },
                  synced: currentUser.coin === result.totalCoin && currentUser.gem === result.totalGem
                });
                
                if (currentUser.coin === result.totalCoin && currentUser.gem === result.totalGem) {
                  logDiagnostic('Values synced successfully!', {check: i});
                  break;
                }
                
                // Если это последняя проверка и данные всё еще не синхронизированы
                if (i === 3 && (currentUser.coin !== result.totalCoin || currentUser.gem !== result.totalGem)) {
                  logDiagnostic('WARNING: Values still not synced after all checks', {
                    initialState,
                    expected: {
                      coin: result.totalCoin,
                      gem: result.totalGem
                    },
                    actual: {
                      coin: currentUser.coin,
                      gem: currentUser.gem
                    }
                  });
                }
              }
            };
            
            multipleChecks();
          } else {
            logDiagnostic('No result from updateRating', { isWin });
            
            // Запасной вариант - просто показываем предполагаемую награду
            const fallbackRewards = {
              coinEarned: isWin ? 25 : 5,
              gemEarned: isWin ? 1 : 0,
              totalCoin: (currentUser.coin || 0) + (isWin ? 25 : 5),
              totalGem: (currentUser.gem || 0) + (isWin ? 1 : 0)
            };
            
            setRewardData(fallbackRewards);
            logDiagnostic('Using fallback rewards', fallbackRewards);
          }
        } catch (error) {
          console.error('Error updating rating:', error);
          logDiagnostic('Error in rating update', { error: error.message });
          
          // Запасной вариант - просто показываем предполагаемую награду
          setRewardData({
            coinEarned: isWin ? 25 : 5,
            gemEarned: isWin ? 1 : 0
          });
        }
      }
    }
  };
  
  // Обработка кнопки "Играть снова"
  const handlePlayAgain = () => {
    setIsGameOver(false);
    setWinner(null);
    // Перезагружаем текущую страницу для сброса игры
    window.location.reload();
  };
  
  // Обработка кнопки "Вернуться в меню"
  const handleBackToMenu = () => {
    navigate('/');
  };

  // Функция для диагностического логирования
  const logDiagnostic = (message, data) => {
    console.log(`%c[DIAGNOSTIC] ${message}`, 'background: #2E2EFF; color: white; padding: 2px 5px; border-radius: 2px;', data);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Отображение игровой валюты */}
      <GameHud />
      
      {/* Условный рендеринг GameCanvas с выбранным персонажем */}
      {selectedCharacter && (
        <GameCanvas 
          gameMode={gameMode}
          onPlayerAction={handlePlayerAction}
          playerCharacter={selectedCharacter}
          opponentCharacter={opponentCharacter}
        />
      )}
        {/* Модальное окно окончания игры */}
      {isGameOver && (
        <GameOverModal 
          winner={winner}
          onPlayAgain={handlePlayAgain}
          onBackToMenu={handleBackToMenu}
          rewardData={rewardData}
        />
      )}
    </div>
  );
};

export default GameScreen;