// ==============================================================================
// 🎮 QUEBRA-BLOCOS ARCADE PRO - PROGRESSÃO DE DIFICULDADE DINÂMICA POR FASE
// ==============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const rankingBtn = document.getElementById('ranking-btn');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownText = document.getElementById('countdown-text');
const startOverlay = document.getElementById('start-overlay');
const startGameBtn = document.getElementById('start-game-btn');

const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(type) {
  try {
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'hit') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'powerup_green' || type === 'powerup_blue') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.18);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'powerup_red' || type === 'powerup_yellow') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.18);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'hazard') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'count') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'go') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    console.log("Aguardando interação do usuário para áudio.");
  }
}

window.addEventListener('click', initAudio, { once: true });
window.addEventListener('touchstart', initAudio, { once: true });
window.addEventListener('keydown', initAudio, { once: true });

let particles = [];

function createExplosion(x, y, color) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: x,
      y: y,
      dx: (Math.random() - 0.5) * 6,
      dy: (Math.random() - 0.5) * 6,
      radius: Math.random() * 3 + 1,
      color: color,
      life: 20
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.dx;
    p.y += p.dy;
    p.life--;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 20;
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1.0;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

let score = 0;
let highScore = localStorage.getItem('breakout_highscore') || 0;
let level = 1;
let lives = 3;
let isPaused = false;
let isCountingDown = false;
let gameStarted = false;
let animationId = null;

highScoreEl.textContent = highScore;

const paddle = {
  width: 75,
  baseWidth: 75,
  largeWidth: 120,
  minWidth: 25,
  height: 12,
  x: (canvas.width - 75) / 2,
  y: canvas.height - 25,
  speed: 7,
  status: 'normal'
};

const keys = { right: false, left: false };

const ball = {
  x: canvas.width / 2,
  y: canvas.height - 40,
  radius: 7,
  baseSpeed: 4.5,
  speed: 4.5,
  dx: 3.5,
  dy: -3.5
};

const brickRowCount = 5;
const brickColumnCount = 8;
const brickWidth = 64;
const brickHeight = 18;
const brickPadding = 6;
const brickOffsetTop = 40;
const brickOffsetLeft = 24;

let bricks = [];
let movingObstacles = [];
let verticalObstacles = [];
let hazardMines = [];
let enemyProjectiles = [];

function initBricks() {
  bricks = [];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
  for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
      bricks[c][r] = {
        x: 0,
        y: 0,
        status: 1,
        color: colors[r % colors.length]
      };
    }
  }
}

let powerups = [];

function spawnPowerup(x, y) {
  // A cada nível superior, a chance de power-up diminui um pouco, tornando o jogo mais punitivo
  const dropChance = Math.max(0.15, 0.32 - level * 0.02);
  
  if (Math.random() < dropChance) {
    const rand = Math.random();
    let type = 'green';

    // Nas fases mais altas, aumentamos a chance de vir power-up vermelho (encolher raquete) ou amarelo (acelerar bola)
    const redChance = Math.min(0.40, 0.20 + level * 0.03);

    if (rand < redChance) {
      type = 'red';
    } else if (rand < 0.75) {
      type = 'yellow';
    } else if (rand < 0.90) {
      type = 'blue';
    } else {
      type = 'green';
    }

    powerups.push({
      x: x,
      y: y,
      radius: 6,
      dy: 2.2,
      type: type
    });
  }
}

function updateBallVelocity() {
  const currentAngle = Math.atan2(ball.dy, ball.dx);
  ball.dx = ball.speed * Math.cos(currentAngle);
  ball.dy = ball.speed * Math.sin(currentAngle);
}

function applyPowerupEffect(type) {
  if (type === 'green') {
    paddle.width = paddle.largeWidth;
    paddle.status = 'expanded';
    playSound('powerup_green');
  } else if (type === 'red') {
    paddle.width = Math.max(paddle.minWidth, paddle.width - 15);
    if (paddle.width < paddle.baseWidth) paddle.status = 'shrunk';
    playSound('powerup_red');
  } else if (type === 'blue') {
    ball.speed = Math.max(3.0, ball.speed - 1.2);
    updateBallVelocity();
    playSound('powerup_blue');
  } else if (type === 'yellow') {
    ball.speed = Math.min(11.0, ball.speed + 1.8);
    updateBallVelocity();
    playSound('powerup_yellow');
  }

  if (paddle.x + paddle.width > canvas.width) {
    paddle.x = canvas.width - paddle.width;
  }
}

window.addEventListener('keydown', (e) => {
  initAudio();
  if (e.key === 'ArrowRight' || e.key === 'Right' || e.key === 'd' || e.key === 'D') keys.right = true;
  if (e.key === 'ArrowLeft' || e.key === 'Left' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.key === 'p' || e.key === 'P') togglePause();
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'Right' || e.key === 'd' || e.key === 'D') keys.right = false;
  if (e.key === 'ArrowLeft' || e.key === 'Left' || e.key === 'a' || e.key === 'A') keys.left = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const relativeX = e.clientX - rect.left;
  if (relativeX >= 0 && relativeX <= canvas.width) {
    paddle.x = relativeX - paddle.width / 2;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
  }
});

function handleTouch(e) {
  initAudio();
  if (e.touches.length > 0) {
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    paddle.x = touchX - paddle.width / 2;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
  }
}

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch(e); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); handleTouch(e); }, { passive: false });

if (btnLeft && btnRight) {
  btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); initAudio(); keys.left = true; }, { passive: false });
  btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.left = false; }, { passive: false });

  btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); initAudio(); keys.right = true; }, { passive: false });
  btnRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.right = false; }, { passive: false });

  btnLeft.addEventListener('mousedown', () => { initAudio(); keys.left = true; });
  btnLeft.addEventListener('mouseup', () => { keys.left = false; });
  btnLeft.addEventListener('mouseleave', () => { keys.left = false; });

  btnRight.addEventListener('mousedown', () => { initAudio(); keys.right = true; });
  btnRight.addEventListener('mouseup', () => { keys.right = false; });
  btnRight.addEventListener('mouseleave', () => { keys.right = false; });
}

pauseBtn.addEventListener('click', () => { initAudio(); togglePause(); });
restartBtn.addEventListener('click', () => { 
  initAudio(); 
  if (!gameStarted) {
    startGame();
  } else {
    resetGame();
  }
});

rankingBtn.addEventListener('click', () => {
  if (gameStarted && !isPaused && !isCountingDown) {
    togglePause();
  }
  showLeaderboard();
});

function togglePause() {
  if (isCountingDown || !gameStarted) return;

  if (isPaused) {
    startCountdown(() => {
      isPaused = false;
      pauseBtn.textContent = 'Pausar';
      loop();
    });
  } else {
    isPaused = true;
    pauseBtn.textContent = 'Continuar';
    cancelAnimationFrame(animationId);
  }
}

function startCountdown(onComplete) {
  isCountingDown = true;
  countdownOverlay.classList.remove('hidden');
  let count = 3;
  countdownText.textContent = count;
  playSound('count');

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      countdownText.textContent = count;
      playSound('count');
    } else if (count === 0) {
      countdownText.textContent = 'JÁ!';
      playSound('go');
    } else {
      clearInterval(timer);
      countdownOverlay.classList.add('hidden');
      isCountingDown = false;
      if (onComplete) onComplete();
    }
  }, 600);
}

function resetBallAndPaddle() {
  paddle.width = paddle.baseWidth;
  paddle.status = 'normal';
  paddle.x = (canvas.width - paddle.width) / 2;
  
  keys.left = false;
  keys.right = false;

  // Escala progressiva de velocidade da bola por nível (cada nível fica perceptivelmente mais rápido)
  ball.speed = ball.baseSpeed + (level - 1) * 0.75;
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 40;
  
  const randomAngle = (Math.random() * (Math.PI / 2.5)) - (Math.PI / 5);
  const direction = Math.random() > 0.5 ? 1 : -1;

  ball.dx = ball.speed * Math.sin(randomAngle) * direction;
  ball.dy = -Math.abs(ball.speed * Math.cos(randomAngle));

  movingObstacles = [];
  verticalObstacles = [];
  hazardMines = [];
  enemyProjectiles = [];
  initHazards();
}

function initHazards() {
  // A quantidade de minas estáticas aumenta progressivamente com o nível (máximo de 7 minas)
  const mineCount = Math.min(7, 1 + Math.floor(level * 1.2));
  for (let i = 0; i < mineCount; i++) {
    hazardMines.push({
      x: 50 + Math.random() * (canvas.width - 100),
      y: 130 + Math.random() * 140,
      radius: 8,
      active: true
    });
  }
}

function startGame() {
  initAudio();
  gameStarted = true;
  if (startOverlay) startOverlay.classList.add('hidden');
  
  score = 0;
  level = 1;
  lives = 3;
  powerups = [];
  particles = [];
  movingObstacles = [];
  verticalObstacles = [];
  hazardMines = [];
  enemyProjectiles = [];
  
  initBricks();
  updateHUD();
  resetBallAndPaddle();
  
  startCountdown(() => {
    loop();
  });
}

function resetGame() {
  score = 0;
  level = 1;
  lives = 3;
  powerups = [];
  particles = [];
  movingObstacles = [];
  verticalObstacles = [];
  hazardMines = [];
  enemyProjectiles = [];
  
  initBricks();
  updateHUD();
  resetBallAndPaddle();
  
  if (isPaused) {
    isPaused = false;
    pauseBtn.textContent = 'Pausar';
  }
  
  cancelAnimationFrame(animationId);
  startCountdown(() => {
    loop();
  });
}

function updateHUD() {
  scoreEl.textContent = score;
  levelEl.textContent = level;
  livesEl.textContent = '❤️'.repeat(Math.max(0, lives));
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('breakout_highscore', highScore);
    highScoreEl.textContent = highScore;
  }
}

function drawPaddle() {
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 5);
  
  if (paddle.status === 'expanded') {
    ctx.fillStyle = '#22c55e';
  } else if (paddle.status === 'shrunk') {
    ctx.fillStyle = '#ef4444';
  } else {
    ctx.fillStyle = '#38bdf8';
  }
  
  ctx.fill();
  ctx.closePath();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  
  if (ball.speed > 7.0) {
    ctx.fillStyle = '#f97316';
  } else if (ball.speed < 4.5) {
    ctx.fillStyle = '#38bdf8';
  } else {
    ctx.fillStyle = '#f8fafc';
  }

  ctx.fill();
  ctx.closePath();
}

function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        b.x = brickX;
        b.y = brickY;
        ctx.beginPath();
        ctx.roundRect(brickX, brickY, brickWidth, brickHeight, 4);
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

function drawPowerups() {
  powerups.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

    let color = '#22c55e';
    if (p.type === 'red') color = '#ef4444';
    if (p.type === 'blue') color = '#3b82f6';
    if (p.type === 'yellow') color = '#eab308';

    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.closePath();
    ctx.shadowBlur = 0;
  });
}

function drawHazards() {
  // Minas Estáticas
  hazardMines.forEach((m) => {
    if (m.active) {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ef4444';
      ctx.fill();
      ctx.closePath();
      ctx.shadowBlur = 0;
    }
  });

  // Projéteis Inimigos
  ctx.fillStyle = '#fbbf24';
  enemyProjectiles.forEach((proj) => {
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  });
}

function movePaddle() {
  if (keys.right) paddle.x += paddle.speed;
  if (keys.left) paddle.x -= paddle.speed;

  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
}

function moveBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x + ball.radius >= canvas.width) {
    ball.x = canvas.width - ball.radius;
    ball.dx = -Math.abs(ball.dx);
    playSound('hit');
  } 
  else if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.dx = Math.abs(ball.dx);
    playSound('hit');
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.dy = Math.abs(ball.dy);
    playSound('hit');
  }

  if (
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width &&
    ball.dy > 0
  ) {
    let collidePoint = ball.x - (paddle.x + paddle.width / 2);
    collidePoint = collidePoint / (paddle.width / 2);
    let angle = collidePoint * (Math.PI / 3);

    ball.dx = ball.speed * Math.sin(angle);
    ball.dy = -ball.speed * Math.cos(angle);
    ball.y = paddle.y - ball.radius;
    playSound('hit');
  }

  if (ball.y + ball.radius > canvas.height) {
    lives--;
    updateHUD();
    if (lives <= 0) {
      playSound('hit');
      saveLeaderboardScore(score);
      gameStarted = false;
      if (startOverlay) startOverlay.classList.remove('hidden');
      renderStatic();
    } else {
      resetBallAndPaddle();
      if (!isPaused) {
        cancelAnimationFrame(animationId);
        startCountdown(() => {
          loop();
        });
      }
    }
  }
}

function movePowerups() {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.y += p.dy;

    if (
      p.y + p.radius >= paddle.y &&
      p.x >= paddle.x &&
      p.x <= paddle.x + paddle.width
    ) {
      createExplosion(p.x, p.y, '#ffffff');
      applyPowerupEffect(p.type);
      powerups.splice(i, 1);
      continue;
    }

    if (p.y - p.radius > canvas.height) {
      powerups.splice(i, 1);
    }
  }
}

// ==============================================================================
// 🚀 OBSTÁCULOS COM PROGRESSÃO ESCALONADA POR FASE
// ==============================================================================
function updateAndDrawMovingObstacles() {
  // A quantidade máxima e a velocidade dos obstáculos aumentam conforme o nível sobe
  const maxHorizObstacles = Math.min(4, 1 + Math.floor(level * 0.7));
  const spawnChanceHoriz = 0.004 + level * 0.0025;

  if (Math.random() < spawnChanceHoriz && movingObstacles.length < maxHorizObstacles) {
    const startX = Math.random() > 0.5 ? 0 : canvas.width - 50;
    // Velocidade aumenta progressivamente por nível
    const horizSpeed = (2.0 + level * 0.35);
    movingObstacles.push({
      x: startX,
      y: 90 + Math.random() * 90,
      width: Math.max(35, 50 - level * 2), // Obstáculos ficam ligeiramente menores e mais difíceis nas fases altas
      height: 14,
      dx: (startX === 0 ? 1 : -1) * horizSpeed,
      shootTimer: 0
    });
  }

  // Obstáculos verticais escalonados (aparecem já na fase 2+, aumentando quantidade e velocidade)
  const maxVertObstacles = Math.min(3, Math.floor(level * 0.6));
  if (level >= 2 && Math.random() < (0.005 + level * 0.0015) && verticalObstacles.length < maxVertObstacles) {
    const isLeft = Math.random() > 0.5;
    const vertSpeed = (1.6 + level * 0.25);
    verticalObstacles.push({
      x: isLeft ? 15 : canvas.width - 30,
      y: 120,
      width: 15,
      height: Math.max(35, 50 - level * 2),
      dy: (Math.random() > 0.5 ? 1 : -1) * vertSpeed
    });
  }

  // Desenhar e atualizar Horizontais
  ctx.fillStyle = '#ef4444';
  for (let i = movingObstacles.length - 1; i >= 0; i--) {
    let mo = movingObstacles[i];
    mo.x += mo.dx;
    mo.shootTimer++;

    // Frequência de disparo de tiros aumenta nas fases superiores (fase 2+)
    const shootThreshold = Math.max(60, 140 - level * 10);
    if (level >= 2 && mo.shootTimer > shootThreshold && Math.random() < 0.04) {
      enemyProjectiles.push({
        x: mo.x + mo.width / 2,
        y: mo.y + mo.height,
        radius: 4,
        dy: 2.8 + level * 0.3
      });
      mo.shootTimer = 0;
    }

    if (mo.x <= 0 || mo.x + mo.width >= canvas.width) {
      mo.dx *= -1;
    }

    ctx.fillRect(mo.x, mo.y, mo.width, mo.height);

    // Colisão bola com obstáculo horizontal
    if (
      ball.x > mo.x &&
      ball.x < mo.x + mo.width &&
      ball.y > mo.y &&
      ball.y < mo.y + mo.height
    ) {
      ball.dy = -ball.dy;
      playSound('hit');
    }

    // Colisão raquete com obstáculo horizontal
    if (
      paddle.x < mo.x + mo.width &&
      paddle.x + paddle.width > mo.x &&
      paddle.y < mo.y + mo.height &&
      paddle.y + paddle.height > mo.y
    ) {
      movingObstacles.splice(i, 1);
      lives--;
      updateHUD();
      playSound('hazard');
      handleLifeLossOrReset();
      return;
    }
  }

  // Desenhar e atualizar Verticais
  ctx.fillStyle = '#f97316';
  for (let j = verticalObstacles.length - 1; j >= 0; j--) {
    let vo = verticalObstacles[j];
    vo.y += vo.dy;

    if (vo.y <= 70 || vo.y + vo.height >= canvas.height - 120) {
      vo.dy *= -1;
    }

    ctx.fillRect(vo.x, vo.y, vo.width, vo.height);

    // Colisão bola com obstáculo vertical
    if (
      ball.x > vo.x &&
      ball.x < vo.x + vo.width &&
      ball.y > vo.y &&
      ball.y < vo.y + vo.height
    ) {
      ball.dx = -ball.dx;
      playSound('hit');
    }

    // Colisão raquete com obstáculo vertical
    if (
      paddle.x < vo.x + vo.width &&
      paddle.x + paddle.width > vo.x &&
      paddle.y < vo.y + vo.height &&
      paddle.y + paddle.height > vo.y
    ) {
      verticalObstacles.splice(j, 1);
      lives--;
      updateHUD();
      playSound('hazard');
      handleLifeLossOrReset();
      return;
    }
  }

  // Atualizar Projéteis Inimigos
  for (let p = enemyProjectiles.length - 1; p >= 0; p--) {
    let proj = enemyProjectiles[p];
    proj.y += proj.dy;

    // Colisão do projétil com a raquete
    if (
      proj.x >= paddle.x &&
      proj.x <= paddle.x + paddle.width &&
      proj.y >= paddle.y &&
      proj.y <= paddle.y + paddle.height
    ) {
      enemyProjectiles.splice(p, 1);
      lives--;
      updateHUD();
      playSound('hazard');
      handleLifeLossOrReset();
      return;
    }

    // Remover se sair da tela
    if (proj.y > canvas.height) {
      enemyProjectiles.splice(p, 1);
    }
  }

  // Colisão com minas estáticas
  hazardMines.forEach((m) => {
    if (m.active) {
      const distX = ball.x - m.x;
      const distY = ball.y - m.y;
      const distance = Math.sqrt(distX * distX + distY * distY);
      if (distance < ball.radius + m.radius) {
        ball.dx = -ball.dx;
        ball.dy = -ball.dy;
        playSound('hazard');
        createExplosion(m.x, m.y, '#ef4444');
      }
    }
  });
}

function handleLifeLossOrReset() {
  if (lives <= 0) {
    saveLeaderboardScore(score);
    gameStarted = false;
    if (startOverlay) startOverlay.classList.remove('hidden');
    renderStatic();
  } else {
    resetBallAndPaddle();
    cancelAnimationFrame(animationId);
    startCountdown(() => {
      loop();
    });
  }
}

function collisionDetection() {
  let activeBricks = 0;
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
        activeBricks++;
        if (
          ball.x + ball.radius > b.x &&
          ball.x - ball.radius < b.x + brickWidth &&
          ball.y + ball.radius > b.y &&
          ball.y - ball.radius < b.y + brickHeight
        ) {
          ball.dy = -ball.dy;
          b.status = 0;
          score += 10 + (level - 1) * 5; // Bônus de pontuação maior por bloco nas fases avançadas
          createExplosion(b.x + brickWidth / 2, b.y + brickHeight / 2, b.color);
          updateHUD();
          playSound('hit');
          spawnPowerup(b.x + brickWidth / 2, b.y + brickHeight);
        }
      }
    }
  }

  if (activeBricks === 0) {
    level++;
    ball.baseSpeed += 0.8; // Aumenta a velocidade base a cada nova fase
    updateHUD();
    initBricks();
    resetBallAndPaddle();
    cancelAnimationFrame(animationId);
    startCountdown(() => {
      loop();
    });
  }
}

const MAX_LEADERBOARD_ENTRIES = 5;

function saveLeaderboardScore(newScore) {
  if (newScore <= 0) return;

  const playerName = prompt(`🎉 Fim de jogo! Você fez ${newScore} pontos.\nDigite seu nome para o Ranking Global:`) || "Jogador Anônimo";

  keys.left = false;
  keys.right = false;

  const scoreData = {
    name: playerName.trim().substring(0, 12),
    score: newScore,
    timestamp: Date.now()
  };

  database.ref('leaderboard').push(scoreData)
    .then(() => showLeaderboard())
    .catch((err) => console.error("Erro ao salvar no Firebase:", err));
}

function showLeaderboard() {
  const listEl = document.getElementById('leaderboard-list');
  const modal = document.getElementById('leaderboard-modal');

  if (!listEl || !modal) return;

  listEl.innerHTML = '<li>Carregando ranking global...</li>';
  modal.classList.remove('hidden');

  database.ref('leaderboard')
    .orderByChild('score')
    .limitToLast(MAX_LEADERBOARD_ENTRIES)
    .once('value', (snapshot) => {
      listEl.innerHTML = '';
      const scores = [];

      snapshot.forEach((childSnapshot) => {
        scores.push(childSnapshot.val());
      });

      scores.reverse();

      if (scores.length === 0) {
        listEl.innerHTML = '<li>Nenhuma pontuação salva ainda.</li>';
      } else {
        scores.forEach((entry) => {
          const li = document.createElement('li');
          li.innerHTML = `<strong>${entry.name}</strong>: ${entry.score} pts`;
          listEl.appendChild(li);
        });
      }
    })
    .catch((err) => {
      listEl.innerHTML = '<li>Erro ao carregar o ranking. Verifique as Regras do Firebase.</li>';
      console.error(err);
    });
}

document.getElementById('close-leaderboard-btn')?.addEventListener('click', () => {
  document.getElementById('leaderboard-modal')?.classList.add('hidden');
});

function renderStatic() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawPaddle();
  drawBall();
  drawHazards();
}

function loop() {
  if (isPaused || isCountingDown || !gameStarted) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBricks();
  drawPaddle();
  drawBall();
  drawPowerups();
  drawHazards();
  updateParticles();

  movePaddle();
  moveBall();
  movePowerups();
  updateAndDrawMovingObstacles();
  collisionDetection();

  animationId = requestAnimationFrame(loop);
}

initBricks();
updateHUD();
renderStatic();

startGameBtn.addEventListener('click', startGame);