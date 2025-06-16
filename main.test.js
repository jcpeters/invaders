// Space Invaders Game Tests
// These tests use Jest and jsdom to simulate the browser environment.
// To run: npm install jest @jest-environment/jsdom --save-dev
// Add "test": "jest" to your package.json scripts.

/**
 * @jest-environment jsdom
 */

const { initGame } = require('./main');

describe('Space Invaders Game', () => {
  let canvas, game;

  beforeEach(() => {
    document.body.innerHTML = '<canvas id="gameCanvas" width="480" height="640"></canvas>';
    canvas = document.getElementById('gameCanvas');
    game = initGame(canvas);
    game.reset();
  });

  test('player is initialized in the correct position', () => {
    expect(game.player.x).toBeCloseTo(canvas.width / 2 - game.PLAYER_WIDTH / 2);
    expect(game.player.y).toBe(canvas.height - game.PLAYER_HEIGHT - 10);
  });

  test('enemies are created in correct amount', () => {
    game.createEnemies();
    expect(game.enemies.length).toBe(game.ENEMY_ROWS * game.ENEMY_COLS);
  });

  test('player moves left and right', () => {
    const startX = game.player.x;
    game.leftPressed = true;
    game.movePlayer();
    expect(game.player.x).toBeLessThan(startX);
    game.leftPressed = false;
    game.rightPressed = true;
    game.movePlayer();
    expect(game.player.x).toBeGreaterThan(startX - game.PLAYER_SPEED);
  });

  test('shootBullet adds a bullet', () => {
    game.spacePressed = true;
    game.shootBullet();
    expect(game.bullets.length).toBe(1);
  });

  test('bullets move up and are removed when off screen', () => {
    game.bullets.push({ x: 100, y: 5 });
    game.moveBullets();
    expect(game.bullets.length).toBe(0);
  });

  test('enemy is killed by bullet', () => {
    game.createEnemies();
    const enemy = game.enemies[0];
    enemy.x = 100;
    enemy.y = 100;
    game.bullets.push({ x: 100, y: 100 });
    game.checkCollisions();
    expect(enemy.alive).toBe(false);
  });

  test('player loses a life when enemy reaches player', () => {
    game.createEnemies();
    const enemy = game.enemies[0];
    enemy.x = game.player.x;
    enemy.y = game.player.y;
    enemy.alive = true;
    const startingLives = game.lives;
    game.checkCollisions();
    expect(game.lives).toBe(startingLives - 1);
  });

  test('player only loses one life when multiple enemies reach player at once', () => {
    game.createEnemies();
    // Place two enemies at the player's position
    const enemy1 = game.enemies[0];
    const enemy2 = game.enemies[1];
    enemy1.x = game.player.x;
    enemy1.y = game.player.y;
    enemy1.alive = true;
    enemy2.x = game.player.x;
    enemy2.y = game.player.y;
    enemy2.alive = true;
    const startingLives = game.lives;
    game.checkCollisions();
    // Only one life should be lost, not two
    expect(game.lives).toBe(startingLives - 1);
  });

  test('player is respawning after losing a life', () => {
    jest.useFakeTimers();
    game.createEnemies();
    // Place an enemy at the player's position to trigger a collision
    const enemy = game.enemies[0];
    enemy.x = game.player.x;
    enemy.y = game.player.y;
    enemy.alive = true;
    game.checkCollisions();
    expect(game.respawning).toBe(true);
    // Fast-forward time to after respawn
    jest.advanceTimersByTime(1200);
    expect(game.respawning).toBe(false);
    jest.useRealTimers();
  });

  test('player and bullets are reset after respawn', () => {
    jest.useFakeTimers();
    game.createEnemies();
    // Add a bullet and move player to a non-default position
    game.bullets.push({ x: 10, y: 10 });
    game.player.x = 10;
    game.player.y = 10;
    // Place an enemy at the player's position to trigger a collision
    const enemy = game.enemies[0];
    enemy.x = game.player.x;
    enemy.y = game.player.y;
    enemy.alive = true;
    game.checkCollisions();
    // Fast-forward time to after respawn
    jest.advanceTimersByTime(1200);
    // Player should be at default position and bullets cleared
    expect(game.player.x).toBeCloseTo(240 - game.PLAYER_WIDTH / 2); // 480/2 - width/2
    expect(game.player.y).toBe(640 - game.PLAYER_HEIGHT - 10);
    expect(game.bullets.length).toBe(0);
    jest.useRealTimers();
  });

  test('enemies are recreated after respawn', () => {
    jest.useFakeTimers();
    game.createEnemies();
    // Remove all but one enemy
    game.enemies.splice(1);
    // Place the remaining enemy at the player's position to trigger respawn
    const enemy = game.enemies[0];
    enemy.x = game.player.x;
    enemy.y = game.player.y;
    enemy.alive = true;
    game.checkCollisions();
    // Fast-forward time to after respawn
    jest.advanceTimersByTime(1200);
    // Enemies should be fully recreated
    expect(game.enemies.length).toBe(game.ENEMY_ROWS * game.ENEMY_COLS);
    jest.useRealTimers();
  });
});

describe('Bunker creation and destruction', () => {
  let game;
  beforeEach(() => {
    game = initGame();
    game.createBunkers();
  });

  it('creates the correct number of bunkers with correct dimensions', () => {
    expect(game.bunkers.length).toBe(4); // BUNKER_COUNT
    game.bunkers.forEach(bunker => {
      expect(bunker.cells.length).toBe(4); // BUNKER_ROWS
      bunker.cells.forEach(row => {
        expect(row.length).toBe(12); // BUNKER_COLS
        row.forEach(cell => expect(cell).toBe(true));
      });
    });
  });

  it('enemy bullet destroys bunker cell from the top', () => {
    const bunker = game.bunkers[0];
    // Place an enemy bullet at the top of the first column of the first bunker
    game.enemyBullets.push({
      x: bunker.x + 1,
      y: bunker.y + 1
    });
    game.checkCollisions();
    // Top cell in first column should be destroyed
    expect(bunker.cells[0][0]).toBe(false);
    // All other cells should remain
    for (let row = 1; row < 4; row++) {
      expect(bunker.cells[row][0]).toBe(true);
    }
  });

  it('player bullet destroys bunker cell from the bottom', () => {
    const bunker = game.bunkers[0];
    // Place a player bullet at the bottom of the first column of the first bunker
    game.bullets.push({
      x: bunker.x + 1,
      y: bunker.y + 19 // near bottom
    });
    game.checkCollisions();
    // Bottom cell in first column should be destroyed
    expect(bunker.cells[3][0]).toBe(false);
    // All other cells should remain
    for (let row = 0; row < 3; row++) {
      expect(bunker.cells[row][0]).toBe(true);
    }
  });

  it('bunkers are reset on createBunkers()', () => {
    const bunker = game.bunkers[0];
    // Destroy a cell
    bunker.cells[0][0] = false;
    game.createBunkers();
    // All cells should be restored
    game.bunkers.forEach(b => {
      b.cells.forEach(row => row.forEach(cell => expect(cell).toBe(true)));
    });
  });
});

describe('Enemy reaching bottom of screen', () => {
  let game;
  beforeEach(() => {
    game = initGame();
    game.createEnemies();
    game.lives = 2;
  });

  it('loses a life and respawns when an enemy reaches the bottom', () => {
    // Place a live enemy at the bottom of the screen
    const enemy = game.enemies[0];
    enemy.alive = true;
    enemy.y = 640 - enemy.height; // default canvas height is 640
    // Player is not at the same y, so only the bottom check triggers
    game.checkCollisions();
    expect(game.lives).toBe(1);
    expect(enemy.alive).toBe(false);
    expect(game.respawning).toBe(true);
  });

  it('triggers game over if last life is lost by enemy reaching bottom', () => {
    game.lives = 1;
    const enemy = game.enemies[0];
    enemy.alive = true;
    enemy.y = 640 - enemy.height;
    game.checkCollisions();
    expect(game.lives).toBe(0);
    expect(game.gameOver).toBe(true);
    expect(enemy.alive).toBe(false);
  });
});
