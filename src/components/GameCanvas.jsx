import React, { useEffect, useRef, useState } from 'react';
import Player from '../classes/Player';
import { useSprites } from '../contexts/SpritesContext';

const GameCanvas = ({ gameMode, onPlayerAction, playerCharacter, opponentCharacter }) => {
  const { getCharacterSpritePath, checkSpriteExists, preloadAnimation } = useSprites();
  
  // Player refs and state management
  const canvasRef = useRef(null);
  const player1Ref = useRef(null);
  const player2Ref = useRef(null);
  const player1Pos = useRef({ x: 0, y: 0 });
  const player2Pos = useRef({ x: 0, y: 0 });
  const player1Velocity = useRef({ x: 0, y: 0 });
  const player2Velocity = useRef({ x: 0, y: 0 });
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
  const speed = 8;
  const gravity = 0.10;

  // Initialize game settings
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !playerCharacter || !opponentCharacter) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;    // Добавляем функцию для определения количества кадров
    // Function to determine frame counts for animations
    const getFrameCount = (characterPath, animationType, characterName) => {
      const isKnight = characterName && characterName === 'Рыцарь';
      console.log('getFrameCount:', {
        characterName,
        animationType,
        isKnight
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
        }
      };
      return isKnight ? frameCountMap.knight[animationType] : frameCountMap.samurai[animationType];
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
    background.src = '/assets/2DBackground_22.png';    // Get sprite paths for both players
    const player1BasePath = getCharacterSpritePath(playerCharacter);
    const player2BasePath = getCharacterSpritePath(opponentCharacter);
    
    console.log('Character info:', {
      player1: {
        name: playerCharacter.name,
        path: player1BasePath,
        isKnight: player1BasePath.includes('player2')
      },
      player2: {
        name: opponentCharacter.name,
        path: player2BasePath,
        isKnight: player2BasePath.includes('player2')
      }
    });

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
      idle: { imageSrc: `${player1BasePath}Idle.png`, frameCount: getFrameCount(player1BasePath, 'idle', playerCharacter.name) },
      run: { imageSrc: `${player1BasePath}Run.png`, frameCount: getFrameCount(player1BasePath, 'run', playerCharacter.name) },
      jump: { imageSrc: `${player1BasePath}Jump.png`, frameCount: getFrameCount(player1BasePath, 'jump', playerCharacter.name) },
      fall: { imageSrc: `${player1BasePath}Fall.png`, frameCount: getFrameCount(player1BasePath, 'fall', playerCharacter.name) },
      attack1: { imageSrc: `${player1BasePath}Attack1.png`, frameCount: getFrameCount(player1BasePath, 'attack1', playerCharacter.name) },
      attack2: { imageSrc: `${player1BasePath}Attack2.png`, frameCount: getFrameCount(player1BasePath, 'attack2', playerCharacter.name) },
      getHit: { imageSrc: `${player1BasePath}Take_hit.png`, frameCount: getFrameCount(player1BasePath, 'getHit', playerCharacter.name) },
      death: { imageSrc: `${player1BasePath}Death.png`, frameCount: getFrameCount(player1BasePath, 'death', playerCharacter.name) }
    };    const player2Animations = {
      idle: { imageSrc: `${player2BasePath}Idle.png`, frameCount: getFrameCount(player2BasePath, 'idle', opponentCharacter.name) },
      run: { imageSrc: `${player2BasePath}Run.png`, frameCount: getFrameCount(player2BasePath, 'run', opponentCharacter.name) },
      jump: { imageSrc: `${player2BasePath}Jump.png`, frameCount: getFrameCount(player2BasePath, 'jump', opponentCharacter.name) },
      fall: { imageSrc: `${player2BasePath}Fall.png`, frameCount: getFrameCount(player2BasePath, 'fall', opponentCharacter.name) },
      attack1: { imageSrc: `${player2BasePath}Attack1.png`, frameCount: getFrameCount(player2BasePath, 'attack1', opponentCharacter.name) },
      attack2: { imageSrc: `${player2BasePath}Attack2.png`, frameCount: getFrameCount(player2BasePath, 'attack2', opponentCharacter.name) },
      attack3: { imageSrc: `${player2BasePath}Attack3.png`, frameCount: getFrameCount(player2BasePath, 'attack3', opponentCharacter.name) },
      getHit: { imageSrc: `${player2BasePath}Get_Hit.png`, frameCount: getFrameCount(player2BasePath, 'getHit', opponentCharacter.name) },
      death: { imageSrc: `${player2BasePath}Death.png`, frameCount: getFrameCount(player2BasePath, 'death', opponentCharacter.name) }
    };

    // Initialize players
    const initPlayers = async () => {
      try {
        const [player1SpritesExist, player2SpritesExist] = await Promise.all([
          checkSpriteExists(player1BasePath),
          checkSpriteExists(player2BasePath)
        ]);

        if (!player1SpritesExist || !player2SpritesExist) {
          console.error('Sprites not found');
          return;
        }
        
        // Preload critical animations, especially death
        const preloadResults = await Promise.all([
          preloadAnimation(`${player1BasePath}Death.png`, 'player1-death'),
          preloadAnimation(`${player2BasePath}Death.png`, 'player2-death'),
          preloadAnimation(`${player1BasePath}Take_hit.png`, 'player1-hit'),
          preloadAnimation(`${player2BasePath}Get_Hit.png`, 'player2-hit')
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
      ctx.strokeRect(canvasWidth - barMargin - barWidth - 4, barMargin - 4, barWidth + 8, barHeight + 8);

      // Health bars
      ctx.fillStyle = '#e53935';
      const p1pixels = Math.round((player1Health.current / 100) * (barWidth / pixelSize));
      for (let i = 0; i < p1pixels; i++) {
        ctx.fillRect(barMargin + i * pixelSize, barMargin, pixelSize - 1, barHeight);
      }

      ctx.fillStyle = '#43a047';
      const p2pixels = Math.round((player2Health.current / 100) * (barWidth / pixelSize));
      for (let i = 0; i < p2pixels; i++) {
        ctx.fillRect(canvasWidth - barMargin - (i + 1) * pixelSize, barMargin, pixelSize - 1, barHeight);
      }

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
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Round ${round.current}`, canvasWidth / 2, canvasHeight / 2);
      }

      ctx.restore();
    };

    // Combat system
    const ATTACK_DAMAGE = 10;

    function getHitbox(player, width = 40, height = 120) {
      const offset = 150;
      return {
        x: player.position.x + (player.facing === 'right' ? player.width - width - offset : offset),
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
    }

    function isColliding(boxA, boxB) {
      return (
        boxA.x < boxB.x + boxB.width &&
        boxA.x + boxA.width > boxB.x &&
        boxA.y < boxB.y + boxB.height &&
        boxA.y + boxA.height > boxB.y
      );
    }    function checkAttackHit(attacker, defender, damage) {
      const hitbox = getHitbox(attacker);
      const targetBox = getBodyBox(defender);
      if (isColliding(hitbox, targetBox)) {
        // Only switch to hit animation if we're not dead
        if (defender.currentAnimation !== 'death') {
          // If already in hit animation, reset it to start from beginning
          if (defender.currentAnimation === 'getHit') {
            defender.resetAnimation();
          } else {
            // Otherwise switch to hit animation
            defender.switchAnimation('getHit');
          }
          
          // Flag to track this specific hit animation
          if (defender === player1Ref.current) {
            player1Attack.current.wasHit = true;
          } else {
            player2Attack.current.wasHit = true;
          }
        }
        
        handleGameEvent('damage', {
          target: defender === player1Ref.current ? 'player1' : 'player2',
          amount: damage
        });
        return true;
      }
      return false;
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

      // Движение по горизонтали
      if (keys.player1.left) player1Pos.current.x = Math.max(0, player1Pos.current.x - speed);
      if (keys.player1.right) player1Pos.current.x = Math.min(canvasWidth - player1Width, player1Pos.current.x + speed);
      if (keys.player2.left) player2Pos.current.x = Math.max(0, player2Pos.current.x - speed);
      if (keys.player2.right) player2Pos.current.x = Math.min(canvasWidth - player2Width, player2Pos.current.x + speed);

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
    };    const handleKeyDown = (e) => {
      // No controls if either player is dead
      if (player1Ref.current?.currentAnimation === 'death' || 
          player2Ref.current?.currentAnimation === 'death') return;

      // Player 1 controls
      if (e.code === 'KeyD') {
        keys.player1.right = true;
        player1Ref.current.switchAnimation('run');
        player1Ref.current.setFacing('right');
        onPlayerAction?.({ type: 'move', player: 'player1', direction: 'right' });
      }
      if (e.code === 'KeyA') {
        keys.player1.left = true;
        player1Ref.current.switchAnimation('run');
        player1Ref.current.setFacing('left');
        onPlayerAction?.({ type: 'move', player: 'player1', direction: 'left' });
      }
      if ((e.code === 'KeyW' || e.code === 'Space') && player1Pos.current.y === groundY1) {
        player1Velocity.current.y = -8;
        player1Ref.current.switchAnimation('jump');
        onPlayerAction?.({ type: 'jump', player: 'player1' });
      }
      if (e.code === 'KeyE' && !player1Attack.current.inProgress) {
        player1Ref.current.switchAnimation('attack1');
        player1Attack.current = { inProgress: true, type: 'attack1' };
        if (checkAttackHit(player1Ref.current, player2Ref.current, ATTACK_DAMAGE)) {
          onPlayerAction?.({ type: 'attack', player: 'player1', attackType: 'attack1', hit: true });
        }
      }
      if (e.code === 'KeyQ' && !player1Attack.current.inProgress) {
        player1Ref.current.switchAnimation('attack2');
        player1Attack.current = { inProgress: true, type: 'attack2' };
        if (checkAttackHit(player1Ref.current, player2Ref.current, ATTACK_DAMAGE)) {
          onPlayerAction?.({ type: 'attack', player: 'player1', attackType: 'attack2', hit: true });
        }
      }

      // Player 2 controls
      if (e.code === 'ArrowLeft') {
        keys.player2.left = true;
        player2Ref.current.switchAnimation('run');
        player2Ref.current.setFacing('left');
        onPlayerAction?.({ type: 'move', player: 'player2', direction: 'left' });
      }
      if (e.code === 'ArrowRight') {
        keys.player2.right = true;
        player2Ref.current.switchAnimation('run');
        player2Ref.current.setFacing('right');
        onPlayerAction?.({ type: 'move', player: 'player2', direction: 'right' });
      }
      if (e.code === 'ArrowUp' && player2Pos.current.y === groundY2) {
        player2Velocity.current.y = -8;
        player2Ref.current.switchAnimation('jump');
        onPlayerAction?.({ type: 'jump', player: 'player2' });
      }
      if (e.code === 'KeyK' && !player2Attack.current.inProgress) {
        player2Ref.current.switchAnimation('attack1');
        player2Attack.current = { inProgress: true, type: 'attack1' };
        if (checkAttackHit(player2Ref.current, player1Ref.current, ATTACK_DAMAGE)) {
          onPlayerAction?.({ type: 'attack', player: 'player2', attackType: 'attack1', hit: true });
        }
      }
      if (e.code === 'KeyL' && !player2Attack.current.inProgress) {
        player2Ref.current.switchAnimation('attack2');
        player2Attack.current = { inProgress: true, type: 'attack2' };
        if (checkAttackHit(player2Ref.current, player1Ref.current, ATTACK_DAMAGE)) {
          onPlayerAction?.({ type: 'attack', player: 'player2', attackType: 'attack2', hit: true });
        }
      }
    };    const handleKeyUp = (e) => {
      // No controls if either player is dead
      if (player1Ref.current?.currentAnimation === 'death' || 
          player2Ref.current?.currentAnimation === 'death') return;

      if (e.code === 'KeyD') keys.player1.right = false;
      if (e.code === 'KeyA') keys.player1.left = false;
      if (e.code === 'ArrowLeft') keys.player2.left = false;
      if (e.code === 'ArrowRight') keys.player2.right = false;

      // Reset to idle if not moving or attacking
      if (!keys.player1.left && !keys.player1.right && !player1Attack.current.inProgress &&
          player1Pos.current.y === groundY1) {
        player1Ref.current.switchAnimation('idle');
      }
      if (!keys.player2.left && !keys.player2.right && !player2Attack.current.inProgress &&
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
    };

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playerCharacter, opponentCharacter, getCharacterSpritePath, checkSpriteExists, onPlayerAction]);

  // Event handling
  const handleGameEvent = (eventType, eventData) => {
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
  };

  return (
    <div className="w-screen h-screen m-0 p-0 bg-black flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ background: 'transparent' }}
      />
    </div>
  );
};

export default GameCanvas;
