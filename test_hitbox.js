/**
 * Test script to verify the new hitbox configuration
 * 
 * This script simulates a series of attacks with adjusted hitboxes
 * to verify that collision detection is working correctly.
 */

// Test player positions - with adjusted hitbox sizes and positions
const testPositions = [
  // Players very close together - should definitely hit
  { player1: { x: 350, facing: 'right' }, player2: { x: 420, facing: 'left' } },
  
  // Players at medium range - should still hit 
  { player1: { x: 300, facing: 'right' }, player2: { x: 450, facing: 'left' } },
  
  // Players at edge of range - might hit with optimized hitboxes
  { player1: { x: 250, facing: 'right' }, player2: { x: 480, facing: 'left' } },
  
  // Players facing opposite directions (P1 right, P2 right) - should only hit if aligned
  { player1: { x: 300, facing: 'right' }, player2: { x: 450, facing: 'right' } },
  
  // Players facing opposite directions (P1 left, P2 left) - should only hit if aligned
  { player1: { x: 450, facing: 'left' }, player2: { x: 300, facing: 'left' } },
];

function testHitboxes() {
  console.log("===== TESTING OPTIMIZED HITBOX CONFIGURATION =====");
  
  testPositions.forEach((pos, index) => {
    const p1 = { position: { x: pos.player1.x, y: 500 }, facing: pos.player1.facing, width: 500, height: 267 };
    const p2 = { position: { x: pos.player2.x, y: 500 }, facing: pos.player2.facing, width: 500, height: 267 };
    
    // Use the new hitbox dimensions and positions
    const hitboxWidth = 70;
    const hitboxHeight = 100;
    const bodyBoxWidth = 90;
    const bodyBoxHeight = 150;
    
    // Construct player 1 hitbox with updated calculation
    let hitboxX;
    if (p1.facing === 'right') {
      hitboxX = p1.position.x + p1.width - 150; 
    } else {
      hitboxX = p1.position.x + 80;
    }
    
    const p1Hitbox = {
      x: hitboxX,
      y: p1.position.y + p1.height - hitboxHeight - 20,
      width: hitboxWidth,
      height: hitboxHeight,
      facing: p1.facing
    };
    
    // Construct player 2 bodybox
    const p2BodyBox = {
      x: p2.position.x + (p2.width - bodyBoxWidth) / 2,
      y: p2.position.y + p2.height - bodyBoxHeight - 20,
      width: bodyBoxWidth,
      height: bodyBoxHeight
    };
    
    // Check for basic collision
    const basicCollision = (
      p1Hitbox.x < p2BodyBox.x + p2BodyBox.width &&
      p1Hitbox.x + p1Hitbox.width > p2BodyBox.x &&
      p1Hitbox.y < p2BodyBox.y + p2BodyBox.height &&
      p1Hitbox.y + p1Hitbox.height > p2BodyBox.y
    );
    
    // Check for correct direction with improved direction calculation
    let correctDirection = false;
    if (p1Hitbox.facing === 'right' && 
        (p1Hitbox.x + p1Hitbox.width/2) < (p2BodyBox.x + p2BodyBox.width/2)) {
      correctDirection = true;
    } else if (p1Hitbox.facing === 'left' && 
               (p1Hitbox.x + p1Hitbox.width/2) > (p2BodyBox.x + p2BodyBox.width/2)) {
      correctDirection = true;
    }
    
    const hit = basicCollision && correctDirection;
    
    console.log(`Test #${index + 1}:`);
    console.log(`  Player1: x=${pos.player1.x}, facing=${pos.player1.facing}`);
    console.log(`  Player2: x=${pos.player2.x}, facing=${pos.player2.facing}`);
    console.log(`  Player distance: ${Math.abs(p1.position.x - p2.position.x)}`);
    console.log(`  Hitbox details: x=${p1Hitbox.x}, width=${p1Hitbox.width}`);
    console.log(`  BodyBox details: x=${p2BodyBox.x}, width=${p2BodyBox.width}`);
    console.log(`  Hitbox to bodybox distance: ${Math.abs((p1Hitbox.x + p1Hitbox.width/2) - (p2BodyBox.x + p2BodyBox.width/2))}`);
    console.log(`  Basic collision: ${basicCollision}`);
    console.log(`  Correct direction: ${correctDirection}`);
    console.log(`  Hit registered: ${hit}`);
    console.log();
  });
}

// Run the test
console.log("========= HITBOX OPTIMIZATION TEST SCRIPT =========");
testHitboxes();
console.log("=================================================");
