export default class Player {
  constructor({ ctx, imageSrc, position, frameCount = 4, width = 100, height = 150 }) {
    this.ctx = ctx;
    this.position = position;
    this.width = width;
    this.height = height;
    this.frameCount = frameCount;
    this.currentFrame = 0;
    this.frameElapsed = 0;
    this.frameHold = 20;

    this.animations = {};
    this.currentAnimation = 'idle';
    this.isAnimationLocked = false;
    this.animationEnded = false; // ✅ флаг окончания анимации

    this.facing = 'right';

    const image = new Image();
    image.src = imageSrc;
    this.image = image;
  }

  setAnimations(animations) {
    this.animations = {};
    for (const key in animations) {
      const anim = animations[key];
      const img = new Image();
      img.src = anim.imageSrc;

      this.animations[key] = {
        ...anim,
        image: img,
      };
    }
    this.image = this.animations['idle'].image;
    this.frameCount = this.animations['idle'].frameCount;
  }

  switchAnimation(name) {
    if (this.currentAnimation === name || this.isAnimationLocked) return;
    if (!this.animations[name]) return;

    this.currentAnimation = name;
    this.image = this.animations[name].image;
    this.frameCount = this.animations[name].frameCount;
    this.currentFrame = 0;
    this.animationEnded = false; // сброс флага
  }

  lockAnimation(name) {
    this.isAnimationLocked = true;
    // Принудительно переключаем анимацию даже если уже заблокировано
    if (this.currentAnimation !== name) {
      this.currentAnimation = name;
      if (this.animations[name]) {
        this.image = this.animations[name].image;
        this.frameCount = this.animations[name].frameCount;
        this.currentFrame = 0;
        this.animationEnded = false;
      }
    }
  }

  unlockAnimation() {
    this.isAnimationLocked = false;
    this.switchAnimation('idle');
  }

  setVelocityY(vy) {
    this.velocityY = vy;
  }

  setOnGround(onGround) {
    this.onGround = onGround;
  }

  setFacing(direction) {
    this.facing = direction;
  }

  draw() {
    if (!this.image.complete || this.image.width === 0) return;
    const frameWidth = this.image.width / this.frameCount;
    this.ctx.save();
    if (this.facing === 'left') {
      this.ctx.translate(this.position.x + this.width / 2, this.position.y);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(
        this.image,
        this.currentFrame * frameWidth, 0,
        frameWidth, this.image.height,
        -this.width / 2, 0,
        this.width, this.height
      );
    } else {
      this.ctx.drawImage(
        this.image,
        this.currentFrame * frameWidth, 0,
        frameWidth, this.image.height,
        this.position.x, this.position.y,
        this.width, this.height
      );
    }
    this.ctx.restore();
  }

  update() {
    if (!this.isAnimationLocked) {
      if (!this.onGround) {
        if (this.velocityY < 0 && this.currentAnimation !== 'jump') {
          this.switchAnimation('jump');
        } else if (this.velocityY > 0 && this.currentAnimation !== 'fall') {
          this.switchAnimation('fall');
        }
      } else if (this.currentAnimation === 'jump' || this.currentAnimation === 'fall') {
        this.switchAnimation('idle');
      }
    }

    this.frameElapsed++;
    if (this.frameElapsed % this.frameHold === 0) {
      if (this.currentAnimation === 'death') {
        if (this.currentFrame < this.frameCount - 1) {
          this.currentFrame++;
        } else {
          this.animationEnded = true;
        }
      } else {
        this.currentFrame = (this.currentFrame + 1) % this.frameCount;
      }

      // Возврат к idle для других анимаций
      if (
        this.currentFrame === 0 &&
        !this.isAnimationLocked &&
        this.currentAnimation !== 'idle' &&
        !this.currentAnimation.startsWith('attack') &&
        this.currentAnimation !== 'death'
      ) {
        this.switchAnimation('idle');
      }
    }

    this.draw();
  }
}
