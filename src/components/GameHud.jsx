import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const GameHud = () => {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return null; // Ничего не отображаем, если пользователь не авторизован
  }

  return (
    <div className="absolute top-2 left-2 z-10">
      <div className="flex space-x-2">
        <div className="flex items-center bg-yellow-700 bg-opacity-90 px-3 py-1 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
          <span className="text-yellow-400 font-bold">{currentUser.coin || 0}</span>
        </div>
        <div className="flex items-center bg-purple-900 bg-opacity-90 px-3 py-1 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
          </svg>
          <span className="text-purple-400 font-bold">{currentUser.gem || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default GameHud;
