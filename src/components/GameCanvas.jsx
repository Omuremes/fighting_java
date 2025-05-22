import React, { useEffect, useRef, useState } from 'react';
import Player from '../classes/Player';

const GameCanvas = ({ gameState, onPlayerAction }) => {
  const canvasRef = useRef(null);
  const player1Pos = useRef({ x: 0, y: 0 });
  const player2Pos = useRef({ x: 0, y: 0 });
  const player1Velocity = useRef({ x: 0, y: 0 });
  const player2Velocity = useRef({ x: 0, y: 0 });
  const player1Health = useRef(100);
  const player2Health = useRef(100);
  const round = useRef(1);
  const [showRoundText, setShowRoundText] = useState(true);
  const [roundTextOpacity, setRoundTextOpacity] = useState(1); // Изменено с 0 на 1
  const player1Wins = useRef(0);
  const player2Wins = useRef(0);
  const speed = 8;
  const gravity = 0.10;

  // Эффект для начальной анимации текста раунда при старте
  useEffect(() => {
    // Показываем текст раунда при первой загрузке
    setShowRoundText(true);
    setRoundTextOpacity(1);
    
    // Скрываем текст через 2 секунды
    const timer = setTimeout(() => {
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

    return () => {
      clearTimeout(timer);
    };
  }, []); // Пустой массив зависимостей - эффект запускается только при монтировании

  // --- Удалено: player1Attack и player2Attack перемещены на верхний уровень ---

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const background = new Image();
    background.src = '/assets/2DBackground_22.png';

    const player1Animations = {
      idle: { imageSrc: '/assets/player1/Sprites/Idle.png', frameCount: 4 },
      run: { imageSrc: '/assets/player1/Sprites/Run.png', frameCount: 8 },
      jump: { imageSrc: '/assets/player1/Sprites/Jump.png', frameCount: 2 },
      fall: { imageSrc: '/assets/player1/Sprites/Fall.png', frameCount: 2 },
      attack1: { imageSrc: '/assets/player1/Sprites/Attack1.png', frameCount: 4 },
      attack2: { imageSrc: '/assets/player1/Sprites/Attack2.png', frameCount: 4 },
      getHit: { imageSrc: '/assets/player1/Sprites/Take_hit.png', frameCount: 3 },
      death: { imageSrc: '/assets/player1/Sprites/Death.png', frameCount: 7 },
    };

    // --- Анимации для player2 ---
    const player2Animations = {
      idle: { imageSrc: '/assets/player2/Sprites/Idle.png', frameCount: 10 },
      run: { imageSrc: '/assets/player2/Sprites/Run.png', frameCount: 6 },
      jump: { imageSrc: '/assets/player2/Sprites/Jump.png', frameCount: 2 },
      fall: { imageSrc: '/assets/player2/Sprites/Fall.png', frameCount: 2 },
      attack1: { imageSrc: '/assets/player2/Sprites/Attack1.png', frameCount: 4 },
      attack2: { imageSrc: '/assets/player2/Sprites/Attack2.png', frameCount: 4 },
      attack3: { imageSrc: '/assets/player2/Sprites/Attack3.png', frameCount: 5 },
      getHit: { imageSrc: '/assets/player2/Sprites/Get_Hit.png', frameCount: 3 },
      death: { imageSrc: '/assets/player2/Sprites/Death.png', frameCount: 9 },
    };

    // --- Исправляем пропорции и увеличиваем размеры персонажей ---
    // Размеры исходных спрайтов: player1 (800x200), player2 (1350x135)
    // Для player1: сохраняем пропорции 4:1 (ширина:высота)
    //   const player1Width = Math.min(600, window.innerWidth * 2); // увеличено
    // const player1Height = player1Width / 4;
    // Для player2: сохраняем пропорции ~10:1 (ширина:высота)
    // const player2Width = Math.min(1000, window.innerWidth * 5); // увеличено
    // const player2Height = player2Width / 10;
    // const groundY1 = window.innerHeight - player1Height - 40;
    // const groundY2 = window.innerHeight - player2Height - 40;

    // --- Используем исходные размеры спрайтов для отображения персонажей ---
    // player1: 800x200, player2: 1350x135
    // canvas теперь на весь экран
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.display = 'block';
    canvas.style.margin = '0';

    // player1 слева, player2 строго у правого края
    const player1Width = 500;
    const player1Height = 267;
    const player2Width = 500;
    const player2Height = 267;
    const groundY1 = canvasHeight - player1Height;
    const groundY2 = canvasHeight - player2Height;
    player1Pos.current = { x: 0, y: groundY1 };
    player2Pos.current = { x: canvasWidth - player2Width, y: groundY2 };
    player1Velocity.current = { x: 0, y: 0 };
    player2Velocity.current = { x: 0, y: 0 };

    const player1 = new Player({
      ctx,
      imageSrc: player1Animations.idle.imageSrc,
      position: player1Pos.current,
      frameCount: player1Animations.idle.frameCount,
      width: player1Width,
      height: player1Height,
      animationSpeed: 0.15 // замедление анимации
    });
    player1.setAnimations(player1Animations);

    const player2 = new Player({
      ctx,
      imageSrc: player2Animations.idle.imageSrc,
      position: player2Pos.current,
      frameCount: player2Animations.idle.frameCount,
      width: player2Width,
      height: player2Height,
      animationSpeed: 0.15 // замедление анимации
    });
    player2.setAnimations(player2Animations);

    // Центрируем фон по canvas
    const drawBackground = () => {
      // Если фон больше canvas, центрируем его
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
      // Смещаем фон вверх, чтобы "земля" совпала с низом canvas
      sy += 60; // подберите значение визуально, если нужно
      ctx.drawImage(background, sx, sy, sw, sh, dx, dy, dw, dh);
    };

    const drawHealthBars = () => {
      const barWidth = 300;
      const barHeight = 24;
      const barMargin = 32;
      const pixelSize = 10;

      ctx.save();
      ctx.globalAlpha = 1;

      // --- Задний фон полос ---
      ctx.fillStyle = '#222';

      // Player 1 background
      ctx.fillRect(barMargin - 4, barMargin - 4, barWidth + 8, barHeight + 8);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.strokeRect(barMargin - 4, barMargin - 4, barWidth + 8, barHeight + 8);

      // Player 2 background
      ctx.fillRect(canvasWidth - barMargin - barWidth - 4, barMargin - 4, barWidth + 8, barHeight + 8);
      ctx.strokeRect(canvasWidth - barMargin - barWidth - 4, barMargin - 4, barWidth + 8, barHeight + 8);

      // --- Заполнение здоровья ---
      // Player 1 (слева)
      ctx.fillStyle = '#e53935';
      const p1pixels = Math.round((player1Health.current / 100) * (barWidth / pixelSize));
      for (let i = 0; i < p1pixels; i++) {
        ctx.fillRect(barMargin + i * pixelSize, barMargin, pixelSize - 1, barHeight);
      }

      // Player 2 (справа)
      ctx.fillStyle = '#43a047';
      const p2pixels = Math.round((player2Health.current / 100) * (barWidth / pixelSize));
      for (let i = 0; i < p2pixels; i++) {
        ctx.fillRect(canvasWidth - barMargin - (i + 1) * pixelSize, barMargin, pixelSize - 1, barHeight);
      }

      // --- Крестики побед ---
      // Player 1 wins
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

      // Player 2 wins
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

      // --- Round Text ---
      if (showRoundText) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Round ${round.current}`, canvasWidth / 2, canvasHeight / 2);
      }

      ctx.restore();
    };


    const ATTACK_DAMAGE = 10;

    // Для регистрации ударов
    // Хитбоксы (простые прямоугольники)
    function getHitbox(player, width = 40, height = 120) {
      // Сдвигаем hitbox максимально близко к персонажу (отступ 150px от края)
      const offset = 150;
      return {
        x: player.position.x + (player.facing === 'right' ? player.width - width - offset : offset),
        y: player.position.y + player.height - height,
        width,
        height,
      };
    }

    function getBodyBox(player, width = 60, height = 170) {
      // Основной хитбокс тела
      return {
        x: player.position.x + (player.width - width) / 2,
        y: player.position.y + player.height - height,
        width,
        height,
      };
    }

    function isColliding(boxA, boxB) {
      return (
        boxA.x < boxB.x + boxB.width &&
        boxA.x + boxA.width > boxB.x &&
        boxA.y < boxB.y + boxB.height &&
        boxA.y + boxA.height > boxB.y
      );
    }

    // --- Удаляем глобальные флаги регистрации урона ---

    const animate = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground();

      // Отрисовка здоровья и крестиков побед
      drawHealthBars();      // Всегда рисуем текст раунда, если showRoundText true
      if (showRoundText) {
        ctx.save();
        ctx.globalAlpha = roundTextOpacity;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Round ${round.current}`, canvasWidth / 2, canvasHeight / 2);

        ctx.restore();
      }

      // --- Движение player1 ---
      if (keys.player1.left) player1Pos.current.x = Math.max(0, player1Pos.current.x - speed);
      if (keys.player1.right) player1Pos.current.x = Math.min(canvasWidth - player1Width, player1Pos.current.x + speed);
      // --- Движение player2 ---
      if (keys.player2.left) player2Pos.current.x = Math.max(0, player2Pos.current.x - speed);
      if (keys.player2.right) player2Pos.current.x = Math.min(canvasWidth - player2Width, player2Pos.current.x + speed);
      // --- Прыжки и гравитация ---
      // player1
      player1Pos.current.y += player1Velocity.current.y;
      if (player1Pos.current.y < groundY1) {
        player1Velocity.current.y += gravity;
        player1.setOnGround(false);
      } else {
        player1Pos.current.y = groundY1;
        player1Velocity.current.y = 0;
        player1.setOnGround(true);
      }
      player1.setVelocityY(player1Velocity.current.y);
      // player2
      player2Pos.current.y += player2Velocity.current.y;
      if (player2Pos.current.y < groundY2) {
        player2Velocity.current.y += gravity;
        player2.setOnGround(false);
      } else {
        player2Pos.current.y = groundY2;
        player2Velocity.current.y = 0;
        player2.setOnGround(true);
      }
      player2.setVelocityY(player2Velocity.current.y);
      // Обновляем позиции в Player
      player1.position = player1Pos.current;
      player2.position = player2Pos.current;
      player1.update();
      player2.update();

      // --- ВИЗУАЛИЗАЦИЯ ХИТБОКСОВ ---
      // Player1
      const p1Hitbox = getHitbox(player1);
      const p1BodyBox = getBodyBox(player1);
      ctx.save();
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.strokeRect(p1Hitbox.x, p1Hitbox.y, p1Hitbox.width, p1Hitbox.height);
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2;
      ctx.strokeRect(p1BodyBox.x, p1BodyBox.y, p1BodyBox.width, p1BodyBox.height);
      ctx.restore();
      // Player2
      const p2Hitbox = getHitbox(player2);
      const p2BodyBox = getBodyBox(player2);
      ctx.save();
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.strokeRect(p2Hitbox.x, p2Hitbox.y, p2Hitbox.width, p2Hitbox.height);
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2;
      ctx.strokeRect(p2BodyBox.x, p2BodyBox.y, p2BodyBox.width, p2BodyBox.height);
      ctx.restore();

      // --- Проверка завершения анимации удара и getHit для разблокировки новой атаки и возврата в idle ---
      if (player1Attack.current.inProgress) {
        const anim = player1.animations[player1Attack.current.type];
        // Если анимация getHit перебила атаку, сбрасываем атаку и возвращаем idle после getHit
        if (player1.currentAnimation === 'getHit') {
          player1Attack.current.inProgress = false;
          // Проверяем завершение getHit
          const getHitAnim = player1.animations['getHit'];
          if (player1.currentFrame === getHitAnim.frameCount - 1) {
            player1.switchAnimation('idle');
          }
        } else if (player1.currentAnimation === player1Attack.current.type && player1.currentFrame === anim.frameCount - 1) {
          player1Attack.current.inProgress = false;
          player1.switchAnimation('idle');
        }
      }
      if (player2Attack.current.inProgress) {
        const anim = player2.animations[player2Attack.current.type];
        if (player2.currentAnimation === 'getHit') {
          player2Attack.current.inProgress = false;
          const getHitAnim = player2.animations['getHit'];
          if (player2.currentFrame === getHitAnim.frameCount - 1) {
            player2.switchAnimation('idle');
          }
        } else if (player2.currentAnimation === player2Attack.current.type && player2.currentFrame === anim.frameCount - 1) {
          player2Attack.current.inProgress = false;
          player2.switchAnimation('idle');
        }
      }
      // --- Сброс анимации бега на idle, если не двигается и не атакует/не получает удар ---
      if (!keys.player1.left && !keys.player1.right && player1Pos.current.y === groundY1 &&
        !player1Attack.current.inProgress && player1.currentAnimation === 'run' && player1.currentAnimation !== 'getHit') {
        player1.switchAnimation('idle');
      }
      if (!keys.player2.left && !keys.player2.right && player2Pos.current.y === groundY2 &&
        !player2Attack.current.inProgress && player2.currentAnimation === 'run' && player2.currentAnimation !== 'getHit') {
        player2.switchAnimation('idle');
      }      // --- Death animation and round transition logic ---
      if (!animate.deathHandled) animate.deathHandled = { p1: false, p2: false };

      if (player1Health.current <= 0 && !animate.deathHandled.p1) {
        player1.lockAnimation('death');
        animate.deathHandled.p1 = true;
        player2Wins.current += 1;

      }
      if (player2Health.current <= 0 && !animate.deathHandled.p2) {
        player2.lockAnimation('death');
        animate.deathHandled.p2 = true;
        player1Wins.current += 1;

      }

      // Проверяем окончание анимации смерти
      if (player1Health.current <= 0 || player2Health.current <= 0) {
        const player1Dead = player1Health.current <= 0;
        const player2Dead = player2Health.current <= 0;
        
        if ((!player1Dead || (player1Dead && player1.animationEnded)) &&
            (!player2Dead || (player2Dead && player2.animationEnded))) {
            // Запускаем новый раунд
          round.current += 1;
          setShowRoundText(true);
          setRoundTextOpacity(1);

          
          // Сброс состояний здоровья и позиций
          player1Health.current = 100;
          player2Health.current = 100;
          player1Pos.current = { x: 0, y: groundY1 };
          player2Pos.current = { x: canvasWidth - player2Width, y: groundY2 };
          player1.animationEnded = false;
          player2.animationEnded = false;
          player1.currentFrame = 0;
          player2.currentFrame = 0;
          player1.unlockAnimation();
          player2.unlockAnimation();
          player1Attack.current = { inProgress: false, type: null };
          player2Attack.current = { inProgress: false, type: null };
          animate.deathHandled = { p1: false, p2: false };
          
          // Таймер для скрытия текста раунда
          setTimeout(() => {
            let opacity = 1;
            const fadeOut = setInterval(() => {
              opacity -= 0.05;
              if (opacity <= 0) {
                clearInterval(fadeOut);
                setRoundTextOpacity(0);
                setShowRoundText(false);
              } else {
                setRoundTextOpacity(opacity);
              }
            }, 50);
          }, 2000);
        }
      }

      requestAnimationFrame(animate);
    };

    const keys = {
      player1: { left: false, right: false },
      player2: { left: false, right: false },
    };

    const handleKeyDown = (e) => {
    // Player1 control - send actions to backend
    if (e.code === 'KeyD') {
      keys.player1.right = true;
      player1.switchAnimation('run');
      player1.setFacing('right');
      onPlayerAction && onPlayerAction("player1", "move", "right");
    }
    if (e.code === 'KeyA') {
      keys.player1.left = true;
      player1.switchAnimation('run');
      player1.setFacing('left');
      onPlayerAction && onPlayerAction("player1", "move", "left");
    }
    if ((e.code === 'KeyW' || e.code === 'Space') && player1Pos.current.y === groundY1) {
      player1Velocity.current.y = -8;
      onPlayerAction && onPlayerAction("player1", "jump");
    }
    if (e.code === 'KeyE' && !player1Attack.current.inProgress) {
      player1.switchAnimation('attack1');
      player1Attack.current.inProgress = true;
      player1Attack.current.type = 'attack1';
      onPlayerAction && onPlayerAction("player1", "attack", null, "attack1");
      
      // Proactively apply visual effects - backend will validate the hit
      const hitbox = getHitbox(player1);
      const targetBox = getBodyBox(player2);
      if (isColliding(hitbox, targetBox)) {
        player2.switchAnimation('getHit');
      }
    }
    if (e.code === 'KeyQ' && !player1Attack.current.inProgress) {
      player1.switchAnimation('attack2');
      player1Attack.current.inProgress = true;
      player1Attack.current.type = 'attack2';
      onPlayerAction && onPlayerAction("player1", "attack", null, "attack2");
      
      // Proactively apply visual effects - backend will validate the hit
      const hitbox = getHitbox(player1);
      const targetBox = getBodyBox(player2);
      if (isColliding(hitbox, targetBox)) {
        player2.switchAnimation('getHit');
      }
    }

    // Player2 control - send actions to backend
    if (e.code === 'ArrowLeft') {
      keys.player2.left = true;
      player2.switchAnimation('run');
      player2.setFacing('left');
      onPlayerAction && onPlayerAction("player2", "move", "left");
    }
    if (e.code === 'ArrowRight') {
      keys.player2.right = true;
      player2.switchAnimation('run');
      player2.setFacing('right');
      onPlayerAction && onPlayerAction("player2", "move", "right");
    }
    if (e.code === 'ArrowUp' && player2Pos.current.y === groundY2) {
      player2Velocity.current.y = -8;
      onPlayerAction && onPlayerAction("player2", "jump");
    }
    if (e.code === 'KeyK' && !player2Attack.current.inProgress) {
      player2.switchAnimation('attack1');
      player2Attack.current.inProgress = true;
      player2Attack.current.type = 'attack1';
      onPlayerAction && onPlayerAction("player2", "attack", null, "attack1");
      
      // Proactively apply visual effects - backend will validate the hit
      const hitbox = getHitbox(player2);
      const targetBox = getBodyBox(player1);
      if (isColliding(hitbox, targetBox)) {
        player1.switchAnimation('getHit');
      }
    }
    if (e.code === 'KeyL' && !player2Attack.current.inProgress) {
      player2.switchAnimation('attack2');
      player2Attack.current.inProgress = true;
      player2Attack.current.type = 'attack2';
      onPlayerAction && onPlayerAction("player2", "attack", null, "attack2");
      
      // Proactively apply visual effects - backend will validate the hit
      const hitbox = getHitbox(player2);
      const targetBox = getBodyBox(player1);
      if (isColliding(hitbox, targetBox)) {
        player1.switchAnimation('getHit');
      }
    }
  };

    const handleKeyUp = (e) => {
      // Player1
      if (e.code === 'KeyD') keys.player1.right = false;
      if (e.code === 'KeyA') keys.player1.left = false;
      // Player2
      if (e.code === 'ArrowLeft') keys.player2.left = false;
      if (e.code === 'ArrowRight') keys.player2.right = false;
      // --- Исправлено: не сбрасывать анимацию удара по отпусканию кнопки ---
      // Сброс анимации на idle, если не двигается и не атакует
      if (!keys.player1.left && !keys.player1.right && player1Pos.current.y === groundY1 && !player1Attack.current.inProgress) player1.switchAnimation('idle');
      if (!keys.player2.left && !keys.player2.right && player2Pos.current.y === groundY2 && !player2Attack.current.inProgress) player2.switchAnimation('idle');
    };
    window.addEventListener('keydown', handleKeyDown);    window.addEventListener('keyup', handleKeyUp);
    background.onload = animate;

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // --- Перемещено: player1Attack и player2Attack на верхний уровень компонента ---
  const player1Attack = useRef({ inProgress: false, type: null });
  const player2Attack = useRef({ inProgress: false, type: null });
  // --- Добавляем ссылку на функцию перехода к новому раунду ---
  const nextRoundRef = useRef();
  const drawVictoryCrosses = (ctx) => {
    const crossSize = 30;
    const spacing = 40;
    const startY = 50;
    
    // Крестики для первого игрока
    for (let i = 0; i < player1Wins; i++) {
      const startX = 50 + (i * spacing);
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX - crossSize/2, startY - crossSize/2);
      ctx.lineTo(startX + crossSize/2, startY + crossSize/2);
      ctx.moveTo(startX + crossSize/2, startY - crossSize/2);
      ctx.lineTo(startX - crossSize/2, startY + crossSize/2);
      ctx.stroke();
    }

    // Крестики для второго игрока
    for (let i = 0; i < player2Wins; i++) {
      const startX = ctx.canvas.width - 50 - (i * spacing);
      ctx.strokeStyle = '#0000ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startX - crossSize/2, startY - crossSize/2);
      ctx.lineTo(startX + crossSize/2, startY + crossSize/2);
      ctx.moveTo(startX + crossSize/2, startY - crossSize/2);
      ctx.lineTo(startX - crossSize/2, startY + crossSize/2);
      ctx.stroke();
    }
  };  // Эффект для анимации текста раунда
      useEffect(() => {
        let frameId;
        let opacity = 0;
        let fadingIn = true;
        let fadingOut = false;
        let visibleDuration = 2000;
        let startTime = null;

        const step = (timestamp) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;

          if (fadingIn) {
            opacity = Math.min(1, opacity + 0.05);
            setRoundTextOpacity(opacity);
            if (opacity >= 1) {
              fadingIn = false;
              setTimeout(() => {
                fadingOut = true;
                startTime = null;
                frameId = requestAnimationFrame(step);
              }, visibleDuration);
              return;
            }
          } else if (fadingOut) {
            opacity = Math.max(0, opacity - 0.05);
            setRoundTextOpacity(opacity);
            if (opacity <= 0) {
              setShowRoundText(false);
              return;
            }
          }

          frameId = requestAnimationFrame(step);
        };

        if (showRoundText) {
          frameId = requestAnimationFrame(step);
        }

        return () => cancelAnimationFrame(frameId);
      }, [showRoundText]);


  // Обновляем состояние игры когда получаем его из пропсов
  useEffect(() => {
    if (gameState) {
      console.log("GameCanvas: получено обновление gameState:", gameState);
      // Обновляем здоровье игроков из gameState
      const p1Health = gameState.player1?.health || 100;
      const p2Health = gameState.player2?.health || 100;
      
      console.log("GameCanvas: обновляем здоровье:", 
        `P1: ${player1Health.current} -> ${p1Health}`, 
        `P2: ${player2Health.current} -> ${p2Health}`);
      
      player1Health.current = p1Health;
      player2Health.current = p2Health;
      
      // Обновляем количество побед
      player1Wins.current = gameState.player1?.wins || 0;
      player2Wins.current = gameState.player2?.wins || 0;
      
      // Обновляем номер раунда
      round.current = gameState.round || 1;
    }
  }, [gameState]);

  return (
    <div className="w-screen h-screen m-0 p-0 bg-black flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="block w-full h-full"
        style={{ background: 'transparent', display: 'block' }}
      />
    </div>
  );
};

export default GameCanvas;
