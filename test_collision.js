/**
 * Test script to verify attack mechanics and collision detection
 * 
 * This script simulates a series of attacks with players at different positions and facings
 * to verify that collision detection is working correctly in both frontend and backend.
 */

// Test player positions
const testPositions = [
  // Players close together, player1 facing right, player2 facing left - should hit
  { player1: { x: 300, facing: 'right' }, player2: { x: 450, facing: 'left' } },
  
  // Players too far apart - should miss
  { player1: { x: 100, facing: 'right' }, player2: { x: 800, facing: 'left' } },
  
  // Player1 facing wrong direction - should miss
  { player1: { x: 400, facing: 'left' }, player2: { x: 600, facing: 'left' } },
  
  // Player2 facing wrong direction - should miss 
  { player1: { x: 400, facing: 'right' }, player2: { x: 200, facing: 'right' } },
  
  // Both facing correct directions and within range - should hit
  { player1: { x: 600, facing: 'left' }, player2: { x: 400, facing: 'right' } },
];

// Function to test frontend collision detection
function testFrontendCollisions() {
  console.log("===== TESTING FRONTEND COLLISION DETECTION (FINAL) =====");
  
  testPositions.forEach((pos, index) => {
    const p1 = { position: { x: pos.player1.x, y: 500 }, facing: pos.player1.facing, width: 500, height: 267 };
    const p2 = { position: { x: pos.player2.x, y: 500 }, facing: pos.player2.facing, width: 500, height: 267 };
    
    // Use the improved frontend hitbox calculation
    const hitboxWidth = 100;
    const offset = 100;
    const p1Hitbox = {
      x: p1.facing === 'right' 
         ? p1.position.x + p1.width - hitboxWidth - offset
         : p1.position.x + offset - hitboxWidth/2, // Adjusted for left-facing
      y: p1.position.y + p1.height - 120,
      width: hitboxWidth * 2, // Wider hitbox
      height: 120,
      facing: p1.facing
    };
    
    const p2BodyBox = {
      x: p2.position.x + (p2.width - 80) / 2,
      y: p2.position.y + p2.height - 170,
      width: 80, // Wider bodybox
      height: 170
    };
    
    // Check collision
    const basicCollision = (
      p1Hitbox.x < p2BodyBox.x + p2BodyBox.width &&
      p1Hitbox.x + p1Hitbox.width > p2BodyBox.x &&
      p1Hitbox.y < p2BodyBox.y + p2BodyBox.height &&
      p1Hitbox.y + p1Hitbox.height > p2BodyBox.y
    );
    
    // Direction check
    let correctDirection = false;
    if (p1Hitbox.facing === 'right' && p1Hitbox.x < p2BodyBox.x) {
      correctDirection = true;
    } else if (p1Hitbox.facing === 'left' && p1Hitbox.x > p2BodyBox.x) {
      correctDirection = true;
    }
    
    const hit = basicCollision && correctDirection;
    
    console.log(`Test #${index + 1}:`);
    console.log(`  Player1: x=${pos.player1.x}, facing=${pos.player1.facing}`);
    console.log(`  Player2: x=${pos.player2.x}, facing=${pos.player2.facing}`);
    console.log(`  Distance: ${Math.abs(p1.position.x - p2.position.x)}`);
    console.log(`  Hitbox: x=${p1Hitbox.x}, width=${p1Hitbox.width}`);
    console.log(`  BodyBox: x=${p2BodyBox.x}, width=${p2BodyBox.width}`);
    console.log(`  Basic collision: ${basicCollision}`);
    console.log(`  Correct direction: ${correctDirection}`);
    console.log(`  Hit registered: ${hit}`);
    console.log();
  });
}

// Function to simulate backend collision detection
function testBackendCollisions() {
  console.log("===== TESTING BACKEND COLLISION DETECTION =====");
  
  // Backend uses slightly different collision logic
  const ATTACK_RANGE = 250;
  
  testPositions.forEach((pos, index) => {
    // Calculate distance between players
    const distance = Math.abs(pos.player1.x - pos.player2.x);
    
    // Direction check
    let correctDirection = false;
    if (pos.player1.facing === 'right' && pos.player1.x < pos.player2.x) {
      correctDirection = true;
    } else if (pos.player1.facing === 'left' && pos.player1.x > pos.player2.x) {
      correctDirection = true;
    }
    
    // Hit is successful if within range AND facing the correct direction
    const hit = distance <= ATTACK_RANGE && correctDirection;
    
    console.log(`Test #${index + 1}:`);
    console.log(`  Player1: x=${pos.player1.x}, facing=${pos.player1.facing}`);
    console.log(`  Player2: x=${pos.player2.x}, facing=${pos.player2.facing}`);
    console.log(`  Distance: ${distance}`);
    console.log(`  Within range (${ATTACK_RANGE}px): ${distance <= ATTACK_RANGE}`);
    console.log(`  Correct direction: ${correctDirection}`);
    console.log(`  Hit registered: ${hit}`);
    console.log();
  });
}

// Run the tests
console.log("========= ATTACK MECHANICS TEST SCRIPT =========");
testFrontendCollisions();
testBackendCollisions();
console.log("===============================================");
