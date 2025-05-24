import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import GameCanvas from '../components/GameCanvas';
import GameOverModal from '../components/GameOverModal';
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
  
  // Обработка действий игрока
  const handlePlayerAction = (action) => {
    if (action.type === 'gameOver') {
      setIsGameOver(true);
      setWinner(action.winner);
      
      // Обновляем рейтинг пользователя в онлайн режиме
      if (gameMode === 'online' && currentUser) {
        const isWin = action.winner === 'player1';
        updateRating(currentUser.uid, isWin);
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

  return (
    <div className="relative w-full h-screen overflow-hidden">
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
        />
      )}
    </div>
  );
};

export default GameScreen;