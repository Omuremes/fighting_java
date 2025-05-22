// A simple test script to verify game mechanics
const fetch = require('node-fetch');

async function runTest() {
  console.log('Starting game mechanics test...');
  
  // Create a new game
  console.log('Creating new game...');
  const newGameResponse = await fetch('http://localhost:8082/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player1: {
        id: 'player1',
        name: 'Test Player 1'
      },
      player2: {
        id: 'player2',
        name: 'Test Player 2'
      }
    })
  });
  
  const newGame = await newGameResponse.json();
  console.log(`Game created with ID: ${newGame.id}`);
  console.log('Initial game state:', JSON.stringify(newGame, null, 2));
  
  // Move players close to each other for testing attacks
  console.log('\nMoving players very close to each other...');
  
  // Move player 2 several times to get closer to player 1
  for (let i = 0; i < 3; i++) {
    const moveResponse = await fetch('http://localhost:8082/api/games/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: newGame.id,
        playerId: 'player2',
        actionType: 'move',
        direction: 'left'
      })
    });
    await moveResponse.json();
  }
  
  // Check final positions
  const positionCheckResponse = await fetch(`http://localhost:8082/api/games/${newGame.id}`);
  const gameAfterMove = await positionCheckResponse.json();
  
  console.log('Players positioned. Player positions:', {
    player1: { x: gameAfterMove.player1.x, facing: gameAfterMove.player1.facing },
    player2: { x: gameAfterMove.player2.x, facing: gameAfterMove.player2.facing },
    distance: Math.abs(gameAfterMove.player1.x - gameAfterMove.player2.x)
  });
  
  // Test player1 attacking player2
  console.log('\nTesting player1 attacking player2...');
  const attackResponse = await fetch('http://localhost:8082/api/games/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameId: newGame.id,
      playerId: 'player1',
      actionType: 'attack',
      attackType: 'attack1'
    })
  });
  
  const gameAfterAttack = await attackResponse.json();
  
  // Check if attack was processed correctly
  console.log('Game state after attack:', {
    player1Health: gameAfterAttack.player1.health,
    player2Health: gameAfterAttack.player2.health,
    player1Animation: gameAfterAttack.player1.currentAnimation,
    player2Animation: gameAfterAttack.player2.currentAnimation
  });
  
  if (gameAfterAttack.player2.health < 100) {
    console.log('✅ Test PASSED: player2 received damage from player1 attack!');
  } else {
    console.log('❌ Test FAILED: player2 did not receive damage from player1 attack.');
  }
}

runTest().catch(err => {
  console.error('Test error:', err);
});
