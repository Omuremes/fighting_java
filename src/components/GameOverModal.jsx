import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const GameOverModal = ({ winner, onPlayAgain, onBackToMenu, rewardData }) => {
  const { currentUser } = useAuth();
  const [showRewards, setShowRewards] = useState(false);
  const [displayValues, setDisplayValues] = useState({
    coinEarned: 0,
    gemEarned: 0,
    totalCoin: 0,
    totalGem: 0
  });
  
  // Обновление отображаемых значений при изменении rewardData или currentUser
  useEffect(() => {
    // Инициализируем значения по умолчанию
    const defaultValues = {
      coinEarned: 0,
      gemEarned: 0,
      totalCoin: currentUser?.coin || 0,
      totalGem: currentUser?.gem || 0
    };
    
    // Обновляем из rewardData, если доступны
    if (rewardData) {
      setDisplayValues({
        coinEarned: rewardData.coinEarned || defaultValues.coinEarned,
        gemEarned: rewardData.gemEarned || defaultValues.gemEarned,
        totalCoin: rewardData.totalCoin || currentUser?.coin || defaultValues.totalCoin,
        totalGem: rewardData.totalGem || currentUser?.gem || defaultValues.totalGem
      });
      
      console.log("%c[REWARDS] Setting display values from rewardData", 
                 "background: #FF5722; color: white; padding: 2px 5px; border-radius: 2px;", {
        rewardData,
        currentUser: {
          coin: currentUser?.coin,
          gem: currentUser?.gem
        },
        displayValues: {
          coinEarned: rewardData.coinEarned || defaultValues.coinEarned,
          gemEarned: rewardData.gemEarned || defaultValues.gemEarned,
          totalCoin: rewardData.totalCoin || currentUser?.coin || defaultValues.totalCoin,
          totalGem: rewardData.totalGem || currentUser?.gem || defaultValues.totalGem
        }
      });
    }
    // Если нет rewardData, но есть currentUser, используем данные из currentUser
    else if (currentUser) {
      console.log("%c[REWARDS] No rewardData available, using currentUser", 
                 "background: #FF5722; color: white; padding: 2px 5px; border-radius: 2px;", {
        currentUser: {
          coin: currentUser?.coin,
          gem: currentUser?.gem
        }
      });
    }
  }, [rewardData, currentUser]);
  
  // Анимация наград
  useEffect(() => {
    if (winner === 'player1' && currentUser) {
      const timer = setTimeout(() => {
        setShowRewards(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [winner, currentUser]);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
      <div className="bg-gray-900 rounded-xl shadow-2xl px-12 py-10 flex flex-col items-center border-4 border-white">
        <div className="text-5xl font-bold text-white mb-6">
          {winner === 'draw' ? 'Ничья!' : (winner === 'player1' ? 'Вы победили!' : 'Противник победил!')}
        </div>
        
        {/* Отображение наград для победителя */}
        {winner === 'player1' && currentUser && (
          <div className={`bg-gray-800 rounded-lg p-4 mb-6 transition-all duration-500 ${showRewards ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
            <h3 className="text-yellow-400 text-xl font-bold mb-2">Заработано:</h3>            
            <div className="flex justify-center space-x-6">              
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span className="text-white text-lg font-bold">+{displayValues.coinEarned} монет</span>
                <span className="text-gray-400 text-sm ml-2">(всего: {displayValues.totalCoin || currentUser?.coin || 0})</span>
              </div>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
                <span className="text-white text-lg font-bold">+{displayValues.gemEarned} кристалл</span>
                <span className="text-gray-400 text-sm ml-2">(всего: {displayValues.totalGem || currentUser?.gem || 0})</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-4 w-full">
          <button
            className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-2xl font-semibold rounded-lg shadow-lg transition"
            onClick={onPlayAgain}
          >
            Играть снова
          </button>
          <button
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-2xl font-semibold rounded-lg shadow-lg transition"
            onClick={onBackToMenu}
          >
            Вернуться в меню
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
