import React, { createContext, useContext } from 'react';

const SpritesContext = createContext();

export function SpritesProvider({ children }) {
  const getCharacterSpritePath = (character) => {
    if (!character || !character.id) {
      console.log('No character id found, using default path');
      return '/assets/player1/Sprites/';
    }
    
    // Log incoming character data for debugging
    console.log('getCharacterSpritePath called with:', {
      id: character.id,
      name: character.name
    });
      // Create a list of available folders to help with debugging
    console.log('Available asset folders structure: /assets/player1/, /assets/player2/, /assets/player3/');
    
    // Check if this is the Evil Wizard character
    if (character.id === 'player3' || character.name === 'Злой Волшебник') {
      console.log('Evil Wizard character detected, using player3 folder path');
      console.log('Character ID Match:', character.id === 'player3', 'ID:', character.id);
      console.log('Character Name Match:', character.name === 'Злой Волшебник', 'Name:', character.name);
      return `/assets/player3/Sprites/`;
    }
    
    // Определяем тип персонажа на основе name
    const isKnight = character.name === 'Рыцарь';
    const baseFolder = isKnight ? 'player2' : 'player1';
    console.log(`Using path for ${character.name}: /assets/${baseFolder}/Sprites/`);
    return `/assets/${baseFolder}/Sprites/`;
  };
  
  // Get the correct hit animation filename for the character
  const getHitAnimationPath = (character, basePath) => {    if (!character || !character.name) {
      console.log('No character name found, using default hit animation');
      return `${basePath}Take_hit.png`; // Default to player1 format    
    }
    
    // Check if this is the Evil Wizard character
    if (character.id === 'player3' || character.name === 'Злой Волшебник') {
      console.log('Evil Wizard character detected, using "Take hit.png"');
      // URL encode the space in the filename for proper loading
      return `${basePath}${encodeURIComponent('Take hit.png')}`; // Evil Wizard has a space in the filename
    }
      const isKnight = character.name === 'Рыцарь';
    const hitPath = isKnight ? `${basePath}Get_Hit.png` : `${basePath}Take_hit.png`;
    console.log(`Using hit animation for ${character.name}: ${hitPath}`);
    return hitPath;
  };
  
  const checkSpriteExists = async (path) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log(`Sprite exists at ${path}Idle.png`);
        resolve(true);
      };
      img.onerror = () => {
        console.error(`Sprite not found at ${path}Idle.png`);
        resolve(false);
      };
      img.src = `${path}Idle.png`;
    });
  };
    // Add debug function to help diagnose sprite path issues
  const debugSpritePaths = (character) => {
    // First get the normal path
    const path = getCharacterSpritePath(character);
    
    console.group(`📂 Sprite Debug for "${character.name}" (ID: ${character.id})`);
    console.log(`Standard path: ${path}`);
    console.log(`Idle: ${path}Idle.png`);
    console.log(`Run: ${path}Run.png`);
    console.log(`Attack1: ${path}Attack1.png`);
    console.log(`Hit animation: ${getHitAnimationPath(character, path)}`);
      // Add verification for Evil Wizard specifically
    if (character.name === 'Злой Волшебник' || character.id === 'player3') {
      console.log('🧙‍♂️ Evil Wizard Character Detected - Extra Verification:');
      console.log(`Using folder: ${character.id === 'player3' ? '/assets/player3/' : 'INCORRECT FOLDER'}`);
      console.log(`Expected path: /assets/player3/Sprites/`);
      
      // Display both raw and URL-encoded paths for verification
      console.log('Evil Wizard Special File Paths:');
      console.log(`Raw hit path: ${path}Take hit.png`);
      console.log(`Encoded hit path: ${path}${encodeURIComponent('Take hit.png')}`);
      console.log(`Raw death path: ${path}Death.png`);
      console.log(`Encoded death path: ${path}${encodeURIComponent('Death.png')}`);
      
      // Test loading hit animation with proper encoding
      const hitTest = new Image();
      hitTest.onload = () => console.log(`✅ Hit animation found at encoded path`);
      hitTest.onerror = () => console.error(`❌ Hit animation NOT found at encoded path`);
      hitTest.src = `${path}${encodeURIComponent('Take hit.png')}`;
    }
    
    // Test loading an image
    const testImg = new Image();
    testImg.onload = () => console.log(`✅ Successfully loaded test image for ${character.name}`);
    testImg.onerror = () => {
      console.error(`❌ Failed to load test image for ${character.name}`);
      // Add some suggestions if it's the Evil Wizard
      if (character.name === 'Злой Волшебник') {
        console.warn('Try inspecting the Network tab in DevTools to see the exact failed URL');
        console.warn('Check if the file exists at public/assets/player3/Sprites/Idle.png');
      }
    };
    testImg.src = `${path}Idle.png`;
    
    console.groupEnd();
    
    return path;
  };
    const preloadAnimation = async (path, animationName) => {
    return new Promise((resolve) => {
      const img = new Image();      
      
      img.onload = () => {
        console.log(`✅ Preloaded animation: ${animationName} at ${path}`);
        resolve({ success: true, path });
      };
      
      img.onerror = () => {
        console.error(`❌ Failed to preload animation: ${animationName} at ${path}`);
        
        // If the path is for Evil Wizard and might contain spaces, try with encoding
        if (path.includes('player3') && path.includes(' ')) {
          console.log(`Attempting to fix Evil Wizard path with encoding...`);
          // Path already has spaces, but might need encoding
          const basePath = path.substring(0, path.lastIndexOf('/') + 1);
          const filename = path.substring(path.lastIndexOf('/') + 1);
          const encodedPath = `${basePath}${encodeURIComponent(filename)}`;
          
          console.log(`Trying encoded path: ${encodedPath}`);
          const retryImg = new Image();
          retryImg.onload = () => {
            console.log(`✅ Preloaded with encoding: ${animationName} at ${encodedPath}`);
            resolve({ success: true, path: encodedPath, originalPath: path });
          };
          retryImg.onerror = () => {
            console.error(`❌ Failed even with encoding: ${animationName}`);
            resolve({ success: false, path });
          };
          retryImg.src = encodedPath;
        } else {
          resolve({ success: false, path });
        }
      };
      
      img.src = path;
    });
  };
  
  const value = {
    getCharacterSpritePath,
    getHitAnimationPath,
    checkSpriteExists,
    preloadAnimation,
    debugSpritePaths
  };

  return (
    <SpritesContext.Provider value={value}>
      {children}
    </SpritesContext.Provider>  );
}

export function useSprites() {
  return useContext(SpritesContext);
}
