// ==============================================================================
// 🎮 QUEBRA-BLOCOS ARCADE PRO - CÓDIGO CORRIGIDO E DEFINITIVO
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
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const initialSpeedSelect = document.getElementById('initial-speed-select');
const soundMoveCheckbox = document.getElementById('sound-move');
const soundEatCheckbox = document.getElementById('sound-eat');
const soundHitCheckbox = document.getElementById('sound-hit');

const countdownOverlay = document.getElementById('countdown-overlay');
const countdownText = document.getElementById('countdown-text');
const startOverlay = document.getElementById('start-overlay');
const startGameBtn = document.getElementById('start-game-btn');

const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

let audioCtx = null;

const gameSettings = {
  initialSpeed: 4.0,
  soundMove: true,
  soundEat: true,
  soundHit: true
};

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
    if (type === 'hit' && !gameSettings.soundHit) return;
    if (type === 'eat' && !gameSettings.soundEat) return;
    if (type === 'move' && !gameSettings.soundMove) return;

    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'hit' || type === 'move') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'eat') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
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
      x: x, y: y,
      dx: (Math.random() - 0.5) * 6,
      dy: (Math.random() - 0.5) * 6,
      radius: Math.random() * 3 + 1,
      color: color, life: 20
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

    if (p.life <= 0) particles.splice(i, 1);
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
  width: 75, baseWidth: 75, largeWidth: 120, minWidth: 25, height: 12,
  x: (canvas.width - 75) / 2, y: canvas.height - 25, speed: 7, status: 'normal'
};

const keys = { right: false, left: false };

const ball = {
  x: canvas.width / 2, y: canvas.height - 40, radius: 7,
  baseSpeed: 4.0, speed: 4.0, dx: 3.0, dy: -3.0
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
let hazardMines = [];
let enemyProjectiles = [];
let powerups = [];

function initBricks() {
  bricks = [];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
  for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
      bricks[c][r] = { x: 0, y: 0, status: 1, color: colors[r % colors.length] };
    }
  }
}

function spawnPowerup(x, y) {
  const dropChance = Math.max(0.15, 0.32 - level * 0.02);
  if (Math.random() < dropChance) {
    const rand = Math.random();
    let type = 'green';
    const redChance = Math.min(0.40, 0.20 + level * 0.03);

    if (rand < redChance) type = 'red';
    else if (rand < 0.75) type = 'yellow';
    else if (rand < 0.90) type = 'blue';
    else type = 'green';

    powerups.push({ x: x, y: y, radius: 6, dy: 2.2, type: type });
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
    playSound('eat');
  } else if (type === 'red') {
    paddle.width = Math.max(paddle.minWidth, paddle.width - 15);
    if (paddle.width < paddle.baseWidth) paddle.status = 'shrunk';
    playSound('hit');
  } else if (type === 'blue') {
    ball.speed = Math.max(3.0, ball.speed - 1.2);
    updateBallVelocity();
    playSound('eat');
  } else if (type === 'yellow') {
    ball.speed = Math.min(14.0, ball.speed + 1.8);
    updateBallVelocity();
    playSound('hit');
  }

  if (paddle.x + paddle.width > canvas.width) {
    paddle.x = canvas.width - paddle.width;
  }
}

// Configurações e Menu Interativo
settingsBtn.addEventListener('click', () => {
  if (gameStarted && !isPaused && !isCountingDown) togglePause();
  settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
  gameSettings.initialSpeed = parseFloat(initialSpeedSelect.value);
  gameSettings.soundMove = soundMoveCheckbox.checked;
  gameSettings.soundEat = soundEatCheckbox.checked;
  gameSettings.soundHit = soundHitCheckbox.checked;

  ball.baseSpeed = gameSettings.initialSpeed;
  ball.speed = gameSettings.initialSpeed;
  
  settingsModal.classList.add('hidden');
  
  if (gameStarted) {
    resetBallAndPaddle();
  }
});

document.getElementById('close-leaderboard-btn')?.addEventListener('click', () => {
  document.getElementById('leaderboard-modal')?.classList.add('hidden');
});

window.addEventListener('keydown', (e) => {
  initAudio();
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.key === 'p' || e.key === 'P') togglePause();
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
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
  btnRight.addEventListener('mousedown', () => { initAudio(); keys.right = true; });
  btnRight.addEventListener('mouseup', () => { keys.right = false; });
}

pauseBtn.addEventListener('click', () => { initAudio(); togglePause(); });
restartBtn.addEventListener('click', () => { initAudio(); gameStarted ? resetGame() : startGame(); });

rankingBtn.addEventListener('click', () => {
  if (gameStarted && !isPaused && !isCountingDown) togglePause();
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

  ball.baseSpeed = gameSettings.initialSpeed + (level - 1) * 0.75;
  ball.speed = ball.baseSpeed;
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 40;
  
  // Ângulo aleatório que impede a bola de ficar travada na horizontal (mínimo de 30° de inclinação vertical)
  const minAngle = Math.PI / 6; // 30 graus
  const maxAngle = Math.PI / 2.5;
  const randomAngle = (Math.random() * (maxAngle - minAngle)) + minAngle;
  const direction = Math.random() > 0.5 ? 1 : -1;

  ball.dx = ball.speed * Math.cos(randomAngle) * direction;
  ball.dy = -ball.speed * Math.sin(randomAngle);

  movingObstacles = [];
  hazardMines = [];
  enemyProjectiles = [];
  initHazards();
}

function initHazards() {
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
  
  initBricks();
  updateHUD();
  resetBallAndPaddle();
  
  startCountdown(() => { loop(); });
}

function resetGame() {
  score = 0;
  level = 1;
  lives = 3;
  powerups = [];
  particles = [];
  
  initBricks();
  updateHUD();
  resetBallAndPaddle();
  
  if (isPaused) {
    isPaused = false;
    pauseBtn.textContent = 'Pausar';
  }
  
  cancelAnimationFrame(animationId);
  startCountdown(() => { loop(); });
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
  ctx.fillStyle = paddle.status === 'expanded' ? '#22c55e' : (paddle.status === 'shrunk' ? '#ef4444' : '#38bdf8');
  ctx.fill();
  ctx.closePath();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.speed > 8.0 ? '#f97316' : '#f8fafc';
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
        b.x = brickX; b.y = brickY;
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
    ctx.closePath();
  });
}

function drawHazards() {
  hazardMines.forEach((m) => {
    if (m.active) {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626';
      ctx.fill();
      ctx.closePath();
    }
  });

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
    playSound('move');
  } else if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.dx = Math.abs(ball.dx);
    playSound('move');
  }

  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.dy = Math.abs(ball.dy);
    playSound('move');
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
    let angle = collidePoint * (Math.PI / 2.5); // Limita o ângulo máximo de rebatida

    ball.dx = ball.speed * Math.sin(angle);
    ball.dy = -Math.abs(ball.speed * Math.cos(angle)); // Garante que a bola sempre vá para cima

    // Trava anti-horizontal absoluta: se dy for muito baixo, força subida
    if (Math.abs(ball.dy) < 1.5) {
      ball.dy = -1.5;
    }

    ball.y = paddle.y - ball.radius;
    playSound('move');
  }

  if (ball.y + ball.radius > canvas.height) {
    lives--;
    updateHUD();
    playSound('hit');
    if (lives <= 0) {
      saveLeaderboardScore(score);
      gameStarted = false;
      if (startOverlay) startOverlay.classList.remove('hidden');
      renderStatic();
    } else {
      resetBallAndPaddle();
      if (!isPaused) {
        cancelAnimationFrame(animationId);
        startCountdown(() => { loop(); });
      }
    }
  }
}

function movePowerups() {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.y += p.dy;
    if (p.y + p.radius >= paddle.y && p.x >= paddle.x && p.x <= paddle.x + paddle.width) {
      createExplosion(p.x, p.y, '#ffffff');
      applyPowerupEffect(p.type);
      powerups.splice(i, 1);
      continue;
    }
    if (p.y - p.radius > canvas.height) powerups.splice(i, 1);
  }
}

function updateAndDrawMovingObstacles() {
  const maxHorizObstacles = Math.min(4, 1 + Math.floor(level * 0.7));
  const spawnChanceHoriz = 0.004 + level * 0.0025;

  if (Math.random() < spawnChanceHoriz && movingObstacles.length < maxHorizObstacles) {
    const startX = Math.random() > 0.5 ? 0 : canvas.width - 50;
    movingObstacles.push({
      x: startX, y: 90 + Math.random() * 90,
      width: Math.max(35, 50 - level * 2), height: 14,
      dx: (startX === 0 ? 1 : -1) * (2.0 + level * 0.35), shootTimer: 0
    });
  }

  ctx.fillStyle = '#ef4444';
  for (let i = movingObstacles.length - 1; i >= 0; i--) {
    let mo = movingObstacles[i];
    mo.x += mo.dx;
    mo.shootTimer++;

    if (level >= 2 && mo.shootTimer > 100 && Math.random() < 0.04) {
      enemyProjectiles.push({ x: mo.x + mo.width / 2, y: mo.y + mo.height, radius: 4, dy: 3.0 });
      mo.shootTimer = 0;
    }

    if (mo.x <= 0 || mo.x + mo.width >= canvas.width) mo.dx *= -1;
    ctx.fillRect(mo.x, mo.y, mo.width, mo.height);

    if (ball.x > mo.x && ball.x < mo.x + mo.width && ball.y > mo.y && ball.y < mo.y + mo.height) {
      ball.dy = -ball.dy;
      playSound('move');
    }
  }

  hazardMines.forEach((m) => {
    if (m.active) {
      const distX = ball.x - m.x;
      const distY = ball.y - m.y;
      const distance = Math.sqrt(distX * distX + distY * distY);
      
      if (distance < ball.radius + m.radius) {
        playSound('hazard');
        createExplosion(m.x, m.y, '#ef4444');

        const nx = distX / (distance || 1);
        const ny = distY / (distance || 1);
        const overlap = (ball.radius + m.radius) - distance;
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        const dotProduct = ball.dx * nx + ball.dy * ny;
        ball.dx = ball.dx - 2 * dotProduct * nx;
        ball.dy = ball.dy - 2 * dotProduct * ny;
      }
    }
  });
}

function collisionDetection() {
  let activeBricks = 0;
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
        activeBricks++;
        if (
          ball.x + ball.radius > b.x && ball.x - ball.radius < b.x + brickWidth &&
          ball.y + ball.radius > b.y && ball.y - ball.radius < b.y + brickHeight
        ) {
          ball.dy = -ball.dy;
          b.status = 0;
          score += 10 + (level - 1) * 5;
          createExplosion(b.x + brickWidth / 2, b.y + brickHeight / 2, b.color);
          updateHUD();
          playSound('eat');
          spawnPowerup(b.x + brickWidth / 2, b.y + brickHeight);
        }
      }
    }
  }

  if (activeBricks === 0) {
    level++;
    ball.baseSpeed += 0.8;
    updateHUD();
    initBricks();
    resetBallAndPaddle();
    cancelAnimationFrame(animationId);
    startCountdown(() => { loop(); });
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