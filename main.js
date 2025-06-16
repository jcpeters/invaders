// Space Invaders Game
// Only access DOM if running in browser
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
let canvas, ctx;
// Only start the game loop if running in a real browser environment
// (i.e. not under Jest/node where `module` is defined)
if (isBrowser && typeof module === 'undefined') {
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
const ENEMY_BULLET_WIDTH = 4;
const ENEMY_BULLET_HEIGHT = 10;
const ENEMY_BULLET_SPEED = 1;
const MAX_LIVES = 3;

// Bunker configuration (moved to top-level for browser access)
const BUNKER_WIDTH = 60;
const BUNKER_HEIGHT = 20;
const BUNKER_ROWS = 4; // vertical resolution of bunker
const BUNKER_COLS = 12; // horizontal resolution of bunker
const BUNKER_COUNT = 4;
const BUNKER_Y = (typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 640) - PLAYER_HEIGHT - 60;

// --- Refactor for testability ---
function initGame(canvasEl) {
  // Use provided canvas or default to DOM
  const canvas = canvasEl || (typeof document !== 'undefined' ? document.getElementById('gameCanvas') : undefined);
  let ctx;
  if (canvas && typeof module === 'undefined') {
    ctx = canvas.getContext('2d');
  }

  // Game state
  let leftPressed = false;
  let rightPressed = false;
  let spacePressed = false;
  let gameOver = false;
  let lives = MAX_LIVES;
  let score = 0;
  const player = {
    x: canvas ? canvas.width / 2 - PLAYER_WIDTH / 2 : 0,
    y: canvas ? canvas.height - PLAYER_HEIGHT - 10 : 0,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    color: '#0f0',
  };
  let bullets = [];
  let enemyBullets = [];
  let enemies = [];
  let enemyDirection = 1;
  let respawnTimeout = null;
  let respawning = false;

  // Each bunker is a 2D array of booleans (true = present)
  let bunkers = [];

  function createBunkers() {
    bunkers = [];
    const spacing = ((canvas ? canvas.width : 480) - BUNKER_COUNT * BUNKER_WIDTH) / (BUNKER_COUNT + 1);
    for (let i = 0; i < BUNKER_COUNT; i++) {
      const x = spacing + i * (BUNKER_WIDTH + spacing);
      // 2D array for each bunker
      const bunker = [];
      for (let row = 0; row < BUNKER_ROWS; row++) {
        bunker[row] = Array(BUNKER_COLS).fill(true);
      }
      bunkers.push({ x, y: BUNKER_Y, cells: bunker });
    }
  }

  // drawBunkers is defined later in the browser section; this duplicate is removed to avoid redundancy.

  function checkBunkerCollisions() {
    // Enemy bullets destroy from top
    enemyBullets.forEach((b, bIdx) => {
      bunkers.forEach(bunker => {
        const relX = b.x - bunker.x;
        const relY = b.y - bunker.y;
        if (
          relX >= 0 && relX < BUNKER_WIDTH &&
          relY >= 0 && relY < BUNKER_HEIGHT
        ) {
          const col = Math.floor((relX / BUNKER_WIDTH) * BUNKER_COLS);
          // Find first non-destroyed cell from top in this column
          for (let row = 0; row < BUNKER_ROWS; row++) {
            if (bunker.cells[row][col]) {
              bunker.cells[row][col] = false;
              enemyBullets.splice(bIdx, 1);
              break;
            }
          }
        }
      });
    });
    // Player bullets destroy from bottom
    bullets.forEach((b, bIdx) => {
      bunkers.forEach(bunker => {
        const relX = b.x - bunker.x;
        const relY = b.y - bunker.y;
        if (
          relX >= 0 && relX < BUNKER_WIDTH &&
          relY >= 0 && relY < BUNKER_HEIGHT
        ) {
          const col = Math.floor((relX / BUNKER_WIDTH) * BUNKER_COLS);
          // Find first non-destroyed cell from bottom in this column
          for (let row = BUNKER_ROWS - 1; row >= 0; row--) {
            if (bunker.cells[row][col]) {
              bunker.cells[row][col] = false;
              bullets.splice(bIdx, 1);
    break;
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

  function moveEnemyBullets() {
    enemyBullets.forEach(b => {
      b.y += ENEMY_BULLET_SPEED;
    });
    enemyBullets = enemyBullets.filter(b => b.y < (canvas ? canvas.height : 640));
  }

  function moveEnemies() {
    let shouldReverse = false;
    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      enemy.x += ENEMY_SPEED * enemyDirection;
      if (enemy.x <= 0 || enemy.x + enemy.width >= (canvas ? canvas.width : 480)) shouldReverse = true;
      if (Math.random() < 0.01) {
        enemyBullets.push({
          x: enemy.x + enemy.width / 2 - ENEMY_BULLET_WIDTH / 2,
          y: enemy.y + enemy.height,
        });
      }
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
    let lifeLost = false;
    // Bullet vs enemy
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
          score += 10;
        }
      });
    });
    // Player bullet vs enemy bullet
    bullets.forEach((bullet, bIdx) => {
      enemyBullets.forEach((eb, ebIdx) => {
        if (
          bullet.x < eb.x + ENEMY_BULLET_WIDTH &&
          bullet.x + BULLET_WIDTH > eb.x &&
          bullet.y < eb.y + ENEMY_BULLET_HEIGHT &&
          bullet.y + BULLET_HEIGHT > eb.y
        ) {
          bullets.splice(bIdx, 1);
          enemyBullets.splice(ebIdx, 1);
        }
      });
    });
    // Enemy bullet vs player (only lose one life per frame)
    enemyBullets.forEach((bullet, bIdx) => {
      if (
        !lifeLost &&
        bullet.x < player.x + player.width &&
        bullet.x + ENEMY_BULLET_WIDTH > player.x &&
        bullet.y < player.y + player.height &&
        bullet.y + ENEMY_BULLET_HEIGHT > player.y
      ) {
        enemyBullets.splice(bIdx, 1);
        lives -= 1;
        lifeLost = true;
        if (lives <= 0) {
          gameOver = true;
        } else {
          triggerRespawn();
        }
      }
    });
    // Enemy vs player (only lose one life per frame)
    enemies.forEach(enemy => {
      if (
        enemy.alive &&
        enemy.y + enemy.height >= player.y &&
        enemy.x < player.x + player.width &&
        enemy.x + enemy.width > player.x
      ) {
        if (!lifeLost) {
          lives -= 1;
          lifeLost = true;
          if (lives <= 0) {
            gameOver = true;
          } else {
            triggerRespawn();
          }
        }
        enemy.alive = false;
      }
      // Lose life and respawn if any enemy reaches the bottom of the screen
      if (
        enemy.alive &&
        enemy.y + enemy.height >= (canvas ? canvas.height : 640)
      ) {
        if (!lifeLost) {
          lives -= 1;
          lifeLost = true;
          if (lives <= 0) {
            gameOver = true;
          } else {
            triggerRespawn();
          }
        }
        enemy.alive = false;
      }
    });
    checkBunkerCollisions();
  }

  function triggerRespawn() {
    respawning = true;
    if (respawnTimeout) clearTimeout(respawnTimeout);
    respawnTimeout = setTimeout(() => {
      player.x = (canvas ? canvas.width : 480) / 2 - PLAYER_WIDTH / 2;
      player.y = (canvas ? canvas.height : 640) - PLAYER_HEIGHT - 10;
      bullets = [];
      enemyBullets = [];
      createEnemies(); // Recreate all enemies after respawn
      respawning = false;
    }, 1200); // 1.2 seconds pause
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
    get enemyBullets() { return enemyBullets; },
    get enemies() { return enemies; },
    get lives() { return lives; },
    set lives(v) { lives = v; },
    get score() { return score; },
    set score(v) { score = v; },
    get leftPressed() { return leftPressed; },
    set leftPressed(v) { leftPressed = v; },
    get rightPressed() { return rightPressed; },
    set rightPressed(v) { rightPressed = v; },
    get spacePressed() { return spacePressed; },
    set spacePressed(v) { spacePressed = v; },
    get gameOver() { return gameOver; },
    set gameOver(v) { gameOver = v; },
    get respawning() { return respawning; },
    createEnemies,
    createBunkers,
    get bunkers() { return bunkers; },
    movePlayer,
    moveBullets,
    moveEnemyBullets,
    moveEnemies,
    shootBullet,
    checkCollisions,
    reset() {
      leftPressed = false;
      rightPressed = false;
      spacePressed = false;
      gameOver = false;
      lives = MAX_LIVES;
      score = 0;
      player.x = (canvas ? canvas.width : 480) / 2 - PLAYER_WIDTH / 2;
      player.y = (canvas ? canvas.height : 640) - PLAYER_HEIGHT - 10;
      bullets = [];
      enemyBullets = [];
      enemies = [];
      enemyDirection = 1;
      createEnemies();
      createBunkers();
    }
  };
}

// Only run the game loop when executed directly in a browser
// Avoid starting the loop when the file is loaded under Jest/Node
if (isBrowser && typeof module === 'undefined') {
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
  function drawEnemyBullets() {
    ctx.fillStyle = '#f80';
    game.enemyBullets.forEach(b => {
      ctx.fillRect(b.x, b.y, ENEMY_BULLET_WIDTH, ENEMY_BULLET_HEIGHT);
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
  function drawBunkers() {
    ctx.save();
    ctx.fillStyle = '#0ff';
    game.bunkers.forEach(bunker => {
      for (let row = 0; row < BUNKER_ROWS; row++) {
        for (let col = 0; col < BUNKER_COLS; col++) {
          if (bunker.cells[row][col]) {
            const bx = bunker.x + (col * BUNKER_WIDTH) / BUNKER_COLS;
            const by = bunker.y + (row * BUNKER_HEIGHT) / BUNKER_ROWS;
            ctx.fillRect(bx, by, BUNKER_WIDTH / BUNKER_COLS, BUNKER_HEIGHT / BUNKER_ROWS);
          }
        }
      }
    });
    ctx.restore();
  }
  function drawGameOver() {
    ctx.fillStyle = '#fff';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    ctx.font = '24px sans-serif';
    ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 50);
  }
  function drawStaticLegend() {
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Controls:', 10, canvas.height - 60);
    ctx.fillText('← → : Move', 10, canvas.height - 40);
    ctx.fillText('Space: Shoot', 10, canvas.height - 24);
    ctx.fillText('R: Restart', 10, canvas.height - 8);
  }
  function drawDynamicLegend() {
    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${game.score}`, canvas.width - 10, canvas.height - 24);
    ctx.fillText(`Lives: ${game.lives}`, canvas.width - 10, canvas.height - 8);
  }
  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (game.gameOver) {
      drawGameOver();
      drawStaticLegend();
      drawDynamicLegend();
      return;
    }
    if (game.respawning) {
      ctx.globalAlpha = 0.5;
      drawPlayer();
      ctx.globalAlpha = 1.0;
      drawBunkers();
      drawDynamicLegend();
      ctx.fillStyle = '#fff';
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Get Ready!', canvas.width / 2, canvas.height / 2);
      setTimeout(() => requestAnimationFrame(gameLoop), 40);
      return;
    }
    drawPlayer();
    drawBullets();
    drawEnemyBullets();
    drawEnemies();
    drawBunkers();
    drawDynamicLegend();
    game.movePlayer();
    game.moveBullets();
    game.moveEnemyBullets();
    game.moveEnemies();
    game.checkCollisions();
    setTimeout(() => requestAnimationFrame(gameLoop), 40); // ~25 FPS
  }

  // Draw static legend once at start
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStaticLegend();

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
  game.createBunkers();
  gameLoop();
}

// Export for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initGame };
}
