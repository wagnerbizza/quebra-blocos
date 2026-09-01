// ==============================================================================
// 🎮 QUEBRA-BLOCOS ARCADE PRO - GUIA DE CUSTOMIZAÇÃO
// Use as seções com "🛠️ [ONDE ALTERAR]" para personalizar o jogo do seu jeito!
// ==============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Elementos da Interface
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownText = document.getElementById('countdown-text');

// Botões Direcionais Mobile
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');


// ==============================================================================
// 🛠️ [ONDE ALTERAR 1]: CONFIGURAÇÕES DO SINTETIZADOR DE ÁUDIO
// ==============================================================================
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
      // Som de batida no bloco/parede/raquete
      osc.type = 'triangle'; // Tipos de onda: 'sine', 'square', 'sawtooth', 'triangle'
      osc.frequency.setValueAtTime(450, now); // Frequência inicial (Tom agudo/grave)
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      
      gain.gain.setValueAtTime(0.5, now); // 🔊 VOLUME DO IMPACTO (Aumente de 0.1 até 1.0)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12); // Duração (0.12 segundos)
      
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'powerup_green' || type === 'powerup_blue') {
      // Som de Power-up Bom (Verde/Azul)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.18);
      gain.gain.setValueAtTime(0.4, now); // Volume do powerup bom
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'powerup_red' || type === 'powerup_yellow') {
      // Som de Power-up Ruim/Aceleração (Vermelho/Amarelo)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.18);
      gain.gain.setValueAtTime(0.3, now); // Volume do powerup ruim
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'count') {
      // Som da contagem regressiva (3, 2, 1)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'go') {
      // Som do "JÁ!" da contagem regressiva
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    console.log("Aguardando interação do usuário para liberar som.");
  }
}

// Liberação de áudio para dispositivos mobile
window.addEventListener('click', initAudio, { once: true });
window.addEventListener('touchstart', initAudio, { once: true });
window.addEventListener('keydown', initAudio, { once: true });


// ==============================================================================
// 🛠️ [ONDE ALTERAR 2]: EFEITOS VISUAIS E PARTÍCULAS
// ==============================================================================
let particles = [];

function createExplosion(x, y, color) {
  const quantidadeParticulas = 10; // 💥 Altere para gerar mais ou menos faíscas ao quebrar blocos
  for (let i = 0; i < quantidadeParticulas; i++) {
    particles.push({
      x: x,
      y: y,
      dx: (Math.random() - 0.5) * 6,
      dy: (Math.random() - 0.5) * 6,
      radius: Math.random() * 3 + 1, // Tamanho dos pedacinhos da explosão
      color: color,
      life: 20 // Tempo de vida das partículas na tela (em quadros)
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


// ==============================================================================
// 🛠️ [ONDE ALTERAR 3]: REGRAS BÁSICAS DO JOGO E VIDAS
// ==============================================================================
let score = 0;
let highScore = localStorage.getItem('breakout_highscore') || 0;
let level = 1;
let lives = 3; // ❤️ QUANTIDADE INICIAL DE VIDAS DO JOGADOR
let isPaused = false;
let isCountingDown = false;
let animationId = null;

highScoreEl.textContent = highScore;


// ==============================================================================
// 🛠️ [ONDE ALTERAR 4]: TAMANHO E VELOCIDADE DA RAQUETE (JOGADOR)
// ==============================================================================
const paddle = {
  width: 75,       // Largura inicial da raquete
  baseWidth: 75,   // Largura padrão sem power-ups
  largeWidth: 120, // Largura quando pega o power-up VERDE
  minWidth: 25,    // Menor largura permitida quando encolhe
  height: 12,      // Altura da raquete
  x: (canvas.width - 75) / 2,
  y: canvas.height - 25,
  speed: 7,        // 🏃 VELOCIDADE DA RAQUETE (Aumente para mover mais rápido)
  status: 'normal'
};

const keys = { right: false, left: false };


// ==============================================================================
// 🛠️ [ONDE ALTERAR 5]: VELOCIDADE E TAMANHO DA BOLA
// ==============================================================================
const ball = {
  x: canvas.width / 2,
  y: canvas.height - 40,
  radius: 7,        // ⚪ TAMANHO DA BOLA
  baseSpeed: 4.5,   // ⚡ VELOCIDADE INICIAL DA BOLA
  speed: 4.5,
  dx: 3.5,
  dy: -3.5
};


// ==============================================================================
// 🛠️ [ONDE ALTERAR 6]: QUANTIDADE, DISPOSIÇÃO E CORES DOS BLOCOS
// ==============================================================================
const brickRowCount = 5;    // 🧱 Quantidade de LINHAS de blocos
const brickColumnCount = 8; // 🧱 Quantidade de COLUNAS de blocos
const brickPadding = 8;     // Espaçamento entre um bloco e outro
const brickOffsetTop = 40;  // Distância do topo do jogo até a primeira linha
const brickOffsetLeft = 28; // Margem na esquerda
const brickWidth = 65;      // Largura de cada bloco
const brickHeight = 18;     // Altura de cada bloco

let bricks = [];

function initBricks() {
  bricks = [];
  // 🎨 CORES DOS BLOCOS (Da linha de cima para a de baixo)
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


// ==============================================================================
// 🛠️ [ONDE ALTERAR 7]: POWER-UPS (CHANCE DE CAIR E TIPOS)
// ==============================================================================
let powerups = [];

function spawnPowerup(x, y) {
  // 🎁 CHANCE DE DROP (0.25 = 25% de chance de cair um item ao quebrar o bloco)
  const dropChance = Math.min(0.35, 0.25 + level * 0.02);
  
  if (Math.random() < dropChance) {
    const rand = Math.random();
    let type = 'green';

    // Definição das probabilidades de cada item cair:
    const redThreshold = 0.25;    // 25% Vermelho (Encolhe raquete)
    const yellowThreshold = 0.70; // 45% Amarelo (Acelera bola)
    const blueThreshold = 0.85;   // 15% Azul (Lentidão na bola)
                                  // Restante: Verde (Aumenta raquete)

    if (rand < redThreshold) {
      type = 'red';
    } else if (rand < yellowThreshold) {
      type = 'yellow';
    } else if (rand < blueThreshold) {
      type = 'blue';
    } else {
      type = 'green';
    }

    powerups.push({
      x: x,
      y: y,
      radius: 6,
      dy: 2, // Velocidade que a bolinha de power-up cai
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
    ball.speed = Math.max(3.0, ball.speed - 1.2); // Desacelera a bola
    updateBallVelocity();
    playSound('powerup_blue');
  } else if (type === 'yellow') {
    ball.speed = Math.min(9.5, ball.speed + 1.5); // Acelera a bola
    updateBallVelocity();
    playSound('powerup_yellow');
  }

  if (paddle.x + paddle.width > canvas.width) {
    paddle.x = canvas.width - paddle.width;
  }
}


// ==============================================================================
// CONTROLES DE ENTRADA (TECLADO / MOUSE / TOQUE)
// ==============================================================================
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
restartBtn.addEventListener('click', () => { initAudio(); resetGame(); });

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
  
  // A cada nível vencido, aumenta levemente a velocidade base (+0.5)
  ball.speed = ball.baseSpeed + (level - 1) * 0.5;
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 40;
  
  ball.dx = (Math.random() > 0.5 ? 1 : -1) * (ball.speed * 0.7);
  ball.dy = -Math.abs(ball.speed * 0.7);
}

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


// ==============================================================================
// RENDEREIZAÇÃO VISUAL (DESENHOS NO CANVAS)
// ==============================================================================
function drawPaddle() {
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 5);
  
  // Cores da Raquete dependendo do Power-up ativado
  if (paddle.status === 'expanded') {
    ctx.fillStyle = '#22c55e'; // Verde
  } else if (paddle.status === 'shrunk') {
    ctx.fillStyle = '#ef4444'; // Vermelho
  } else {
    ctx.fillStyle = '#38bdf8'; // Azul normal
  }
  
  ctx.fill();
  ctx.closePath();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  
  // Cor da Bola muda se estiver muito rápida ou lenta
  if (ball.speed > 6.0) {
    ctx.fillStyle = '#f97316'; // Laranja (Rápida)
  } else if (ball.speed < 4.0) {
    ctx.fillStyle = '#38bdf8'; // Azul (Lenta)
  } else {
    ctx.fillStyle = '#f8fafc'; // Branca (Normal)
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


// ==============================================================================
// 🛠️ [ONDE ALTERAR 8]: PONTUAÇÃO E COLISÕES
// ==============================================================================
function movePaddle() {
  if (keys.right) paddle.x += paddle.speed;
  if (keys.left) paddle.x -= paddle.speed;

  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
}

function moveBall() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Bater na parede Direita/Esquerda
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

  // Bater no Teto
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.dy = Math.abs(ball.dy);
    playSound('hit');
  }

  // Bater na Raquete
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

  // Clicou no Fundo (Perder Vida)
  if (ball.y + ball.radius > canvas.height) {
    lives--;
    updateHUD();
    if (lives <= 0) {
      alert('Game Over! Sua pontuação: ' + score);
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
          score += 10; // 🎯 PONTOS GANHOS POR BLOCO QUEBRADO
          createExplosion(b.x + brickWidth / 2, b.y + brickHeight / 2, b.color);
          updateHUD();
          playSound('hit');
          spawnPowerup(b.x + brickWidth / 2, b.y + brickHeight);
        }
      }
    }
  }

  // Passar de Fase
  if (activeBricks === 0) {
    level++;
    ball.baseSpeed += 0.5; // Aumenta levemente a velocidade base no próximo nível
    updateHUD();
    initBricks();
    resetBallAndPaddle();
    cancelAnimationFrame(animationId);
    startCountdown(() => {
      loop();
    });
  }
}


// ==============================================================================
// LOOP PRINCIPAL DO JOGO (RENDERIZAÇÃO DE QUADROS)
// ==============================================================================
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