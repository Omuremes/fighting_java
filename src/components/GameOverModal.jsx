import React from 'react';

const GameOverModal = ({ winner, onPlayAgain, onBackToMenu }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
      <div className="bg-gray-900 rounded-xl shadow-2xl px-12 py-10 flex flex-col items-center border-4 border-white">
        <div className="text-5xl font-bold text-white mb-6">
          {winner === 'draw' ? 'Ничья!' : (winner === 'player1' ? 'Вы победили!' : 'Противник победил!')}
        </div>
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
