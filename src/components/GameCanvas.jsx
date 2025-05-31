import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import Player from '../classes/Player';
import { useSprites } from '../contexts/SpritesContext';

const GameCanvas = forwardRef(({ 
  gameMode, 
  onPlayerAction, 
  playerCharacter, 
  opponentCharacter,
  playerPosition,
  opponentPosition,
  playerAttack,
  opponentAttack,
  isHost 
}, ref) => {
  const { getCharacterSpritePath, getHitAnimationPath, checkSpriteExists, preloadAnimation } = useSprites();
  
  // Player refs and state management
  const canvasRef = useRef(null);
  const player1Ref = useRef(null);
  const player2Ref = useRef(null);
  const player1Pos = useRef({ x: 0, y: 0 });
  const player2Pos = useRef({ x: 0, y: 0 });
  const player1Velocity = useRef({ x: 0, y: 0 });
  const player2Velocity = useRef({ x: 0, y: 0 });

  // Simplified position handling for online mode
  const handleOpponentPositionUpdate = useCallback((newPosition) => {
    if (gameMode === 'online' && newPosition && player2Pos.current) {
      // Enhanced position update with interpolation for smoother movement
      // Calculate the distance to move for smoother transitions
      const dx = newPosition.x - player2Pos.current.x;
      const dy = newPosition.y - player2Pos.current.y;
      
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If the distance is large (teleport or correction), move directly
      if (distance > 100) {
        player2Pos.current.x = newPosition.x;
        player2Pos.current.y = newPosition.y;
      } else {
        // Otherwise, move incrementally for smoother animation
        // Apply 50% of the movement immediately for responsiveness
        player2Pos.current.x += dx * 0.5;
        player2Pos.current.y += dy * 0.5;
        
        // Update velocity for smooth movement between updates
        player2Velocity.current.x = dx * 0.5;
        player2Velocity.current.y = dy * 0.1;
      }
      
      // Update player reference directly
      if (player2Ref.current) {
        player2Ref.current.position = player2Pos.current;
      }
    }
  }, [gameMode]);
  
  // Update opponent position when prop changes
  useEffect(() => {
    if (gameMode === 'online' && opponentPosition) {
      handleOpponentPositionUpdate(opponentPosition);
    }
  }, [opponentPosition, gameMode, handleOpponentPositionUpdate]);
  
  // Character stats references from Firebase
  const player1Stats = useRef({
    attack: playerCharacter?.stats?.attack || 5,
    defense: playerCharacter?.stats?.defense || 5,
    speed: playerCharacter?.stats?.speed || 5
  });
  
  const player2Stats = useRef({
    attack: opponentCharacter?.stats?.attack || 5,
    defense: opponentCharacter?.stats?.defense || 5,
    speed: opponentCharacter?.stats?.speed || 5
  });
  
  // Update stats when character data changes
  useEffect(() => {
    if (playerCharacter?.stats) {
      player1Stats.current = {
        attack: playerCharacter.stats.attack,
        defense: playerCharacter.stats.defense,
        speed: playerCharacter.stats.speed
      };
      console.log('Updated Player 1 stats:', player1Stats.current);
    }
    
    if (opponentCharacter?.stats) {
      player2Stats.current = {
        attack: opponentCharacter.stats.attack,
        defense: opponentCharacter.stats.defense,
        speed: opponentCharacter.stats.speed
      };
      console.log('Updated Player 2 stats:', player2Stats.current);
    }
  }, [playerCharacter, opponentCharacter]);
  
  // Health, round and attack state
  const player1Health = useRef(100);
  const player2Health = useRef(100);
  const round = useRef(1);
  const player1Attack = useRef({ inProgress: false, type: null, wasHit: false });
  const player2Attack = useRef({ inProgress: false, type: null, wasHit: false });
  const preloadedAnimations = useRef({});
  
  // Animation and UI state
  const [showRoundText, setShowRoundText] = useState(true);
  const [roundTextOpacity, setRoundTextOpacity] = useState(1);
  const player1Wins = useRef(0);
  const player2Wins = useRef(0);
  const baseSpeed = 5;
  const gravity = 0.10;
    // Expose methods to the parent component through ref for online mode
  useImperativeHandle(ref, () => ({
    receiveOpponentAttack: (attackData) => {
      // This function will be called when opponent's attack hits the player
      if (player1Health.current > 0) {
        const damage = attackData.damage || 5; // Default damage if not specified
        
        // Apply damage with minimum bound
        const newHealth = Math.max(0, player1Health.current - damage);
        player1Health.current = newHealth;
        
        // Trigger hit animation only if player is still alive
        if (newHealth > 0) {
          player1Attack.current = { ...player1Attack.current, wasHit: true };
          player1Ref.current.switchAnimation('getHit');
        } else {
          // Player was defeated, trigger death animation
          player1Ref.current.forceDeathAnimation();
          player2Wins.current += 1;
        }
        
        // Check game over conditions
        if (player2Wins.current >= 2) {
          // Game over, opponent wins
          onPlayerAction?.({ 
            type: 'gameOver', 
            winner: 'player2' 
          });
        } else if (newHealth <= 0) {
          // Start new round
          setTimeout(() => {
            round.current += 1;
            player1Health.current = 100;
            player2Health.current = 100;
            setShowRoundText(true);
            setRoundTextOpacity(1);
          }, 2000);
        }
        
        // Report hit to the parent component with updated health
        onPlayerAction?.({ 
          type: 'hit', 
          damage: damage,
          remainingHealth: newHealth 
        });
      }
    },
    
    updateOpponentPosition: (position) => {
      // Update opponent position directly
      if (position && player2Pos.current) {
        player2Pos.current = position;
      }
    },
    
    // Expose health getters for real-time sync
    getPlayerHealth: () => player1Health.current,
    getOpponentHealth: () => player2Health.current,
    
    // Method to sync health from server
    updateHealth: (playerHealth, opponentHealth) => {
      if (typeof playerHealth === 'number' && playerHealth >= 0) {
        player1Health.current = playerHealth;
      }
      if (typeof opponentHealth === 'number' && opponentHealth >= 0) {
        player2Health.current = opponentHealth;
      }
      
      // Trigger death animations if health reaches 0
      if (player1Health.current <= 0 && player1Ref.current?.currentAnimation !== 'death') {
        player1Ref.current.forceDeathAnimation();
      }
      if (player2Health.current <= 0 && player2Ref.current?.currentAnimation !== 'death') {
        player2Ref.current.forceDeathAnimation();
      }
    },
    
    // Enhanced method to update opponent's attack state for better sync
    processOpponentAttack: (attackData) => {
      if (!player2Ref.current || !attackData) return;
      
      const { type, hit, damage, timestamp } = attackData;
      
      // Prevent duplicate processing using timestamp
      if (player2Attack.current.timestamp === timestamp) return;
      
      // Update attack state
      player2Attack.current = { 
        inProgress: true, 
        type, 
        timestamp,
        hit,
        damage 
      };
      
      // Trigger attack animation
      player2Ref.current.switchAnimation(type);
      
      // If attack hits player 1, apply damage
      if (hit && damage > 0) {
        const newHealth = Math.max(0, player1Health.current - damage);
        player1Health.current = newHealth;
        
        // Trigger appropriate animation
        if (newHealth > 0) {
          player1Ref.current.switchAnimation('getHit');
          player1Attack.current.wasHit = true;
        } else {
          player1Ref.current.forceDeathAnimation();
        }
        
        // Report the hit
        onPlayerAction?.({ 
          type: 'hit', 
          damage: damage,
          remainingHealth: newHealth 
        });
      }
    }
  }));

  // Event handling function - wrapped in useCallback to prevent re-renders
  const handleGameEvent = useCallback((eventType, eventData) => {
    switch (eventType) {
      case 'damage':
        if (eventData.target === 'player1') {
          player1Health.current = Math.max(0, player1Health.current - eventData.amount);
        } else if (eventData.target === 'player2') {
          player2Health.current = Math.max(0, player2Health.current - eventData.amount);
        }
        break;
      
      case 'round_end':
        if (eventData.winner === 'player1') {
          player1Wins.current += 1;
        } else if (eventData.winner === 'player2') {
          player2Wins.current += 1;
        }
        round.current += 1;
        break;
      
      default:
        break;
    }
    
    onPlayerAction?.({ type: eventType, ...eventData });
  }, [onPlayerAction]);

  // Initialize game settings
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !playerCharacter || !opponentCharacter) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;    

    // Function to determine frame counts for animations
    const getFrameCount = (characterPath, animationType, characterName, characterId) => {
      if (!characterName) {
        console.warn('getFrameCount called without characterName', { characterPath, animationType });
        return 4; // Default fallback
      }
      
      // Check by both name and ID to ensure correct character detection
      const isKnight = characterName === 'Рыцарь';
      const isEvilWizard = characterName === 'Злой Волшебник' || characterId === 'player3';
      
      console.log('getFrameCount:', {
        characterName,
        characterId,
        animationType,
        isKnight,
        isEvilWizard,
        path: characterPath
      });
      
      const frameCountMap = {
        knight: {
          idle: 10,
          run: 6,
          jump: 2,
          fall: 2,
          attack1: 4,
          attack2: 4,
          attack3: 5,
          getHit: 3,
          death: 9
        },
        samurai: {
          idle: 4,
          run: 8,
          jump: 2,
          fall: 2,
          attack1: 4,
          attack2: 4,
          getHit: 3,
          death: 7
        },
        evilWizard: {
          idle: 8,
          run: 8,
          jump: 2,
          fall: 2,
          attack1: 8,
          attack2: 8,
          getHit: 3,
          death: 7
        }
      };
    if (isEvilWizard) {
        console.log(`Using Evil Wizard frame count for ${animationType}`);
        const frameCount = frameCountMap.evilWizard[animationType];
        if (frameCount === undefined) {
          console.warn(`No frame count defined for Evil Wizard animation "${animationType}"`);
          return 4; // Default fallback
        }
        return frameCount;
      } else if (isKnight) {
        const frameCount = frameCountMap.knight[animationType];
        if (frameCount === undefined) {
          console.warn(`No frame count defined for Knight animation "${animationType}"`);
          return 4; // Default fallback
        }
        return frameCount;
      } else {
        const frameCount = frameCountMap.samurai[animationType];
        if (frameCount === undefined) {
          console.warn(`No frame count defined for Samurai animation "${animationType}"`);
          return 4; // Default fallback
        }
        return frameCount;
      }
    };

  // Set up canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Load background
    const background = new Image();
    background.src = '/assets/2DBackground_22.png';
      // Get sprite paths for both players
    const player1BasePath = getCharacterSpritePath(playerCharacter);
    const player2BasePath = getCharacterSpritePath(opponentCharacter);
    
    // Comprehensive character info logging for debugging
    console.log('Character info:', {
      player1: {
        name: playerCharacter.name,
        id: playerCharacter.id,
        path: player1BasePath,
        isKnight: playerCharacter.name === 'Рыцарь',
        isEvilWizard: playerCharacter.name === 'Злой Волшебник' || playerCharacter.id === 'player3',
      },
      player2: {
        name: opponentCharacter.name,
        id: opponentCharacter.id,
        path: player2BasePath,
        isKnight: opponentCharacter.name === 'Рыцарь',
        isEvilWizard: opponentCharacter.name === 'Злой Волшебник' || opponentCharacter.id === 'player3',
      }
    });
      // Verify file paths directly
    const testIdle1 = new Image();
    const testIdle2 = new Image();
    testIdle1.src = `${player1BasePath}Idle.png`;
    testIdle2.src = `${player2BasePath}Idle.png`;
    
    testIdle1.onload = () => console.log(`✅ Successfully loaded Player 1 Idle: ${testIdle1.src}`);
    testIdle1.onerror = () => console.error(`❌ Failed to load Player 1 Idle: ${testIdle1.src}`);
    testIdle2.onload = () => console.log(`✅ Successfully loaded Player 2 Idle: ${testIdle2.src}`);
    testIdle2.onerror = () => console.error(`❌ Failed to load Player 2 Idle: ${testIdle2.src}`);    // Additional verification for Evil Wizard character
    if (playerCharacter.id === 'player3') {
      // Test hit animation loading
      const evilWizardHitTest = new Image();
      // Properly encode the URL to handle spaces in filenames
      evilWizardHitTest.src = `${player1BasePath}${encodeURIComponent('Take hit.png')}`;
      evilWizardHitTest.onload = () => console.log(`✅ Successfully loaded Evil Wizard Hit: ${evilWizardHitTest.src}`);
      evilWizardHitTest.onerror = () => console.error(`❌ Failed to load Evil Wizard Hit: ${evilWizardHitTest.src}`);
      
      // Test death animation loading
      const evilWizardDeathTest = new Image();
      evilWizardDeathTest.src = `${player1BasePath}${encodeURIComponent('Death.png')}`;
      evilWizardDeathTest.onload = () => console.log(`✅ Successfully loaded Evil Wizard Death: ${evilWizardDeathTest.src}`);
      evilWizardDeathTest.onerror = () => console.error(`❌ Failed to load Evil Wizard Death: ${evilWizardDeathTest.src}`);
    }
    
    if (opponentCharacter.id === 'player3') {
      // Test hit animation loading
      const evilWizardHitTest = new Image();
      // Properly encode the URL to handle spaces in filenames
      evilWizardHitTest.src = `${player2BasePath}${encodeURIComponent('Take hit.png')}`;
      evilWizardHitTest.onload = () => console.log(`✅ Successfully loaded Evil Wizard Hit: ${evilWizardHitTest.src}`);
      evilWizardHitTest.onerror = () => console.error(`❌ Failed to load Evil Wizard Hit: ${evilWizardHitTest.src}`);
      
      // Test death animation loading
      const evilWizardDeathTest = new Image();
      evilWizardDeathTest.src = `${player2BasePath}${encodeURIComponent('Death.png')}`;
      evilWizardDeathTest.onload = () => console.log(`✅ Successfully loaded Evil Wizard Death: ${evilWizardDeathTest.src}`);
      evilWizardDeathTest.onerror = () => console.error(`❌ Failed to load Evil Wizard Death: ${evilWizardDeathTest.src}`);
    }

    // Canvas dimensions and player positions
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;
    const player1Width = 500;
    const player1Height = 267;
    const player2Width = 500;
    const player2Height = 267;
    
    // Adjust ground level to account for sprite height
    const groundY1 = canvasHeight - player1Height;
    const groundY2 = canvasHeight - player2Height;

    // Set initial positions with correct ground alignment
    player1Pos.current = { 
      x: 0, 
      y: groundY1
    };
    player2Pos.current = { 
      x: canvasWidth - player2Width, 
      y: groundY2
    };

    // Initialize velocities
    player1Velocity.current = { x: 0, y: 0 };
    player2Velocity.current = { x: 0, y: 0 };
      // Animation configurations
    const player1Animations = {
      idle: { imageSrc: `${player1BasePath}Idle.png`, frameCount: getFrameCount(player1BasePath, 'idle', playerCharacter.name, playerCharacter.id) },
      run: { imageSrc: `${player1BasePath}Run.png`, frameCount: getFrameCount(player1BasePath, 'run', playerCharacter.name, playerCharacter.id) },
      jump: { imageSrc: `${player1BasePath}Jump.png`, frameCount: getFrameCount(player1BasePath, 'jump', playerCharacter.name, playerCharacter.id) },
      fall: { imageSrc: `${player1BasePath}Fall.png`, frameCount: getFrameCount(player1BasePath, 'fall', playerCharacter.name, playerCharacter.id) },
      attack1: { imageSrc: `${player1BasePath}Attack1.png`, frameCount: getFrameCount(player1BasePath, 'attack1', playerCharacter.name, playerCharacter.id) },
      attack2: { imageSrc: `${player1BasePath}Attack2.png`, frameCount: getFrameCount(player1BasePath, 'attack2', playerCharacter.name, playerCharacter.id) },      getHit: { imageSrc: getHitAnimationPath(playerCharacter, player1BasePath), frameCount: getFrameCount(player1BasePath, 'getHit', playerCharacter.name, playerCharacter.id) },
      death: { 
        imageSrc: playerCharacter.id === 'player3' ? 
          `${player1BasePath}${encodeURIComponent('Death.png')}` : 
          `${player1BasePath}Death.png`, 
        frameCount: getFrameCount(player1BasePath, 'death', playerCharacter.name, playerCharacter.id) 
      }
    };
    
    const player2Animations = {
      idle: { imageSrc: `${player2BasePath}Idle.png`, frameCount: getFrameCount(player2BasePath, 'idle', opponentCharacter.name, opponentCharacter.id) },
      run: { imageSrc: `${player2BasePath}Run.png`, frameCount: getFrameCount(player2BasePath, 'run', opponentCharacter.name, opponentCharacter.id) },
      jump: { imageSrc: `${player2BasePath}Jump.png`, frameCount: getFrameCount(player2BasePath, 'jump', opponentCharacter.name, opponentCharacter.id) },
      fall: { imageSrc: `${player2BasePath}Fall.png`, frameCount: getFrameCount(player2BasePath, 'fall', opponentCharacter.name, opponentCharacter.id) },
      attack1: { imageSrc: `${player2BasePath}Attack1.png`, frameCount: getFrameCount(player2BasePath, 'attack1', opponentCharacter.name, opponentCharacter.id) },      attack2: { imageSrc: `${player2BasePath}Attack2.png`, frameCount: getFrameCount(player2BasePath, 'attack2', opponentCharacter.name, opponentCharacter.id) },
      attack3: { imageSrc: `${player2BasePath}Attack3.png`, frameCount: getFrameCount(player2BasePath, 'attack3', opponentCharacter.name, opponentCharacter.id) },      getHit: { imageSrc: getHitAnimationPath(opponentCharacter, player2BasePath), frameCount: getFrameCount(player2BasePath, 'getHit', opponentCharacter.name, opponentCharacter.id) },
      death: { 
        imageSrc: opponentCharacter.id === 'player3' ? 
          `${player2BasePath}${encodeURIComponent('Death.png')}` : 
          `${player2BasePath}Death.png`, 
        frameCount: getFrameCount(player2BasePath, 'death', opponentCharacter.name, opponentCharacter.id) 
      }
    };
    
    // Initialize players
    const validateSprites = async (character, basePath) => {
      const idleImg = new Image();
      const attackImg = new Image();
      const hitImg = new Image();
      
      return new Promise((resolve) => {
        let loaded = 0;
        let errored = 0;
        const total = 3;
        
        const checkComplete = () => {
          if (loaded + errored >= total) {
            resolve({
              success: loaded === total,
              loaded,
              errored,
              character: character.name
            });
          }
        };
        
        idleImg.onload = () => { loaded++; checkComplete(); };
        idleImg.onerror = () => { errored++; checkComplete(); };
        
        attackImg.onload = () => { loaded++; checkComplete(); };
        attackImg.onerror = () => { errored++; checkComplete(); };
        
        hitImg.onload = () => { loaded++; checkComplete(); };
        hitImg.onerror = () => { errored++; checkComplete(); };
        
        idleImg.src = `${basePath}Idle.png`;
        attackImg.src = `${basePath}Attack1.png`;
        hitImg.src = getHitAnimationPath(character, basePath);
        
        // Set a timeout to ensure we resolve even if images never load/error
        setTimeout(() => {
          if (loaded + errored < total) {
            console.warn(`Image loading timeout for ${character.name}`);
            resolve({
              success: false,
              loaded,
              errored,
              character: character.name,
              timedOut: true
            });
          }
        }, 3000);
      });
    };
    
    const initPlayers = async () => {
      try {
        console.log("Checking sprite paths:", {
          player1: {
            path: player1BasePath,
            character: playerCharacter.name,
            id: playerCharacter.id
          },
          player2: {
            path: player2BasePath,
            character: opponentCharacter.name,
            id: opponentCharacter.id
          }
        });
        
        // Проверяем доступность спрайтов и их конкретные пути
        const testImg1 = new Image();
        const testImg2 = new Image();
        testImg1.src = `${player1BasePath}Idle.png`;
        testImg2.src = `${player2BasePath}Idle.png`;
        
        console.log("Testing direct image paths:", {
          player1Idle: testImg1.src,
          player2Idle: testImg2.src
        });
        
        const [player1SpritesExist, player2SpritesExist] = await Promise.all([
          checkSpriteExists(player1BasePath),
          checkSpriteExists(player2BasePath)
        ]);

        console.log("Sprite check results:", {
          player1Exists: player1SpritesExist,
          player2Exists: player2SpritesExist,
          player1IdlePath: `${player1BasePath}Idle.png`,
          player2IdlePath: `${player2BasePath}Idle.png`
        });        // More thorough sprite validation for Evil Wizard character
        const [player1SpriteValidation, player2SpriteValidation] = await Promise.all([
          validateSprites(playerCharacter, player1BasePath),
          validateSprites(opponentCharacter, player2BasePath)
        ]);
        
        console.log("Sprite validation results:", {
          player1: player1SpriteValidation,
          player2: player2SpriteValidation
        });
        
        // Попробуем запустить с доступными спрайтами
        if (!player1SpritesExist && !player2SpritesExist) {
          console.error('No sprites found for either player');
          return;
        }
          // Special handling for Evil Wizard character
        const isPlayer1EvilWizard = playerCharacter.id === 'player3';
        const isPlayer2EvilWizard = opponentCharacter.id === 'player3';
        
        // Если хотя бы один из спрайтов доступен, продолжим
        if (!player1SpritesExist || !player1SpriteValidation.success) {
          console.warn('Player 1 sprites not found, using default sprites');
          // Используем запасные спрайты для player1
          const defaultPath = isPlayer1EvilWizard ? '/assets/player3/Sprites/' : '/assets/player1/Sprites/';
            
          player1Animations.idle.imageSrc = `${defaultPath}Idle.png`;
          player1Animations.run.imageSrc = `${defaultPath}Run.png`;
          player1Animations.jump.imageSrc = `${defaultPath}Jump.png`;
          player1Animations.fall.imageSrc = `${defaultPath}Fall.png`;
          player1Animations.attack1.imageSrc = `${defaultPath}Attack1.png`;
          player1Animations.attack2.imageSrc = `${defaultPath}Attack2.png`;          // Different filename format for hit animation based on character
          if (isPlayer1EvilWizard) {
            // Properly encode the URL to handle spaces in filenames
            player1Animations.getHit.imageSrc = `${defaultPath}${encodeURIComponent('Take hit.png')}`;
            // Also properly encode the death animation
            player1Animations.death.imageSrc = `${defaultPath}${encodeURIComponent('Death.png')}`;
          } else {
            player1Animations.getHit.imageSrc = `${defaultPath}Take_hit.png`;
            player1Animations.death.imageSrc = `${defaultPath}Death.png`;
          }
        }
        
        if (!player2SpritesExist || !player2SpriteValidation.success) {
          console.warn('Player 2 sprites not found, using default sprites');
          // Используем запасные спрайты для player2
          const defaultPath = isPlayer2EvilWizard ? '/assets/player3/Sprites/' : '/assets/player2/Sprites/';
            
          player2Animations.idle.imageSrc = `${defaultPath}Idle.png`;
          player2Animations.run.imageSrc = `${defaultPath}Run.png`;
          player2Animations.jump.imageSrc = `${defaultPath}Jump.png`;
          player2Animations.fall.imageSrc = `${defaultPath}Fall.png`;
          player2Animations.attack1.imageSrc = `${defaultPath}Attack1.png`;
          player2Animations.attack2.imageSrc = `${defaultPath}Attack2.png`;
            // Knight has attack3, Evil Wizard doesn't
          if (!isPlayer2EvilWizard) {
            player2Animations.attack3.imageSrc = `${defaultPath}Attack3.png`;
          }
          
          // Different filename format for hit animation based on character
          if (isPlayer2EvilWizard) {
            // Properly encode the URL to handle spaces in filenames
            player2Animations.getHit.imageSrc = `${defaultPath}${encodeURIComponent('Take hit.png')}`;
            // Also properly encode the death animation
            player2Animations.death.imageSrc = `${defaultPath}${encodeURIComponent('Death.png')}`;
          } else {
            player2Animations.getHit.imageSrc = `${defaultPath}Get_Hit.png`;
            player2Animations.death.imageSrc = `${defaultPath}Death.png`;
          }
        }        // Preload critical animations, especially death
        const preloadResults = await Promise.all([
          // Handle player1 death animation - encode URL if it's Evil Wizard
          playerCharacter.id === 'player3'
            ? preloadAnimation(`${player1BasePath}${encodeURIComponent('Death.png')}`, 'player1-death')
            : preloadAnimation(`${player1BasePath}Death.png`, 'player1-death'),
          
          // Handle player2 death animation - encode URL if it's Evil Wizard
          opponentCharacter.id === 'player3'
            ? preloadAnimation(`${player2BasePath}${encodeURIComponent('Death.png')}`, 'player2-death')
            : preloadAnimation(`${player2BasePath}Death.png`, 'player2-death'),
          
          // Hit animations are already handled by getHitAnimationPath
          preloadAnimation(getHitAnimationPath(playerCharacter, player1BasePath), 'player1-hit'),
          preloadAnimation(getHitAnimationPath(opponentCharacter, player2BasePath), 'player2-hit')
        ]);
        
        // Store preload results
        preloadResults.forEach(result => {
          preloadedAnimations.current[result.path] = result.success;
        });
        
        console.log("Preload results:", preloadedAnimations.current);

        // Initialize player 1
        player1Ref.current = new Player({
          ctx,
          imageSrc: player1Animations.idle.imageSrc,
          position: { x: player1Pos.current.x, y: player1Pos.current.y },
          frameCount: player1Animations.idle.frameCount,
          width: player1Width,
          height: player1Height,
          animationSpeed: 0.10
        });
        player1Ref.current.setAnimations(player1Animations);
        player1Ref.current.setOnGround(true);
        player1Ref.current.switchAnimation('idle');

        // Initialize player 2
        player2Ref.current = new Player({
          ctx,
          imageSrc: player2Animations.idle.imageSrc,
          position: { x: player2Pos.current.x, y: player2Pos.current.y },
          frameCount: player2Animations.idle.frameCount,
          width: player2Width,
          height: player2Height,
          animationSpeed: 0.10
        });
        player2Ref.current.setAnimations(player2Animations);
        player2Ref.current.setOnGround(true);
        player2Ref.current.switchAnimation('idle');
      } catch (error) {
        console.error('Error initializing players:', error);
      }
    };


    const drawBackground = () => {
      if (!background.complete) return;
      
      const bgW = background.width;
      const bgH = background.height;
      let sx = 0, sy = 0, sw = bgW, sh = bgH;
      let dx = 0, dy = 0, dw = canvasWidth, dh = canvasHeight;

      if (bgW > canvasWidth) {
        sx = Math.floor((bgW - canvasWidth) / 2);
        sw = canvasWidth;
      }
      if (bgH > canvasHeight) {
        sy = Math.floor((bgH - canvasHeight) / 2);
        sh = canvasHeight;
      }
      sy += 60;
      ctx.drawImage(background, sx, sy, sw, sh, dx, dy, dw, dh);
    };

    const drawHealthBars = () => {
      const barWidth = 300;
      const barHeight = 24;
      const barMargin = 32;
      const pixelSize = 10;

      ctx.save();
      ctx.globalAlpha = 1;

      // Background bars
      ctx.fillStyle = '#222';
      
      // Player 1
      ctx.fillRect(barMargin - 4, barMargin - 4, barWidth + 8, barHeight + 8);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.strokeRect(barMargin - 4, barMargin - 4, barWidth + 8, barHeight + 8);

      // Player 2
      ctx.fillRect(canvasWidth - barMargin - barWidth - 4, barMargin - 4, barWidth + 8, barHeight + 8);
      ctx.strokeRect(canvasWidth - barMargin - barWidth - 4, barMargin - 4, barWidth + 8, barHeight + 8);      // Health bars
      ctx.fillStyle = '#e53935';
      const p1pixels = Math.round((player1Health.current / 100) * (barWidth / pixelSize));
      for (let i = 0; i < p1pixels; i++) {
        ctx.fillRect(barMargin + i * pixelSize, barMargin, pixelSize - 1, barHeight);
      }
        // Add health number for player 1
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(player1Health.current)}`, barMargin + barWidth / 2, barMargin + barHeight / 2 + 6);
      
      // Display player 1 stats
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ff6b6b'; // Red for attack
      ctx.fillText(`ATK:${player1Stats.current.attack}`, barMargin, barMargin + barHeight + 20);
      ctx.fillStyle = '#4dabf7'; // Blue for defense
      ctx.fillText(`DEF:${player1Stats.current.defense}`, barMargin + 60, barMargin + barHeight + 20);
      ctx.fillStyle = '#69db7c'; // Green for speed
      ctx.fillText(`SPD:${player1Stats.current.speed}`, barMargin + 120, barMargin + barHeight + 20);

      ctx.fillStyle = '#43a047';
      const p2pixels = Math.round((player2Health.current / 100) * (barWidth / pixelSize));
      for (let i = 0; i < p2pixels; i++) {
        ctx.fillRect(canvasWidth - barMargin - (i + 1) * pixelSize, barMargin, pixelSize - 1, barHeight);
      }
      
      // Add health number for player 2
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(player2Health.current)}`, canvasWidth - barMargin - barWidth / 2, barMargin + barHeight / 2 + 6);
      
      // Display player 2 stats
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ff6b6b'; // Red for attack
      ctx.fillText(`ATK:${player2Stats.current.attack}`, canvasWidth - barMargin, barMargin + barHeight + 20);
      ctx.fillStyle = '#4dabf7'; // Blue for defense
      ctx.fillText(`DEF:${player2Stats.current.defense}`, canvasWidth - barMargin - 60, barMargin + barHeight + 20);
      ctx.fillStyle = '#69db7c'; // Green for speed
      ctx.fillText(`SPD:${player2Stats.current.speed}`, canvasWidth - barMargin - 120, barMargin + barHeight + 20);

      // Win markers
      for (let i = 0; i < player1Wins.current; i++) {
        const startX = barMargin + i * 30;
        const startY = barMargin + barHeight + 30;
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX - 12, startY - 12);
        ctx.lineTo(startX + 12, startY + 12);
        ctx.moveTo(startX + 12, startY - 12);
        ctx.lineTo(startX - 12, startY + 12);
        ctx.stroke();
      }

      for (let i = 0; i < player2Wins.current; i++) {
        const startX = canvasWidth - barMargin - i * 30;
        const startY = barMargin + barHeight + 30;
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(startX - 12, startY - 12);
        ctx.lineTo(startX + 12, startY + 12);
        ctx.moveTo(startX + 12, startY - 12);
        ctx.lineTo(startX - 12, startY + 12);
        ctx.stroke();
      }

      // Round text
      if (showRoundText) {
        ctx.globalAlpha = roundTextOpacity;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Round ${round.current}`, canvasWidth / 2, canvasHeight / 2);
        ctx.globalAlpha = 1; // Reset alpha
      }

      ctx.restore();
    };    // Combat system
    function getHitbox(player, width = 40, height = 120) {
      const offset = 150;
      
      // Adjust hitbox based on current animation
      let attackOffset = 0;
      
      // If the player is attacking, extend the hitbox range
      if (player.currentAnimation && player.currentAnimation.startsWith('attack')) {
        // Create larger hitbox during the middle frames of the attack animation
        const frameRatio = player.currentFrame / player.frameCount;
        if (frameRatio > 0.3 && frameRatio < 0.7) {
          width += 15;
          attackOffset = player.facing === 'right' ? 20 : 0;
        }
      }
      
      return {
        x: player.position.x + (player.facing === 'right' ? 
            player.width - width - offset + attackOffset : 
            offset - attackOffset),
        y: player.position.y + player.height - height,
        width,
        height
      };
    }

    function getBodyBox(player, width = 60, height = 170) {
      return {
        x: player.position.x + (player.width - width) / 2,
        y: player.position.y + player.height - height,
        width,
        height
      };
    }    function isColliding(boxA, boxB) {
      return (
        boxA.x < boxB.x + boxB.width &&
        boxA.x + boxA.width > boxB.x &&
        boxA.y < boxB.y + boxB.height &&
        boxA.y + boxA.height > boxB.y
      );
    }
    
    // Calculate damage based on attacker's attack and defender's defense stats
    function calculateDamage(attackerStats, defenderStats) {
      // Базовый урон
      const BASE_DAMAGE = 7;
      
      // Коэффициент атаки (от 0.8 до 1.5)
      const attackMultiplier = 0.8 + (attackerStats.attack * 0.07);
      
      // Коэффициент защиты (от 0.5 до 0.9)
      const defenseMultiplier = 1 - (defenderStats.defense * 0.05);
      
      // Случайный множитель для небольшой вариации урона (0.9 - 1.1)
      const randomMultiplier = 0.9 + Math.random() * 0.2;
      
      // Итоговый расчет урона
      const damage = Math.round(BASE_DAMAGE * attackMultiplier * defenseMultiplier * randomMultiplier);
      
      console.log('Combat calculation:', {
        attacker: attackerStats,
        defender: defenderStats,
        baseDamage: BASE_DAMAGE,
        attackMult: attackMultiplier,
        defenseMult: defenseMultiplier,
        randomMult: randomMultiplier,
        finalDamage: damage
      });
      
      // Гарантируем минимальный урон
      return Math.max(damage, 1);
    }
      function checkAttackHit(attacker, defender, attackType, forceHit = false) {
      // In online mode, if the hit was already determined by the attacker
      // we should respect that determination
      if (forceHit) {
        const attackerStats = attacker === player1Ref.current ? player1Stats.current : player2Stats.current;
        const defenderStats = defender === player1Ref.current ? player1Stats.current : player2Stats.current;
        
        // Different attack types can have different damage modifiers
        let attackModifier = 1.0;
        if (attackType === 'attack2') {
          attackModifier = 1.2; // Heavy attack does more damage
        }
        
        return calculateDamage(attackerStats, defenderStats) * attackModifier;
      }
      
      // For local determination, check if attack hitbox collides with defender's body box
      const attackHitbox = getHitbox(attacker);
      const defenderBodyBox = getBodyBox(defender);
      
      const isInRange = isColliding(attackHitbox, defenderBodyBox);
      
      // If not in range, attack misses automatically
      if (!isInRange) {
        console.log('Attack missed: not in range');
        return 0;
      }
      
      // Get stats
      const attackerSpeed = attacker === player1Ref.current ? player1Stats.current.speed : player2Stats.current.speed;
      const defenderSpeed = defender === player1Ref.current ? player1Stats.current.speed : player2Stats.current.speed;
      
      // Calculate hit chance based on speed difference
      const speedDifference = attackerSpeed - defenderSpeed;
      const baseHitChance = 0.8 + (speedDifference * 0.03);
      
      // Add some randomness to the hit chance
      const roll = Math.random();
      const didHit = roll <= baseHitChance;
      
      console.log('Attack calculation:', {
        attackerSpeed,
        defenderSpeed,
        speedDifference,
        baseHitChance,
        roll,
        didHit,
        isInRange
      });
      
      if (didHit) {
        // Calculate damage with enhanced attack types
        const attackerStats = attacker === player1Ref.current ? player1Stats.current : player2Stats.current;
        const defenderStats = defender === player1Ref.current ? player1Stats.current : player2Stats.current;
        
        // Different attack types can have different damage modifiers
        let attackModifier = 1.0;
        if (attackType === 'attack2') {
          attackModifier = 1.2; // Heavy attack does more damage
        }
        
        const damage = calculateDamage(attackerStats, defenderStats) * attackModifier;
        
        console.log(`Attack hit! Damage: ${damage}`);
        return Math.round(damage);
      }
      
      console.log('Attack missed: dodge');
      return 0;
    }

    const animate = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground();
      drawHealthBars();

      // Прыжки и гравитация
      // player1
      player1Pos.current.y += player1Velocity.current.y;
      if (player1Pos.current.y < groundY1) {
        player1Velocity.current.y += gravity;
        player1Ref.current.setOnGround(false);
        // Switch to jump or fall animation based on velocity
        if (player1Velocity.current.y < 0) {
          player1Ref.current.switchAnimation('jump');
        } else {
          player1Ref.current.switchAnimation('fall');
        }
      } else {
        player1Pos.current.y = groundY1;
        player1Velocity.current.y = 0;
        player1Ref.current.setOnGround(true);
        // Only switch to idle if not in another animation
        if (player1Ref.current.currentAnimation === 'jump' || player1Ref.current.currentAnimation === 'fall') {
          player1Ref.current.switchAnimation('idle');
        }
      }
      player1Ref.current.setVelocityY(player1Velocity.current.y);

      // player2
      player2Pos.current.y += player2Velocity.current.y;
      
      // For online mode, apply continued motion from interpolation
      if (gameMode === 'online') {
        // Apply continued horizontal motion for smoother online movement
        player2Pos.current.x += player2Velocity.current.x;
        
        // Gradually reduce velocity for natural deceleration
        player2Velocity.current.x *= 0.9;
        
        // Prevent tiny movements
        if (Math.abs(player2Velocity.current.x) < 0.1) {
          player2Velocity.current.x = 0;
        }
        
        // Update animation based on velocity
        if (Math.abs(player2Velocity.current.x) > 0.5 && player2Ref.current.isOnGround()) {
          player2Ref.current.switchAnimation('run');
          
          // Flip character based on movement direction
          if (player2Velocity.current.x > 0) {
            player2Ref.current.faceLeft = false;
          } else if (player2Velocity.current.x < 0) {
            player2Ref.current.faceLeft = true;
          }
        }
      }
      
      if (player2Pos.current.y < groundY2) {
        player2Velocity.current.y += gravity;
        player2Ref.current.setOnGround(false);
        // Switch to jump or fall animation based on velocity
        if (player2Velocity.current.y < 0) {
          player2Ref.current.switchAnimation('jump');
        } else {
          player2Ref.current.switchAnimation('fall');
        }
      } else {
        player2Pos.current.y = groundY2;
        player2Velocity.current.y = 0;
        player2Ref.current.setOnGround(true);
        // Only switch to idle if not in another animation
        if (player2Ref.current.currentAnimation === 'jump' || player2Ref.current.currentAnimation === 'fall') {
          player2Ref.current.switchAnimation('idle');
        }
      }
      player2Ref.current.setVelocityY(player2Velocity.current.y);
      
      // Движение по горизонтали с учетом скорости персонажа
      const player1MoveSpeed = baseSpeed + (player1Stats.current.speed * 0.3); // Reduced multiplier for smoother movement
      const player2MoveSpeed = baseSpeed + (player2Stats.current.speed * 0.3);
      
      // Apply movement with improved responsiveness
      if (keys.player1.left) player1Pos.current.x = Math.max(0, player1Pos.current.x - player1MoveSpeed);
      if (keys.player1.right) player1Pos.current.x = Math.min(canvasWidth - player1Width, player1Pos.current.x + player1MoveSpeed);
      
      // Only apply manual movement to player2 in local mode (not online)
      if (gameMode !== 'online') {
        if (keys.player2.left) player2Pos.current.x = Math.max(0, player2Pos.current.x - player2MoveSpeed);
        if (keys.player2.right) player2Pos.current.x = Math.min(canvasWidth - player2Width, player2Pos.current.x + player2MoveSpeed);
      }

      // Обновление позиций и анимаций
      player1Ref.current.position = player1Pos.current;
      player2Ref.current.position = player2Pos.current;
      
      // Обновление анимаций бега
      if (!keys.player1.left && !keys.player1.right && 
          player1Pos.current.y === groundY1 &&
          !player1Attack.current.inProgress && 
          player1Ref.current.currentAnimation === 'run') {
        player1Ref.current.switchAnimation('idle');
      }
      
      if (!keys.player2.left && !keys.player2.right && 
          player2Pos.current.y === groundY2 &&
          !player2Attack.current.inProgress && 
          player2Ref.current.currentAnimation === 'run') {
        player2Ref.current.switchAnimation('idle');
      }

      player1Ref.current.update();
      player2Ref.current.update();

      // Debug hitboxes
      if (process.env.NODE_ENV === 'development') {
        const drawHitbox = (player, color) => {
          const hitbox = getHitbox(player);
          const bodybox = getBodyBox(player);
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
          ctx.strokeStyle = 'blue';
          ctx.strokeRect(bodybox.x, bodybox.y, bodybox.width, bodybox.height);
          ctx.restore();
        };
        drawHitbox(player1Ref.current, 'red');
        drawHitbox(player2Ref.current, 'red');
      }      // Animation state handling
      // Handle player 1 attack animations
      if (player1Attack.current.inProgress) {
        const anim = player1Ref.current?.animations[player1Attack.current.type];
        // Безопасная проверка на существование анимации
        if (!anim) {
          player1Attack.current.inProgress = false;
        } else if (player1Ref.current.currentAnimation === 'getHit') {
          if (player1Ref.current.animationEnded || 
              player1Ref.current.currentFrame >= player1Ref.current.animations['getHit'].frameCount - 1) {
            player1Attack.current.inProgress = false;
            // Reset hit animation state
            player1Ref.current.switchAnimation('idle');
          }
        } else if (player1Ref.current.currentAnimation.startsWith('attack')) {
          if (player1Ref.current.animationEnded || 
              player1Ref.current.currentFrame >= anim.frameCount - 1) {
            player1Attack.current.inProgress = false;
            player1Ref.current.switchAnimation('idle');
          }
        } else {
          // Если анимация не атака и не получение урона, сбросим флаг
          player1Attack.current.inProgress = false;
        }
      }

      // Handle player 2 attack animations
      if (player2Attack.current.inProgress) {
        const anim = player2Ref.current?.animations[player2Attack.current.type];
        // Безопасная проверка на существование анимации
        if (!anim) {
          player2Attack.current.inProgress = false;
        } else if (player2Ref.current.currentAnimation === 'getHit') {
          if (player2Ref.current.animationEnded || 
              player2Ref.current.currentFrame >= player2Ref.current.animations['getHit'].frameCount - 1) {
            player2Attack.current.inProgress = false;
            // Reset hit animation state
            player2Ref.current.switchAnimation('idle');
          }
        } else if (player2Ref.current.currentAnimation.startsWith('attack')) {
          if (player2Ref.current.animationEnded || 
              player2Ref.current.currentFrame >= anim.frameCount - 1) {
            player2Attack.current.inProgress = false;
            player2Ref.current.switchAnimation('idle');
          }
        } else {
          // Если анимация не атака и не получение урона, сбросим флаг
          player2Attack.current.inProgress = false;
        }
      }      // Handle getHit animation completion for both players (even outside of attack state)
      if (player1Ref.current.currentAnimation === 'getHit') {
        const isHitAnimationComplete = 
          player1Ref.current.animationEnded || 
          player1Ref.current.isAnimationComplete();
        
        if (isHitAnimationComplete) {
          // Reset wasHit flag once the animation completes
          player1Attack.current.wasHit = false;
          player1Ref.current.switchAnimation('idle');
        }
      }
      
      if (player2Ref.current.currentAnimation === 'getHit') {
        const isHitAnimationComplete = 
          player2Ref.current.animationEnded || 
          player2Ref.current.isAnimationComplete();
          
        if (isHitAnimationComplete) {
          // Reset wasHit flag once the animation completes
          player2Attack.current.wasHit = false;
          player2Ref.current.switchAnimation('idle');
        }
      }

      // State transitions
      if (!keys.player1.left && !keys.player1.right && !player1Attack.current.inProgress && 
          player1Ref.current.currentAnimation === 'run') {
        player1Ref.current.switchAnimation('idle');
      }
      if (!keys.player2.left && !keys.player2.right && !player2Attack.current.inProgress && 
          player2Ref.current.currentAnimation === 'run') {
        player2Ref.current.switchAnimation('idle');
      }      // Death handling - инициализируем объект для отслеживания состояния
      if (!animate.deathHandled) animate.deathHandled = { p1: false, p2: false };
      if (!animate.roundEndTriggered) animate.roundEndTriggered = false;      // Handle player 1 death
      if (player1Health.current <= 0 && !animate.deathHandled.p1) {
        console.log("Player 1 death animation starting");
        
        // Use the new forced death animation method
        player1Ref.current.forceDeathAnimation();
        
        animate.deathHandled.p1 = true;
        
        // Verify that death animation is selected
        console.log("Player 1 animation state:", {
          current: player1Ref.current.currentAnimation,
          locked: player1Ref.current.locked,
          frameCount: player1Ref.current.frameCount,
          path: player1Ref.current.image.src
        });
        
        // Уведомляем о завершении раунда, но начинаем новый раунд только после анимации
        if (!animate.roundEndTriggered) {
          handleGameEvent('round_end', { winner: 'player2' });
          animate.roundEndTriggered = true;
        }
      }
        // Handle player 2 death
      if (player2Health.current <= 0 && !animate.deathHandled.p2) {
        console.log("Player 2 death animation starting");
        
        // Use the new forced death animation method
        player2Ref.current.forceDeathAnimation();
        
        animate.deathHandled.p2 = true;
        
        // Verify that death animation is selected
        console.log("Player 2 animation state:", {
          current: player2Ref.current.currentAnimation,
          locked: player2Ref.current.locked,
          frameCount: player2Ref.current.frameCount,
          path: player2Ref.current.image.src
        });
        
        // Уведомляем о завершении раунда, но начинаем новый раунд только после анимации
        if (!animate.roundEndTriggered) {
          handleGameEvent('round_end', { winner: 'player1' });
          animate.roundEndTriggered = true;
        }
      }// Round transition - добавляем задержку для анимации смерти
      if ((player1Health.current <= 0 || player2Health.current <= 0) && 
          (animate.deathHandled.p1 || animate.deathHandled.p2) && 
          animate.roundEndTriggered) {
        
        const player1Dead = player1Health.current <= 0;
        const player2Dead = player2Health.current <= 0;
        
        // Debug death animation progress
        if (player1Dead && !animate.debugDeathP1) {
          animate.debugDeathP1 = setInterval(() => {
            console.log("Player 1 death animation progress:", { 
              frame: player1Ref.current.currentFrame,
              total: player1Ref.current.frameCount,
              ended: player1Ref.current.animationEnded,
              complete: player1Ref.current.isAnimationComplete()
            });
            
            // Clear after a while
            if (player1Ref.current.isAnimationComplete()) {
              clearInterval(animate.debugDeathP1);
            }
          }, 500);
        }
        
        if (player2Dead && !animate.debugDeathP2) {
          animate.debugDeathP2 = setInterval(() => {
            console.log("Player 2 death animation progress:", { 
              frame: player2Ref.current.currentFrame,
              total: player2Ref.current.frameCount,
              ended: player2Ref.current.animationEnded,
              complete: player2Ref.current.isAnimationComplete()
            });
            
            // Clear after a while
            if (player2Ref.current.isAnimationComplete()) {
              clearInterval(animate.debugDeathP2);
            }
          }, 500);
        }
          // Instead of checking if animations are complete, use a fixed timer
        // This gives ample time for death animations to play out
        if (!animate.deathTimer) {
          console.log("Starting death animation timer");
          animate.deathTimer = setTimeout(() => {
            console.log("Death animation timer complete");
            
            // Start new round
            if (!animate.newRoundTimeout) {
              console.log("Preparing for new round");
              
              // Pre-reset death animation flags to ensure clean state transition
              if (player1Ref.current.currentAnimation === 'death') {
                console.log("Pre-resetting Player 1 from death state");
              }
              
              if (player2Ref.current.currentAnimation === 'death') {
                console.log("Pre-resetting Player 2 from death state");
              }
              
              animate.newRoundTimeout = setTimeout(() => {
                console.log("Starting new round");
                startNewRound();
                animate.newRoundTimeout = null;
              }, 1000); // 1 second delay after death animation completes
            }
            
            animate.deathTimer = null;
          }, 3000); // Fixed 3 seconds for death animation to complete
        }
      }

      requestAnimationFrame(animate);
    };    function startNewRound() {
      console.log("Starting new round");
      round.current += 1;
      setShowRoundText(true);
      setRoundTextOpacity(1);      // Reset states
      player1Health.current = 100;
      player2Health.current = 100;
      player1Pos.current = { x: 0, y: groundY1 };
      player2Pos.current = { x: canvasWidth - player2Width, y: groundY2 };
      
      // Reset velocity
      player1Velocity.current = { x: 0, y: 0 };
      player2Velocity.current = { x: 0, y: 0 };
        
      // Key presses
      keys.player1.left = false;
      keys.player1.right = false;
      keys.player2.left = false;
      keys.player2.right = false;
        // Полная разблокировка и сброс состояний анимации - использовать completeReset для полного сброса
      player1Ref.current.completeReset();
      player2Ref.current.completeReset();
      
      // Принудительно сбрасываем все атаки и состояния анимаций
      player1Attack.current = { inProgress: false, type: null, wasHit: false };
      player2Attack.current = { inProgress: false, type: null, wasHit: false };
        // Сброс флагов анимации и таймеров
      animate.deathHandled = { p1: false, p2: false };
      animate.roundEndTriggered = false;
      
      // Debug animation state
      console.log('Player 1 animation state after reset:', {
        animation: player1Ref.current.currentAnimation,
        frame: player1Ref.current.currentFrame,
        locked: player1Ref.current.locked,
        ended: player1Ref.current.animationEnded
      });
      
      console.log('Player 2 animation state after reset:', {
        animation: player2Ref.current.currentAnimation,
        frame: player2Ref.current.currentFrame,
        locked: player2Ref.current.locked,
        ended: player2Ref.current.animationEnded
      });
      
      // Clear all timers
      if (animate.newRoundTimeout) {
        clearTimeout(animate.newRoundTimeout);
        animate.newRoundTimeout = null;
      }
      
      if (animate.deathTimer) {
        clearTimeout(animate.deathTimer);
        animate.deathTimer = null;
      }
      
      if (animate.debugDeathP1) {
        clearInterval(animate.debugDeathP1);
        animate.debugDeathP1 = null;
      }
      
      if (animate.debugDeathP2) {
        clearInterval(animate.debugDeathP2);
        animate.debugDeathP2 = null;
      }

      // Check for game win
      const WINS_TO_VICTORY = 2;
      if (player1Wins.current >= WINS_TO_VICTORY) {
        handleGameEvent('gameOver', { winner: 'player1' });
      } else if (player2Wins.current >= WINS_TO_VICTORY) {
        handleGameEvent('gameOver', { winner: 'player2' });
      }

      // Fade out round text
      setTimeout(() => {
        const fadeOut = setInterval(() => {
          setRoundTextOpacity(prev => {
            if (prev <= 0) {
              clearInterval(fadeOut);
              setShowRoundText(false);
              return 0;
            }
            return prev - 0.05;
          });
        }, 50);
      }, 2000);
    }

    // Input handling
    const keys = {
      player1: { left: false, right: false },
      player2: { left: false, right: false }
    };
    
    const handleKeyDown = (e) => {
      // Check if player refs exist
      if (!player1Ref.current || !player2Ref.current) return;
      
      // No controls if either player is dead
      if (player1Ref.current?.currentAnimation === 'death' || 
          player2Ref.current?.currentAnimation === 'death') return;
          
      // Special handling for online mode
      if (gameMode === 'online') {
        // In online mode, only control player1 - reject all player2 controls
        if (e.code === 'KeyD' || e.code === 'KeyA' || e.code === 'KeyW' || 
            e.code === 'Space' || e.code === 'KeyE' || e.code === 'KeyQ') {
            
          // Player 1 movement
          if (e.code === 'KeyD') {
            keys.player1.right = true;
            player1Ref.current.switchAnimation('run');
            player1Ref.current.setFacing('right');
            
            // Notify parent component about movement for online sync
            onPlayerAction?.({ 
              type: 'move', 
              position: player1Pos.current,
              direction: 'right',
              moving: true
            });
          }
          
          if (e.code === 'KeyA') {
            keys.player1.left = true;
            player1Ref.current.switchAnimation('run');
            player1Ref.current.setFacing('left');
            
            // Notify parent component about movement for online sync
            onPlayerAction?.({ 
              type: 'move', 
              position: player1Pos.current,
              direction: 'left',
              moving: true
            });
          }
          
          // Player 1 jump
          if ((e.code === 'KeyW' || e.code === 'Space') && player1Pos.current.y === groundY1) {
            // Jump height based on speed stat
            player1Velocity.current.y = -7 - (player1Stats.current.speed * 0.2);
            player1Ref.current.switchAnimation('jump');
            
            // Notify parent component about jump for online sync
            onPlayerAction?.({ 
              type: 'move',
              position: player1Pos.current,
              direction: 'up',
              moving: true
            });
          }
          
          // Player 1 attack 1
          if (e.code === 'KeyE' && !player1Attack.current.inProgress) {
            player1Ref.current.switchAnimation('attack1');
            player1Attack.current = { inProgress: true, type: 'attack1' };
              // Check if attack hits for immediate visual feedback
            if (player2Ref.current) {
              const damage = checkAttackHit(player1Ref.current, player2Ref.current, 'attack1');
              
              // For online play, send attack data to server for authoritative hit detection
              onPlayerAction?.({ 
                type: 'attack', 
                attackType: 'attack1', 
                hit: damage > 0,
                damage: damage,
                position: player1Pos.current,
                isCritical: true // Mark as critical to bypass rate limiting
              });
              
              // In online mode, apply immediate visual feedback but wait for server confirmation for actual damage
              if (gameMode === 'online') {
                if (damage > 0) {
                  // Show hit animation immediately for responsive gameplay
                  player2Ref.current.switchAnimation('getHit');
                  player2Attack.current.wasHit = true;
                  
                  // The actual health reduction will be handled by server response
                }
              } else {
                // In local modes, apply damage immediately
                if (damage > 0) {
                  player2Health.current = Math.max(0, player2Health.current - damage);
                  player2Ref.current.switchAnimation('getHit');
                  player2Attack.current.wasHit = true;
                }
              }
            }
          }
            // Player 1 attack 2
          if (e.code === 'KeyQ' && !player1Attack.current.inProgress) {
            player1Ref.current.switchAnimation('attack2');
            player1Attack.current = { inProgress: true, type: 'attack2' };
            
            // Check if attack hits for immediate visual feedback
            if (player2Ref.current) {
              const damage = checkAttackHit(player1Ref.current, player2Ref.current, 'attack2');
              
              // For online play, send attack data to server for authoritative hit detection
              onPlayerAction?.({ 
                type: 'attack', 
                attackType: 'attack2', 
                hit: damage > 0,
                damage: damage,
                position: player1Pos.current,
                isCritical: true // Mark as critical to bypass rate limiting
              });
              
              // In online mode, apply immediate visual feedback but wait for server confirmation for actual damage
              if (gameMode === 'online') {
                if (damage > 0) {
                  // Show hit animation immediately for responsive gameplay
                  player2Ref.current.switchAnimation('getHit');
                  player2Attack.current.wasHit = true;
                  
                  // The actual health reduction will be handled by server response
                }
              } else {
                // In local modes, apply damage immediately
                if (damage > 0) {
                  player2Health.current = Math.max(0, player2Health.current - damage);
                  player2Ref.current.switchAnimation('getHit');
                  player2Attack.current.wasHit = true;
                }
              }
            }
          }
        }
        
        // In online mode, completely block all player2 controls and any unrecognized keys
        // Exit early to prevent any player2 control processing
        return;
      }
      
      // Original control logic for local modes
      // Player 1 controls
      if (e.code === 'KeyD' && player1Ref.current) {
        keys.player1.right = true;
        player1Ref.current.switchAnimation('run');
        player1Ref.current.setFacing('right');
        onPlayerAction?.({ type: 'move', player: 'player1', direction: 'right' });
      }
      if (e.code === 'KeyA' && player1Ref.current) {
        keys.player1.left = true;
        player1Ref.current.switchAnimation('run');
        player1Ref.current.setFacing('left');
        onPlayerAction?.({ type: 'move', player: 'player1', direction: 'left' });
      }      if ((e.code === 'KeyW' || e.code === 'Space') && player1Ref.current && player1Pos.current.y === groundY1) {
        // Jump height based on speed stat
        player1Velocity.current.y = -7 - (player1Stats.current.speed * 0.2);
        player1Ref.current.switchAnimation('jump');
        onPlayerAction?.({ type: 'jump', player: 'player1' });
      }      if (e.code === 'KeyE' && player1Ref.current && !player1Attack.current.inProgress) {
        player1Ref.current.switchAnimation('attack1');
        player1Attack.current = { inProgress: true, type: 'attack1' };
        
        // Check if attack hits and apply damage
        if (player2Ref.current) {
          const damage = checkAttackHit(player1Ref.current, player2Ref.current, 'attack1');
          if (damage > 0) {
            // Apply damage to player 2
            player2Health.current = Math.max(0, player2Health.current - damage);
            player2Ref.current.switchAnimation('getHit');
            player2Attack.current.wasHit = true;
            
            // Notify about the hit
            onPlayerAction?.({ 
              type: 'attack', 
              player: 'player1', 
              attackType: 'attack1', 
              hit: true,
              damage: damage
            });
            
            // Trigger damage event
            handleGameEvent('damage', { 
              target: 'player2', 
              amount: damage, 
              source: 'player1',
              attackType: 'attack1'
            });
          } else {
            onPlayerAction?.({ type: 'attack', player: 'player1', attackType: 'attack1', hit: false });
          }
        }
      }      if (e.code === 'KeyQ' && player1Ref.current && !player1Attack.current.inProgress) {
        player1Ref.current.switchAnimation('attack2');
        player1Attack.current = { inProgress: true, type: 'attack2' };
        
        // Check if attack hits and apply damage
        if (player2Ref.current) {
          const damage = checkAttackHit(player1Ref.current, player2Ref.current, 'attack2');
          if (damage > 0) {
            // Apply damage to player 2
            player2Health.current = Math.max(0, player2Health.current - damage);
            player2Ref.current.switchAnimation('getHit');
            player2Attack.current.wasHit = true;
            
            // Notify about the hit
            onPlayerAction?.({ 
              type: 'attack', 
              player: 'player1', 
              attackType: 'attack2', 
              hit: true,
              damage: damage
            });
            
            // Trigger damage event
            handleGameEvent('damage', { 
              target: 'player2', 
              amount: damage, 
              source: 'player1',
              attackType: 'attack2'
            });
          } else {
            onPlayerAction?.({ type: 'attack', player: 'player1', attackType: 'attack2', hit: false });
          }
        }
      }

      // Player 2 controls - BLOCKED IN ONLINE MODE
      if (gameMode === 'online') {
        // In online mode, Player 2 is controlled by the opponent through network sync
        // Block all local Player 2 controls to prevent conflicting inputs
        return;
      }

      // Player 2 controls (local modes only)
      if (e.code === 'ArrowLeft' && player2Ref.current) {
        keys.player2.left = true;
        player2Ref.current.switchAnimation('run');
        player2Ref.current.setFacing('left');
        onPlayerAction?.({ type: 'move', player: 'player2', direction: 'left' });
      }
      if (e.code === 'ArrowRight' && player2Ref.current) {
        keys.player2.right = true;
        player2Ref.current.switchAnimation('run');
        player2Ref.current.setFacing('right');
        onPlayerAction?.({ type: 'move', player: 'player2', direction: 'right' });
      }      if (e.code === 'ArrowUp' && player2Ref.current && player2Pos.current.y === groundY2) {
        // Jump height based on speed stat
        player2Velocity.current.y = -7 - (player2Stats.current.speed * 0.2);
        player2Ref.current.switchAnimation('jump');
        onPlayerAction?.({ type: 'jump', player: 'player2' });
      }      if (e.code === 'KeyK' && player2Ref.current && !player2Attack.current.inProgress) {
        player2Ref.current.switchAnimation('attack1');
        player2Attack.current = { inProgress: true, type: 'attack1' };
        
        // Check if attack hits and apply damage
        if (player1Ref.current) {
          const damage = checkAttackHit(player2Ref.current, player1Ref.current, 'attack1');
          if (damage > 0) {
            // Apply damage to player 1
            player1Health.current = Math.max(0, player1Health.current - damage);
            player1Ref.current.switchAnimation('getHit');
            player1Attack.current.wasHit = true;
            
            // Notify about the hit
            onPlayerAction?.({ 
              type: 'attack', 
              player: 'player2', 
              attackType: 'attack1', 
              hit: true,
              damage: damage 
            });
            
            // Trigger damage event
            handleGameEvent('damage', { 
              target: 'player1', 
              amount: damage, 
              source: 'player2',
              attackType: 'attack1'
            });
          } else {
            onPlayerAction?.({ type: 'attack', player: 'player2', attackType: 'attack1', hit: false });
          }
        }
      }      if (e.code === 'KeyL' && player2Ref.current && !player2Attack.current.inProgress) {
        player2Ref.current.switchAnimation('attack2');
        player2Attack.current = { inProgress: true, type: 'attack2' };
        
        // Check if attack hits and apply damage
        if (player1Ref.current) {
          const damage = checkAttackHit(player2Ref.current, player1Ref.current, 'attack2');
          if (damage > 0) {
            // Apply damage to player 1
            player1Health.current = Math.max(0, player1Health.current - damage);
            player1Ref.current.switchAnimation('getHit');
            player1Attack.current.wasHit = true;
            
            // Notify about the hit
            onPlayerAction?.({ 
              type: 'attack', 
              player: 'player2', 
              attackType: 'attack2', 
              hit: true,
              damage: damage
            });
            
            // Trigger damage event
            handleGameEvent('damage', { 
              target: 'player1', 
              amount: damage, 
              source: 'player2',
              attackType: 'attack2'
            });
          } else {
            onPlayerAction?.({ type: 'attack', player: 'player2', attackType: 'attack2', hit: false });
          }
        }
      }
    };    const handleKeyUp = (e) => {
      // Check if player refs exist
      if (!player1Ref.current || !player2Ref.current) return;
      
      // No controls if either player is dead
      if (player1Ref.current?.currentAnimation === 'death' || 
          player2Ref.current?.currentAnimation === 'death') return;

      // Special handling for online mode
      if (gameMode === 'online') {
        // In online mode, only handle player1 controls
        if (e.code === 'KeyD' || e.code === 'KeyA') {
          let wasMoving = keys.player1.left || keys.player1.right;
          
          if (e.code === 'KeyD') keys.player1.right = false;
          if (e.code === 'KeyA') keys.player1.left = false;
          
          // If player stops moving, sync the stop and reset to idle
          if (wasMoving && !keys.player1.left && !keys.player1.right && 
              !player1Attack.current.inProgress && player1Pos.current.y === groundY1) {
            player1Ref.current.switchAnimation('idle');
            
            // Notify parent component about movement stop for online sync
            onPlayerAction?.({ 
              type: 'move', 
              position: player1Pos.current,
              direction: 'stop',
              moving: false,
              velocity: { x: 0, y: 0 }
            });
          }
        }
        return; // Exit early for online mode
      }

      // Original control logic for local modes
      if (e.code === 'KeyD') keys.player1.right = false;
      if (e.code === 'KeyA') keys.player1.left = false;
      if (e.code === 'ArrowLeft') keys.player2.left = false;
      if (e.code === 'ArrowRight') keys.player2.right = false;

      // Reset to idle if not moving or attacking
      if (player1Ref.current && !keys.player1.left && !keys.player1.right && !player1Attack.current.inProgress &&
          player1Pos.current.y === groundY1) {
        player1Ref.current.switchAnimation('idle');
      }
      if (player2Ref.current && !keys.player2.left && !keys.player2.right && !player2Attack.current.inProgress &&
          player2Pos.current.y === groundY2) {
        player2Ref.current.switchAnimation('idle');
      }
    };

    // Set up event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Start initialization
    background.onload = () => {
      initPlayers().then(() => {
        if (player1Ref.current && player2Ref.current) {
          requestAnimationFrame(animate);
        }
      });
    };    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playerCharacter, opponentCharacter, getCharacterSpritePath, getHitAnimationPath, checkSpriteExists, preloadAnimation, onPlayerAction, gameMode, handleGameEvent, showRoundText, roundTextOpacity]);
  // Special effect for online mode to handle opponent actions
  useEffect(() => {
    if (gameMode !== 'online' || !opponentAttack || !player2Ref.current) return;
    
    console.log('Received opponent attack:', opponentAttack);
    
    // Trigger opponent attack animation
    if (opponentAttack.type && !player2Attack.current.inProgress) {
      player2Ref.current.switchAnimation(opponentAttack.type);
      player2Attack.current = { inProgress: true, type: opponentAttack.type };
      
      // Check if the attack hits player 1
      if (player1Ref.current) {
        // Base damage calculation function
        const calculateDamage = (attackerStats, defenderStats) => {
          const BASE_DAMAGE = 7;
          const attackMultiplier = 0.8 + (attackerStats.attack * 0.07);
          const defenseMultiplier = 1 - (defenderStats.defense * 0.05);
          const randomMultiplier = 0.9 + Math.random() * 0.2;
          return Math.max(1, Math.round(BASE_DAMAGE * attackMultiplier * defenseMultiplier * randomMultiplier));
        };
        
        const damage = calculateDamage(player2Stats.current, player1Stats.current);
        
        // Apply damage if this was a hit
        if (opponentAttack.hit) {
          player1Health.current = Math.max(0, player1Health.current - damage);
          player1Ref.current.switchAnimation('getHit');
          player1Attack.current.wasHit = true;
        }
      }
    }
  }, [gameMode, opponentAttack]);
  // Effect to handle opponent attack in online mode
  useEffect(() => {
    if (gameMode === 'online' && opponentAttack && player2Ref.current) {
      const { type, timestamp, hit, damage } = opponentAttack;
      
      // Prevent duplicate attack processing
      const attackTimestamp = timestamp || new Date().getTime();
      const lastAttackTimestamp = player2Attack.current.timestamp || 0;
      
      // Only process if it's a new attack (timestamp is newer)
      if (attackTimestamp > lastAttackTimestamp) {
        // Update attack state
        player2Attack.current = { 
          inProgress: true, 
          type, 
          timestamp: attackTimestamp,
          hit,
          damage
        };
        
        // Trigger attack animation
        player2Ref.current.switchAnimation(type);
        
        // If attack hits, apply damage
        if (hit && damage > 0) {
          const newHealth = Math.max(0, player1Health.current - damage);
          player1Health.current = newHealth;
          
          if (newHealth > 0) {
            player1Ref.current.switchAnimation('getHit');
            player1Attack.current.wasHit = true;
          } else {
            player1Ref.current.forceDeathAnimation();
            player2Wins.current += 1;
          }
          
          // Check game over conditions
          if (player2Wins.current >= 2) {
            onPlayerAction?.({ 
              type: 'gameOver', 
              winner: 'player2' 
            });
          } else if (newHealth <= 0) {
            // Start new round
            setTimeout(() => {
              round.current += 1;
              player1Health.current = 100;
              player2Health.current = 100;
              setShowRoundText(true);
              setRoundTextOpacity(1);
            }, 2000);
          }
          
          // Report the hit
          onPlayerAction?.({ 
            type: 'hit', 
            damage: damage,
            remainingHealth: newHealth 
          });
        }
      }
    }
  }, [gameMode, opponentAttack, onPlayerAction]);

  return (
    <div className="w-screen h-screen m-0 p-0 bg-black flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ background: 'transparent' }}
      />    </div>
  );
});

export default GameCanvas;
