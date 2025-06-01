import React, { useEffect, useRef, useState } from 'react';

const GameHud = ({ player1Character, player2Character, player1Health, player2Health }) => {
  // Keep refs to previous health values for animation
  const prevPlayer1Health = useRef(player1Health);
  const prevPlayer2Health = useRef(player2Health);
  const player1BarRef = useRef(null);
  const player2BarRef = useRef(null);
  
  // Track animation states
  const [player1Damaged, setPlayer1Damaged] = useState(false);
  const [player2Damaged, setPlayer2Damaged] = useState(false);
  
  // Add flash effect when health decreases
  useEffect(() => {
    // Check if health decreased
    if (player1Health < prevPlayer1Health.current && player1BarRef.current) {
      // Add flash effect
      player1BarRef.current.classList.add('health-decrease');
      setPlayer1Damaged(true);
      
      // Play damage sound effect
      playDamageSound();
      
      // Remove class after animation completes
      setTimeout(() => {
        if (player1BarRef.current) {
          player1BarRef.current.classList.remove('health-decrease');
        }
        
        setTimeout(() => setPlayer1Damaged(false), 200);
      }, 500);
    }
    
    // Update previous health
    prevPlayer1Health.current = player1Health;
  }, [player1Health]);
  
  // Add flash effect when opponent health decreases
  useEffect(() => {
    // Check if health decreased
    if (player2Health < prevPlayer2Health.current && player2BarRef.current) {
      // Add flash effect
      player2BarRef.current.classList.add('health-decrease');
      setPlayer2Damaged(true);
      
      // Play damage sound effect
      playDamageSound();
      
      // Remove class after animation completes
      setTimeout(() => {
        if (player2BarRef.current) {
          player2BarRef.current.classList.remove('health-decrease');
        }
        
        setTimeout(() => setPlayer2Damaged(false), 200);
      }, 500);
    }
    
    // Update previous health
    prevPlayer2Health.current = player2Health;
  }, [player2Health]);
  
  // Simple sound effect function (can be replaced with actual sound implementation)
  const playDamageSound = () => {
    try {
      // This is a placeholder - in a real implementation you'd use the Web Audio API
      // or an audio library to play actual sounds
      console.log("Playing damage sound effect");
      
      // Example of actual sound implementation (commented out)
      // const sound = new Audio('/assets/sounds/hit.mp3');
      // sound.volume = 0.7;
      // sound.play().catch(err => console.error("Error playing sound:", err));
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };
  
  return (
    <div className="absolute top-4 left-0 right-0 z-10 flex justify-between px-8">
      {/* Player 1 (current player) */}
      <div className="flex flex-col items-start">
        <div className={`text-white font-bold text-xl mb-1 ${player1Damaged ? 'animate-pulse text-red-500' : ''}`}>
          {player1Character?.name || 'Player 1'}
        </div>
        <div className="relative w-64 h-6 bg-gray-800 rounded-full overflow-hidden border-2 border-white">
          <div 
            ref={player1BarRef}
            className={`absolute top-0 left-0 h-full bg-red-600 transition-all duration-300 ${player1Health < 25 ? 'health-critical' : ''}`}
            style={{ width: `${Math.max(0, player1Health)}%` }}
          ></div>
          <div 
            className="absolute top-0 left-0 h-full bg-white opacity-30 transition-all duration-150" 
            style={{ 
              width: `${Math.max(0, player1Health)}%`,
              transform: player1Damaged ? 'scaleX(1.05)' : 'scaleX(1)'
            }}
          ></div>
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            <span className={`font-bold text-sm drop-shadow-lg ${player1Damaged ? 'text-red-300' : 'text-white'} ${player1Health < 25 ? 'animate-pulse text-red-200' : ''}`}>
              {Math.max(0, Math.round(player1Health))}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Player 2 (opponent) */}
      <div className="flex flex-col items-end">
        <div className={`text-white font-bold text-xl mb-1 ${player2Damaged ? 'animate-pulse text-red-500' : ''}`}>
          {player2Character?.name || 'Player 2'}
        </div>
        <div className="relative w-64 h-6 bg-gray-800 rounded-full overflow-hidden border-2 border-white">
          <div 
            ref={player2BarRef}
            className={`absolute top-0 right-0 h-full bg-blue-600 transition-all duration-300 ${player2Health < 25 ? 'health-critical' : ''}`}
            style={{ width: `${Math.max(0, player2Health)}%` }}
          ></div>
          <div 
            className="absolute top-0 right-0 h-full bg-white opacity-30 transition-all duration-150" 
            style={{ 
              width: `${Math.max(0, player2Health)}%`,
              transform: player2Damaged ? 'scaleX(1.05)' : 'scaleX(1)'
            }}
          ></div>
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            <span className={`font-bold text-sm drop-shadow-lg ${player2Damaged ? 'text-red-300' : 'text-white'} ${player2Health < 25 ? 'animate-pulse text-red-200' : ''}`}>
              {Math.max(0, Math.round(player2Health))}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameHud;
