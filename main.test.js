// Space Invaders Game Tests
// These tests use Jest and jsdom to simulate the browser environment.
// To run: npm install jest @jest-environment/jsdom --save-dev
// Add "test": "jest" to your package.json scripts.

/**
 * @jest-environment jsdom
 */

const { initGame } = require('./main');

describe('Space Invaders Game', () => {
  let canvas, ctx, game;

  beforeEach(() => {
    document.body.innerHTML = '<canvas id="gameCanvas" width="480" height="640"></canvas>';
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
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

  test('game over when enemy reaches player', () => {
    game.createEnemies();
    const enemy = game.enemies[0];
    enemy.x = game.player.x;
    enemy.y = game.player.y;
    enemy.alive = true;
    game.checkCollisions();
    expect(game.gameOver).toBe(true);
  });
});
