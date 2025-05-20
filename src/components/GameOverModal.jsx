import React from 'react';

const GameOverModal = ({ winner, onRestart }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
      <div className="bg-gray-900 rounded-xl shadow-2xl px-12 py-10 flex flex-col items-center border-4 border-white">
        <div className="text-5xl font-bold text-white mb-6">
          {winner === 'Ничья' ? 'Draw!' : `${winner} победил!`}
        </div>
        <button
          className="mt-4 px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-2xl font-semibold rounded-lg shadow-lg transition"
          onClick={onRestart}
        >
          Начать заново
        </button>
      </div>
    </div>
  );
};

export default GameOverModal;
