export default class Player {  constructor({ ctx, imageSrc, position, frameCount, width, height, animationSpeed = 0.1 }) {
    this.ctx = ctx;
    this.image = new Image();
    this.imageLoaded = false;
    this.imageError = false;
    
    this.image.onerror = () => {
      console.error("Error loading image:", imageSrc);
      this.imageError = true;
    };
    this.image.onload = () => {
      console.log("Image loaded successfully:", imageSrc);
      this.imageLoaded = true;
    };
    
    // Start loading the image
    this.image.src = imageSrc;
    
    this.position = { ...position };
    this.width = width;
    this.height = height;
    this.frameCount = frameCount;
    this.currentFrame = 0;
    this.framesElapsed = 0;
    this.animationSpeed = animationSpeed;
    this.facing = 'right';
    this.velocityY = 0;
    this.onGround = true;    
    this.currentAnimation = 'idle';
    this.animations = {};
    this.locked = false;
    this.animationEnded = false;
    this.deathAnimationCompleted = false;
    
    // For error recovery
    this.loadRetries = 0;
    this.maxRetries = 2;
  }
  setAnimations(animations) {
    this.animations = animations;
    
    // Validate critical animations
    this.validateAnimation('death');
    this.validateAnimation('idle');
    this.validateAnimation('getHit');
  }
  
  validateAnimation(animationName) {
    if (!this.animations[animationName]) {
      console.warn(`Missing animation: ${animationName}`);
      return false;
    }
    
    if (!this.animations[animationName].imageSrc) {
      console.warn(`Missing image source for animation: ${animationName}`);
      return false;
    }
    
    return true;
  }

  setFacing(direction) {
    this.facing = direction;
  }

  setVelocityY(velocity) {
    this.velocityY = velocity;
  }

  setOnGround(value) {
    this.onGround = value;
  }  update() {
    // Animation frame update
    this.framesElapsed++;
    if (this.framesElapsed >= 1 / this.animationSpeed) {
      this.framesElapsed = 0;
      
      // Special handling for hit animation - should play only once even if not locked
      if (this.currentAnimation === 'getHit') {
        if (this.currentFrame < this.frameCount - 1) {
          this.currentFrame++;
        } else {
          this.animationEnded = true;
          // When hit animation ends, we should not loop it
          // The switchAnimation logic in GameCanvas will handle transitioning back to idle
        }
      }      // Special handling for death animation - always play to completion and never loop
      else if (this.currentAnimation === 'death') {
        if (this.currentFrame < this.frameCount - 1) {
          this.currentFrame++;
        } else {
          this.animationEnded = true;
          this.deathAnimationCompleted = true;
          console.log("Death animation completed", this.currentFrame, this.frameCount);
          // Death animation completed - no auto transition
        }
      }
      else if (!this.locked) {
        this.currentFrame = (this.currentFrame + 1) % this.frameCount;
      } else if (this.currentFrame < this.frameCount - 1) {
        this.currentFrame++;
      } else {
        this.animationEnded = true;
      }
    }    // Draw the character
    if (this.image.complete && this.image.naturalWidth !== 0) {
      try {
        const frameWidth = this.image.width / this.frameCount;
        const frameHeight = this.image.height;
        
        this.ctx.save();
        if (this.facing === 'left') {
          this.ctx.translate(this.position.x + this.width, this.position.y);
          this.ctx.scale(-1, 1);
        } else {
          this.ctx.translate(this.position.x, this.position.y);
        }
        
        this.ctx.drawImage(
          this.image,
          this.currentFrame * frameWidth,
          0,
          frameWidth,
          frameHeight,
          0,
          0,
          this.width,
          this.height
        );
        this.ctx.restore();
      } catch (error) {
        console.error("Error drawing image:", error.message);
        console.error("Image details:", {
          src: this.image.src,
          width: this.image.width,
          height: this.image.height,
          frame: this.currentFrame,
          frameCount: this.frameCount
        });
      }
    }
  }  switchAnimation(animationType) {
    // Check if the animation exists and if the player is not locked
    if (!this.animations[animationType]) {
      console.error(`Animation not found: ${animationType}`);
      return;
    }
      // If player is locked but we're switching to death, allow it
    if (this.locked && animationType !== 'death') return;
    
    // Never switch from death animation (death is final) unless we're starting a new round
    // This special check is for idle only, which indicates a round reset
    if (this.currentAnimation === 'death' && animationType !== 'idle') return;
    
    // If it's the same animation, and it's not idle or getHit, don't switch (avoid frame reset)
    if (this.currentAnimation === animationType && 
        animationType !== 'idle' && 
        animationType !== 'getHit') return;
    
    // Special handling for attack animations - they should play to completion
    if (this.currentAnimation.startsWith('attack')) {
      // If attack animation isn't finished yet, and it's not another attack, don't switch
      if (!this.animationEnded && this.currentFrame < this.frameCount - 1 && 
          !(animationType.startsWith('attack') && this.currentAnimation !== animationType)) {
        return;
      }
    }
    
    // For getHit, only allow interruption for death, attack, or if animation is already finished
    if (this.currentAnimation === 'getHit' && !this.animationEnded) {
      if (animationType !== 'death' && !animationType.startsWith('attack') && 
          this.currentFrame < this.frameCount - 1) {
        return;
      }
    }
    
    // Debug log for death animation
    if (animationType === 'death') {
      console.log(`Switching to death animation, frameCount: ${this.animations[animationType].frameCount}`);
    }
    
    // Reset image loading state flags
    this.imageLoaded = false;
    this.imageError = false;
    
    // Switch to the new animation
    this.currentAnimation = animationType;
    
    // Get the image path from animations
    const newImageSrc = this.animations[animationType].imageSrc;
    
    // Only change the image source if it's different to avoid unnecessary reloading
    if (this.image.src !== newImageSrc) {
      console.log(`Loading animation: ${animationType} from ${newImageSrc}`);
      this.image.src = newImageSrc;
    }
    
    this.frameCount = this.animations[animationType].frameCount;
    this.currentFrame = 0;
    this.framesElapsed = 0;
    this.animationEnded = false;
  }lockAnimation(animationType) {
    this.locked = true;
    
    // Special handling for death animation
    if (animationType === 'death') {
      console.log("Locking for death animation");
      // Make sure we reset animation state for death
      this.currentFrame = 0;
      this.framesElapsed = 0;
      this.animationEnded = false;
    }
    
    // We use switchAnimation rather than direct assignment to make sure
    // all the proper validations occur
    this.switchAnimation(animationType);
  }

  unlockAnimation() {
    this.locked = false;
    this.animationEnded = false;
  }
  
  // Force reset the current animation
  resetAnimation() {
    this.currentFrame = 0;
    this.framesElapsed = 0;
    this.animationEnded = false;
  }  // Helper method to check if current animation is complete
  isAnimationComplete() {
    if (!this.currentAnimation || !this.animations[this.currentAnimation]) {
      console.warn("Animation not defined:", this.currentAnimation);
      return true;
    }
    return this.currentFrame >= (this.animations[this.currentAnimation].frameCount - 1);
  }
  // Complete reset for player between rounds
  completeReset() {
    // Unlock animations
    this.locked = false;
    this.animationEnded = false;
    this.deathAnimationCompleted = false;
    this.currentFrame = 0;
    this.framesElapsed = 0;
    
    // Force animation state change without checks
    this.currentAnimation = 'idle';
    this.image.src = this.animations['idle'].imageSrc;
    this.frameCount = this.animations['idle'].frameCount;
    
    console.log("Player completely reset to idle state");
  }
    
  // Force the player to play the death animation properly
  forceDeathAnimation() {
    if (!this.animations.death) {
      console.error("Death animation not available");
      return;
    }
    
    const deathSrc = this.animations.death.imageSrc;
    const frameCount = this.animations.death.frameCount;
    
    console.log("Forcing death animation with frame count:", frameCount);
    console.log("Death animation path:", deathSrc);
    
    // Setup image load handlers
    this.image.onerror = () => {
      console.error("Failed to load death animation:", deathSrc);
    };
    
    this.image.onload = () => {
      console.log("Death animation loaded successfully:", deathSrc);
    };
      // Force the animation state
    this.currentAnimation = 'death';
    this.image.src = deathSrc;
    this.frameCount = frameCount;
    this.currentFrame = 0;
    this.framesElapsed = 0;
    this.animationEnded = false;
    this.deathAnimationCompleted = false;
    this.locked = true;
  }
}
