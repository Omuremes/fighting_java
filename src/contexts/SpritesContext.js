import React, { createContext, useContext } from 'react';

const SpritesContext = createContext();

export function SpritesProvider({ children }) {
  const getCharacterSpritePath = (character) => {
    if (!character || !character.id) {
      return '/assets/player1/Sprites/';
    }
    // Определяем тип персонажа на основе name
    const isKnight = character.name === 'Рыцарь';
    const baseFolder = isKnight ? 'player2' : 'player1';
    return `/assets/${baseFolder}/Sprites/`;
  };

  // Get the correct hit animation filename for the character
  const getHitAnimationPath = (character, basePath) => {
    if (!character || !character.name) {
      return `${basePath}Take_hit.png`; // Default to player1 format
    }
    
    const isKnight = character.name === 'Рыцарь';
    return isKnight ? `${basePath}Get_Hit.png` : `${basePath}Take_hit.png`;
  };

  const checkSpriteExists = async (path) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = `${path}Idle.png`;
    });
  };
  
  const preloadAnimation = async (path, animationName) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log(`Preloaded animation: ${animationName} at ${path}`);
        resolve({ success: true, path });
      };
      img.onerror = () => {
        console.error(`Failed to preload animation: ${animationName} at ${path}`);
        resolve({ success: false, path });
      };
      img.src = path;
    });
  };
  const value = {
    getCharacterSpritePath,
    getHitAnimationPath,
    checkSpriteExists,
    preloadAnimation
  };

  return (
    <SpritesContext.Provider value={value}>
      {children}
    </SpritesContext.Provider>
  );
}

export function useSprites() {
  return useContext(SpritesContext);
}
