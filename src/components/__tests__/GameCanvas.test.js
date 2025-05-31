import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameCanvas from '../GameCanvas';

// Mock Player class to avoid sprite loading issues
jest.mock('../../classes/Player', () => {
  return jest.fn().mockImplementation(({ ctx, imageSrc, position, frameCount, width, height }) => ({
    ctx,
    image: { src: imageSrc, complete: true, naturalWidth: 100 },
    imageLoaded: true,
    imageError: false,
    position: { ...position },
    width,
    height,
    frameCount,
    currentFrame: 0,
    framesElapsed: 0,
    animationSpeed: 0.1,
    facing: 'right',
    velocityY: 0,
    onGround: true,
    currentAnimation: 'idle',
    animations: {},
    locked: false,
    animationEnded: false,
    deathAnimationCompleted: false,
    loadRetries: 0,
    maxRetries: 2,
    setAnimations: jest.fn(),
    validateAnimation: jest.fn(() => true),
    setFacing: jest.fn(),
    setOnGround: jest.fn(),
    setVelocityY: jest.fn(),
    switchAnimation: jest.fn(),
    update: jest.fn(),
    forceDeathAnimation: jest.fn(),
    completeReset: jest.fn(),
    isAnimationComplete: jest.fn(() => false)
  }));
});

// Mock useSprites hook with explicit return values
const mockSpritesContext = {
  getCharacterSpritePath: jest.fn((character) => {
    console.log('getCharacterSpritePath called with:', character);
    if (!character || !character.id) {
      console.log('Returning default path for undefined character');
      return '/assets/player1/Sprites/';
    }
    if (character.id === 'player3' || character.name === 'Злой Волшебник') {
      console.log('Returning player3 path');
      return '/assets/player3/Sprites/';
    }
    const isKnight = character.name === 'Рыцарь';
    const baseFolder = isKnight ? 'player2' : 'player1';
    const path = `/assets/${baseFolder}/Sprites/`;
    console.log(`Returning path: ${path} for character:`, character.name);
    return path;
  }),
  getHitAnimationPath: jest.fn((character, basePath) => {
    if (!character || !character.name) return `${basePath}Take_hit.png`;
    if (character.id === 'player3' || character.name === 'Злой Волшебник') {
      return `${basePath}${encodeURIComponent('Take hit.png')}`;
    }
    const isKnight = character.name === 'Рыцарь';
    return isKnight ? `${basePath}Get_Hit.png` : `${basePath}Take_hit.png`;
  }),
  checkSpriteExists: jest.fn().mockResolvedValue(true),
  preloadAnimation: jest.fn(() => {
    console.log('preloadAnimation called - returning success');
    return Promise.resolve({ success: true, path: '/mock/path/' });
  }),
  debugSpritePaths: jest.fn()
};

jest.mock('../../contexts/SpritesContext', () => ({
  useSprites: () => mockSpritesContext
}));

describe('GameCanvas Movement Synchronization', () => {
  const mockPlayerCharacter = {
    id: 'player1',
    name: 'Test Hero',
    stats: { attack: 5, defense: 5, speed: 5 }
  };

  const mockOpponentCharacter = {
    id: 'player2', 
    name: 'Рыцарь',
    stats: { attack: 5, defense: 5, speed: 5 }
  };

  let mockOnPlayerAction;
  let mockCtx;

  beforeEach(() => {
    mockOnPlayerAction = jest.fn();
    
    // Mock canvas context with more complete methods
    mockCtx = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      scale: jest.fn(),
      translate: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 })),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      globalAlpha: 1
    };

    // Mock HTMLCanvasElement
    HTMLCanvasElement.prototype.getContext = jest.fn(() => mockCtx);
    Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
      get: () => 1024,
      set: jest.fn()
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
      get: () => 768,
      set: jest.fn()
    });

    // Mock Image constructor to load immediately
    global.Image = class {
      constructor() {
        this.complete = true;
        this.naturalWidth = 100;
        this.width = 100;
        this.height = 100;
        // Immediately trigger onload
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
      set src(value) {
        this._src = value;
      }
      get src() {
        return this._src;
      }
    };

    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
    global.cancelAnimationFrame = jest.fn();

    // Mock window.addEventListener
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();

    jest.clearAllMocks();
  });

  describe('Online Mode Control Isolation', () => {
    test('blocks Player 2 controls in online mode', async () => {
      render(
        <GameCanvas
          gameMode="online"
          playerCharacter={mockPlayerCharacter}
          opponentCharacter={mockOpponentCharacter}
          onPlayerAction={mockOnPlayerAction}
          isHost={true}
        />
      );

      // Wait for component initialization and sprite loading
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      // Test Player 2 movement controls (should be blocked)
      fireEvent.keyDown(document, { code: 'ArrowLeft' });
      fireEvent.keyDown(document, { code: 'ArrowRight' });
      fireEvent.keyDown(document, { code: 'ArrowUp' });

      // Test Player 2 attack controls (should be blocked)
      fireEvent.keyDown(document, { code: 'KeyK' });
      fireEvent.keyDown(document, { code: 'KeyL' });

      // No actions should be triggered for Player 2 controls
      expect(mockOnPlayerAction).not.toHaveBeenCalled();
    });

    test('allows Player 1 controls in online mode', async () => {
      render(
        <GameCanvas
          gameMode="online"
          playerCharacter={mockPlayerCharacter}
          opponentCharacter={mockOpponentCharacter}
          onPlayerAction={mockOnPlayerAction}
          isHost={true}
        />
      );

      // Wait for component initialization and sprite loading
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      // Test Player 1 movement
      fireEvent.keyDown(document, { code: 'KeyD' });
      
      expect(mockOnPlayerAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'move',
          direction: 'right',
          moving: true
        })
      );
    });

    test('allows Player 1 attacks in online mode', async () => {
      render(
        <GameCanvas
          gameMode="online"
          playerCharacter={mockPlayerCharacter}
          opponentCharacter={mockOpponentCharacter}
          onPlayerAction={mockOnPlayerAction}
          isHost={true}
        />
      );

      // Wait for component initialization and sprite loading
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      // Test Player 1 attack controls
      fireEvent.keyDown(document, { code: 'KeyE' });
      fireEvent.keyDown(document, { code: 'KeyQ' });

      expect(mockOnPlayerAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'attack'
        })
      );
    });
  });

  describe('Local Mode Controls', () => {
    test('allows both players to control in local modes', async () => {
      render(
        <GameCanvas
          gameMode="two-players"
          playerCharacter={mockPlayerCharacter}
          opponentCharacter={mockOpponentCharacter}
          onPlayerAction={mockOnPlayerAction}
        />
      );

      // Wait for component initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      // Test Player 1 controls
      fireEvent.keyDown(document, { code: 'KeyD' });
      expect(mockOnPlayerAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'move',
          player: 'player1',
          direction: 'right'
        })
      );

      mockOnPlayerAction.mockClear();

      // Test Player 2 controls (should work in local mode)
      fireEvent.keyDown(document, { code: 'ArrowLeft' });
      expect(mockOnPlayerAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'move',
          player: 'player2',
          direction: 'left'
        })
      );
    });

    test('allows Player 2 attacks in local modes', async () => {
      render(
        <GameCanvas
          gameMode="two-players"
          playerCharacter={mockPlayerCharacter}
          opponentCharacter={mockOpponentCharacter}
          onPlayerAction={mockOnPlayerAction}
        />
      );

      // Wait for component initialization
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
      });

      // Test Player 2 attack controls
      fireEvent.keyDown(document, { code: 'KeyK' });
      fireEvent.keyDown(document, { code: 'KeyL' });

      expect(mockOnPlayerAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'attack',
          player: 'player2'
        })
      );
    });
  });
});
