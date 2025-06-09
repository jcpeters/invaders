// Space Invaders Game
// Only access DOM if running in browser
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
let canvas, ctx;
if (isBrowser) {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas ? canvas.getContext('2d') : undefined;
}

const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 20;
const PLAYER_SPEED = 10;
const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 10;
const BULLET_SPEED = 15;
const ENEMY_ROWS = 4;
const ENEMY_COLS = 8;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 20;
const ENEMY_HORZ_PADDING = 20;
const ENEMY_VERT_PADDING = 20;
const ENEMY_X_OFFSET = 30;
const ENEMY_Y_OFFSET = 40;
const ENEMY_SPEED = 1;
const ENEMY_VERTICAL_SPEED = .25; // 1 = normal, 2 = double, 0.5 = half

// --- Refactor for testability ---
function initGame(canvasEl) {
  // Use provided canvas or default to DOM
  const canvas = canvasEl || (typeof document !== 'undefined' ? document.getElementById('gameCanvas') : undefined);
  const ctx = canvas ? canvas.getContext('2d') : undefined;

  // Game state
  let leftPressed = false;
  let rightPressed = false;
  let spacePressed = false;
  let gameOver = false;
  const player = {
    x: canvas ? canvas.width / 2 - PLAYER_WIDTH / 2 : 0,
    y: canvas ? canvas.height - PLAYER_HEIGHT - 10 : 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    color: '#0f0',
  };
  let bullets = [];
  let enemies = [];
  let enemyDirection = 1;

  function createEnemies() {
    enemies = [];
    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        enemies.push({
          x: ENEMY_X_OFFSET + col * (ENEMY_WIDTH + ENEMY_HORZ_PADDING),
          y: ENEMY_Y_OFFSET + row * (ENEMY_HEIGHT + ENEMY_VERT_PADDING),
          width: ENEMY_WIDTH,
          height: ENEMY_HEIGHT,
          color: '#f00',
          alive: true,
        });
      }
    }
  }

  function movePlayer() {
    if (leftPressed && player.x > 0) player.x -= PLAYER_SPEED;
    if (rightPressed && player.x < (canvas ? canvas.width : 480) - player.width) player.x += PLAYER_SPEED;
  }

  function moveBullets() {
    bullets.forEach(bullet => {
      bullet.y -= BULLET_SPEED;
    });
    bullets = bullets.filter(bullet => bullet.y > 0);
  }

  function moveEnemies() {
    let shouldReverse = false;
    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      enemy.x += ENEMY_SPEED * enemyDirection;
      if (enemy.x <= 0 || enemy.x + enemy.width >= (canvas ? canvas.width : 480)) shouldReverse = true;
    });
    if (shouldReverse) {
      enemyDirection *= -1;
      enemies.forEach(enemy => {
        enemy.y += ENEMY_HEIGHT * ENEMY_VERTICAL_SPEED;
      });
    }
  }

  function shootBullet() {
    if (spacePressed && bullets.length < 3) {
      bullets.push({
        x: player.x + player.width / 2 - BULLET_WIDTH / 2,
        y: player.y,
      });
    }
  }

  function checkCollisions() {
    bullets.forEach((bullet, bIdx) => {
      enemies.forEach((enemy, eIdx) => {
        if (
          enemy.alive &&
          bullet.x < enemy.x + enemy.width &&
          bullet.x + BULLET_WIDTH > enemy.x &&
          bullet.y < enemy.y + enemy.height &&
          bullet.y + BULLET_HEIGHT > enemy.y
        ) {
          enemy.alive = false;
          bullets.splice(bIdx, 1);
        }
      });
    });
    enemies.forEach(enemy => {
      if (
        enemy.alive &&
        enemy.y + enemy.height >= player.y &&
        enemy.x < player.x + player.width &&
        enemy.x + enemy.width > player.x
      ) {
        gameOver = true;
      }
    });
  }

  // Expose state and functions for testing
  return {
    PLAYER_WIDTH,
    PLAYER_HEIGHT,
    PLAYER_SPEED,
    BULLET_WIDTH,
    BULLET_HEIGHT,
    BULLET_SPEED,
    ENEMY_ROWS,
    ENEMY_COLS,
    ENEMY_WIDTH,
    ENEMY_HEIGHT,
    ENEMY_HORZ_PADDING,
    ENEMY_VERT_PADDING,
    ENEMY_X_OFFSET,
    ENEMY_Y_OFFSET,
    ENEMY_SPEED,
    ENEMY_VERTICAL_SPEED,
    get player() { return player; },
    get bullets() { return bullets; },
    get enemies() { return enemies; },
    get leftPressed() { return leftPressed; },
    set leftPressed(v) { leftPressed = v; },
    get rightPressed() { return rightPressed; },
    set rightPressed(v) { rightPressed = v; },
    get spacePressed() { return spacePressed; },
    set spacePressed(v) { spacePressed = v; },
    get gameOver() { return gameOver; },
    set gameOver(v) { gameOver = v; },
    createEnemies,
    movePlayer,
    moveBullets,
    moveEnemies,
    shootBullet,
    checkCollisions,
    reset() {
      leftPressed = false;
      rightPressed = false;
      spacePressed = false;
      gameOver = false;
      player.x = (canvas ? canvas.width : 480) / 2 - PLAYER_WIDTH / 2;
      player.y = (canvas ? canvas.height : 640) - PLAYER_HEIGHT - 10;
      bullets = [];
      enemies = [];
      enemyDirection = 1;
      createEnemies();
    }
  };
}

// Only run the game loop in the browser
if (isBrowser) {
  const game = initGame();
  function drawPlayer() {
    ctx.fillStyle = game.player.color;
    ctx.fillRect(game.player.x, game.player.y, game.player.width, game.player.height);
  }
  function drawBullets() {
    ctx.fillStyle = '#fff';
    game.bullets.forEach(bullet => {
      ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
    });
  }
  function drawEnemies() {
    game.enemies.forEach(enemy => {
      if (enemy.alive) {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      }
    });
  }
  function drawGameOver() {
    ctx.fillStyle = '#fff';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    ctx.font = '24px sans-serif';
    ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 50);
  }
  function drawLegend() {
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Controls:', 10, canvas.height - 60);
    ctx.fillText('← → : Move', 10, canvas.height - 40);
    ctx.fillText('Space: Shoot', 10, canvas.height - 24);
    ctx.fillText('R: Restart', 10, canvas.height - 8);
  }
  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (game.gameOver) {
      drawGameOver();
      drawLegend();
      return;
    }
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawLegend();
    game.movePlayer();
    game.moveBullets();
    game.moveEnemies();
    game.checkCollisions();
    setTimeout(() => requestAnimationFrame(gameLoop), 40); // ~25 FPS
  }
  document.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft') game.leftPressed = true;
    if (e.code === 'ArrowRight') game.rightPressed = true;
    if (e.code === 'Space' && !game.spacePressed) {
      game.spacePressed = true;
      game.shootBullet();
    }
    if (e.code === 'KeyR' && game.gameOver) {
      game.reset();
      game.gameOver = false;
      gameLoop();
    }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft') game.leftPressed = false;
    if (e.code === 'ArrowRight') game.rightPressed = false;
    if (e.code === 'Space') {
      game.spacePressed = false;
    }
  });
  game.createEnemies();
  gameLoop();
}

// Export for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initGame };
}
