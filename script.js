// ==============================================================================
// 🎮 QUEBRA-BLOCOS ARCADE PRO - LÓGICA E FÍSICA COMPLETA (ATUALIZADO)
// ==============================================================================

// Captura a referência da tela Canvas do HTML
const canvas = document.getElementById('gameCanvas');
// Define o contexto de renderização 2D para desenhar retângulos, círculos e textos
const ctx = canvas.getContext('2d');

// Captura dos elementos HTML do painel (HUD) e controles
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const rankingBtn = document.getElementById('ranking-btn');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownText = document.getElementById('countdown-text');

// Captura dos botões direcionais móveis
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

// Variável para armazenar a instância da Web Audio API
let audioCtx = null;

// Inicializa ou retoma o contexto de áudio do navegador
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Sintetizador de efeitos sonoros
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

// Desbloqueia áudio no primeiro clique, toque ou tecla do usuário na página
window.addEventListener('click', initAudio, { once: true });
window.addEventListener('touchstart', initAudio, { once: true });
window.addEventListener('keydown', initAudio, { once: true });

// Array global que armazena os fragmentos da explosão visual
let particles = [];

// Gera explosões de partículas coloridas na posição (x, y)
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

// Desenha e reduz o tempo de vida das partículas na tela
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

// Variáveis Globais de Estado do Jogo
let score = 0;
let highScore = localStorage.getItem('breakout_highscore') || 0;
let level = 1;
let lives = 3;
let isPaused = false;
let isCountingDown = false;
let animationId = null;

// Exibe o recorde carregado na tela
highScoreEl.textContent = highScore;

// Objeto de propriedade da Raquete (Paddle)
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

// Monitora o estado de pressionamento das teclas direcionais
const keys = { right: false, left: false };

// Objeto de propriedade da Bola
const ball = {
  x: canvas.width / 2,
  y: canvas.height - 40,
  radius: 7,
  baseSpeed: 4.5,
  speed: 4.5,
  dx: 3.5,
  dy: -3.5
};

// Configurações da Grade de Blocos
const brickRowCount = 5;
const brickColumnCount = 8;
const brickPadding = 8;
const brickOffsetTop = 40;
const brickOffsetLeft = 28;
const brickWidth = 65;
const brickHeight = 18;

let bricks = [];

// Preenche e reinicia a matriz de blocos
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

// Array de Power-ups ativos caindo na tela
let powerups = [];

// Sorteia e cria um item de power-up quando um bloco é quebrado
function spawnPowerup(x, y) {
  const dropChance = Math.min(0.35, 0.25 + level * 0.02);
  
  if (Math.random() < dropChance) {
    const rand = Math.random();
    let type = 'green';

    if (rand < 0.25) {
      type = 'red';
    } else if (rand < 0.70) {
      type = 'yellow';
    } else if (rand < 0.85) {
      type = 'blue';
    } else {
      type = 'green';
    }

    powerups.push({
      x: x,
      y: y,
      radius: 6,
      dy: 2,
      type: type
    });
  }
}

// Atualiza os vetores de velocidade (dx, dy) mantendo o ângulo da bola
function updateBallVelocity() {
  const currentAngle = Math.atan2(ball.dy, ball.dx);
  ball.dx = ball.speed * Math.cos(currentAngle);
  ball.dy = ball.speed * Math.sin(currentAngle);
}

// Aplica as regras de efeito ao pegar cada cápsula/item
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
    ball.speed = Math.min(9.5, ball.speed + 1.5);
    updateBallVelocity();
    playSound('powerup_yellow');
  }

  if (paddle.x + paddle.width > canvas.width) {
    paddle.x = canvas.width - paddle.width;
  }
}

// Eventos de teclado (pressionar teclas)
window.addEventListener('keydown', (e) => {
  initAudio();
  if (e.key === 'ArrowRight' || e.key === 'Right' || e.key === 'd' || e.key === 'D') keys.right = true;
  if (e.key === 'ArrowLeft' || e.key === 'Left' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.key === 'p' || e.key === 'P') togglePause();
});

// Eventos de teclado (soltar teclas)
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'Right' || e.key === 'd' || e.key === 'D') keys.right = false;
  if (e.key === 'ArrowLeft' || e.key === 'Left' || e.key === 'a' || e.key === 'A') keys.left = false;
});

// Movimento da raquete pelo rastro do mouse
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const relativeX = e.clientX - rect.left;
  if (relativeX >= 0 && relativeX <= canvas.width) {
    paddle.x = relativeX - paddle.width / 2;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
  }
});

// Suporte para arraste direto com o dedo na tela de celulares
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

// Configuração dos botões na tela móvel (◀ e ▶)
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

// Vincula cliques dos botões da interface
pauseBtn.addEventListener('click', () => { initAudio(); togglePause(); });
restartBtn.addEventListener('click', () => { initAudio(); resetGame(); });
rankingBtn.addEventListener('click', () => { initAudio(); showLeaderboard(); });

// Alterna o estado de Pausa do jogo
function togglePause() {
  if (isCountingDown) return;

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

// Executa a contagem regressiva 3, 2, 1, JÁ!
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

// 🛠️ FIX 2: Reposiciona bola e raquete com sorteio angular aleatório para a bola
function resetBallAndPaddle() {
  paddle.width = paddle.baseWidth;
  paddle.status = 'normal';
  paddle.x = (canvas.width - paddle.width) / 2;
  
  // Limpa estado residual das teclas direcionais
  keys.left = false;
  keys.right = false;

  ball.speed = ball.baseSpeed + (level - 1) * 0.5;
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 40;
  
  // Gera variação angular aleatória real na saída da bola
  const randomAngle = (Math.random() * (Math.PI / 2.5)) - (Math.PI / 5);
  const direction = Math.random() > 0.5 ? 1 : -1;

  ball.dx = ball.speed * Math.sin(randomAngle) * direction;
  ball.dy = -Math.abs(ball.speed * Math.cos(randomAngle));
}

// Reinicia o jogo por completo ao perder ou clicar em reiniciar
function resetGame() {
  score = 0;
  level = 1;
  lives = 3;
  powerups = [];
  particles = [];
  updateHUD();
  initBricks();
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

// Atualiza o painel HUD na tela
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

// Funções de Desenho no Canvas
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
  
  if (ball.speed > 6.0) {
    ctx.fillStyle = '#f97316';
  } else if (ball.speed < 4.0) {
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

// Lógica de Física e Colisões
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

  // Perder Vida
  if (ball.y + ball.radius > canvas.height) {
    lives--;
    updateHUD();
    if (lives <= 0) {
      playSound('hit');
      saveLeaderboardScore(score);
      resetGame();
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
          score += 10;
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
    ball.baseSpeed += 0.5;
    updateHUD();
    initBricks();
    resetBallAndPaddle();
    cancelAnimationFrame(animationId);
    startCountdown(() => {
      loop();
    });
  }
}

// 🏆 LÓGICA DO RANKING DO CAMPEONATO
const MAX_LEADERBOARD_ENTRIES = 5;

function getLeaderboard() {
  return JSON.parse(localStorage.getItem('breakout_leaderboard')) || [];
}

// 🛠️ FIX 1: Limpa as teclas para a raquete não ir para o canto sozinha após o prompt
function saveLeaderboardScore(newScore) {
  if (newScore <= 0) return;

  let leaderboard = getLeaderboard();
  
  const playerName = prompt(`🎉 Fim de jogo! Você fez ${newScore} pontos.\nDigite seu nome para o Ranking:`) || "Jogador Anônimo";

  // Reseta estado das teclas
  keys.left = false;
  keys.right = false;

  leaderboard.push({ name: playerName.trim().substring(0, 12), score: newScore });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, MAX_LEADERBOARD_ENTRIES);
  
  localStorage.setItem('breakout_leaderboard', JSON.stringify(leaderboard));
  showLeaderboard();
}

function showLeaderboard() {
  const leaderboard = getLeaderboard();
  const listEl = document.getElementById('leaderboard-list');
  const modal = document.getElementById('leaderboard-modal');

  if (!listEl || !modal) return;

  listEl.innerHTML = '';
  if (leaderboard.length === 0) {
    listEl.innerHTML = '<li>Nenhuma pontuação salva ainda.</li>';
  } else {
    leaderboard.forEach((entry) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${entry.name}</strong>: ${entry.score} pts`;
      listEl.appendChild(li);
    });
  }

  modal.classList.remove('hidden');
}

document.getElementById('close-leaderboard-btn')?.addEventListener('click', () => {
  document.getElementById('leaderboard-modal')?.classList.add('hidden');
});

// Loop Principal
function loop() {
  if (isPaused || isCountingDown) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBricks();
  drawPaddle();
  drawBall();
  drawPowerups();
  updateParticles();

  movePaddle();
  moveBall();
  movePowerups();
  collisionDetection();

  animationId = requestAnimationFrame(loop);
}

// Inicialização
initBricks();
updateHUD();
startCountdown(() => {
  loop();
});