/* ==========================================================================
   1. INICIALIZAÇÃO E CAPTURA DE ELEMENTOS DO DOM
   ========================================================================== */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Elementos da Interface (HUD)
const scoreText = document.getElementById("scoreText");
const highScoreText = document.getElementById("highScoreText");
const levelText = document.getElementById("levelText");
const livesContainer = document.getElementById("livesContainer");

// Elementos do Menu e Botões
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlaySub = document.getElementById("overlaySub");
const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");

const btnLeft = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");

/* ==========================================================================
   2. SISTEMA DE ÁUDIO SINTÉTICO (WEB AUDIO API)
   ========================================================================== */
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

// Inicializa o contexto de áudio sob interação do usuário
function initAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Emite diferentes frequências sonoras baseadas na ação
function playSound(type) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'hit') {
    // Som de colisão simples com parede/raquete
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.start(now); osc.stop(now + 0.08);
  } else if (type === 'brick') {
    // Som ao destruir um bloco
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now); osc.stop(now + 0.1);
  } else if (type === 'powerup') { 
    // Som positivo (coletar bolinha verde)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(783.99, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now); osc.stop(now + 0.2);
  } else if (type === 'debuff') { 
    // Som negativo (coletar bolinha vermelha)
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now); osc.stop(now + 0.2);
  } else if (type === 'gameover') {
    // Som de perda de vida / Fim de Jogo
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.5);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now); osc.stop(now + 0.5);
  }
}

/* ==========================================================================
   3. ESTADOS E CONFIGURAÇÕES GERAIS
   ========================================================================== */
let score = 0;
let highScore = localStorage.getItem("breakout_highscore") || 0;
let lives = 3;
let level = 1;

let isPlaying = false;
let isPaused = false;
let isCountingDown = false;

let animationId = null;
let modifierTimer = null; // Controla a duração dos efeitos de tamanho da raquete

// Configurações da Raquete
const DEFAULT_PADDLE_WIDTH = 60;
const POWERUP_PADDLE_WIDTH = 80;  // Largura expandida (Bolinha Verde)
const DEBUFF_PADDLE_WIDTH = 40;   // Largura reduzida (Bolinha Vermelha)

const paddle = {
  width: DEFAULT_PADDLE_WIDTH,
  height: 12,
  x: (canvas.width - DEFAULT_PADDLE_WIDTH) / 2,
  speed: 7
};

// Configurações da Bola
const BASE_BALL_SPEED = 4.5;
let maxBallSpeed = 9.5;

const ball = {
  x: canvas.width / 2,
  y: canvas.height - 30,
  radius: 6,
  speed: BASE_BALL_SPEED,
  dx: 0,
  dy: 0
};

// Estrutura dos Blocos
const brickConfig = {
  rows: 4, cols: 7, padding: 8, offsetTop: 40, offsetLeft: 25, height: 18, width: 0
};

let bricks = [];
let particles = [];
let powerUps = []; // Guarda as esferas que caem dos blocos

// Cores dos blocos baseadas nos pontos de vida (HP)
const brickColors = {
  1: { top: "#00f2fe", bottom: "#4facfe" },
  2: { top: "#43e97b", bottom: "#38f9d7" },
  3: { top: "#b06ab3", bottom: "#4568dc" },
  4: { top: "#f6d365", bottom: "#fda085" },
  5: { top: "#ff0844", bottom: "#ffb199" }
};

let rightPressed = false;
let leftPressed = false;

/* ==========================================================================
   4. EVENTOS DE CONTROLE (TECLADO, MOUSE E TOUCH)
   ========================================================================== */
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "Right" || e.key === "d" || e.key === "D") rightPressed = true;
  if (e.key === "ArrowLeft" || e.key === "Left" || e.key === "a" || e.key === "A") leftPressed = true;
  if (e.key === "p" || e.key === "P") togglePause(); // Atalho 'P' para alternar pausa
});

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowRight" || e.key === "Right" || e.key === "d" || e.key === "D") rightPressed = false;
  if (e.key === "ArrowLeft" || e.key === "Left" || e.key === "a" || e.key === "A") leftPressed = false;
});

// Movimentação via cursor do mouse
document.addEventListener("mousemove", (e) => {
  if (isPaused) return;
  const rect = canvas.getBoundingClientRect();
  if (e.clientX >= rect.left && e.clientX <= rect.right) {
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    paddle.x = mouseX - paddle.width / 2;
    keepPaddleInBounds();
  }
});

// Movimentação por arraste em telas touch
canvas.addEventListener("touchmove", (e) => {
  if (isPaused) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touchX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
  paddle.x = touchX - paddle.width / 2;
  keepPaddleInBounds();
}, { passive: false });

// Mapeamento dos botões direcionais mobile
const setupTouchBtn = (btn, isRight) => {
  const start = (e) => { e.preventDefault(); if (isRight) rightPressed = true; else leftPressed = true; };
  const end = (e) => { e.preventDefault(); if (isRight) rightPressed = false; else leftPressed = false; };
  btn.addEventListener("touchstart", start);
  btn.addEventListener("touchend", end);
  btn.addEventListener("mousedown", start);
  btn.addEventListener("mouseup", end);
  btn.addEventListener("mouseleave", end);
};

setupTouchBtn(btnLeft, false);
setupTouchBtn(btnRight, true);

// Impede que a raquete saia dos limites do canvas
function keepPaddleInBounds() {
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
}

/* ==========================================================================
   5. SISTEMA DE LÓGICA DO JOGO E FLUXO
   ========================================================================== */

// Alterna o estado do jogo entre Pausado e Ativo
function togglePause() {
  if (!isPlaying && !isPaused) return; // Não faz nada se o jogo não iniciou

  isPaused = !isPaused;

  if (isPaused) {
    isPlaying = false;
    btnPause.textContent = "▶️ Continuar";
    overlayTitle.textContent = "Jogo Pausado";
    overlaySub.textContent = "Clique em continuar para voltar à partida.";
    btnStart.classList.add("hidden");
    overlay.classList.remove("hidden");
  } else {
    isPlaying = true;
    btnPause.textContent = "⏸️ Pausar";
    overlay.classList.add("hidden");
    update(); // Retoma o loop de atualização do jogo
  }
}

// Atualiza a exibição visual das vidas
function renderLives() {
  let hearts = "";
  for (let i = 0; i < lives; i++) hearts += "❤️ ";
  livesContainer.textContent = hearts.trim();
}

// Constrói a grade de blocos de acordo com a fase
function initBricks() {
  brickConfig.rows = Math.min(4 + Math.floor((level - 1) / 2), 6);
  brickConfig.width = (canvas.width - (brickConfig.offsetLeft * 2) - (brickConfig.padding * (brickConfig.cols - 1))) / brickConfig.cols;
  bricks = [];
  
  for (let c = 0; c < brickConfig.cols; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickConfig.rows; r++) {
      let maxHp = 1;
      if (level === 2) maxHp = Math.random() > 0.5 ? 2 : 1;
      else if (level === 3) {
        const rand = Math.random();
        maxHp = rand < 0.3 ? 3 : (rand < 0.7 ? 2 : 1);
      } else if (level >= 4) {
        const rand = Math.random();
        maxHp = rand < 0.2 ? Math.min(4, 3 + Math.floor((level - 3) / 2)) : (rand < 0.6 ? 3 : (rand < 0.85 ? 2 : 1));
      }
      bricks[c][r] = { x: 0, y: 0, hp: maxHp, maxHp: maxHp };
    }
  }
}

// Reposiciona bola e raquete no início de rodadas ou fases
function resetBallAndPaddle() {
  paddle.x = (canvas.width - paddle.width) / 2;
  paddle.speed = 7 + (level - 1) * 0.5;

  ball.x = canvas.width / 2;
  ball.y = canvas.height - 30;
  ball.speed = BASE_BALL_SPEED + (level - 1) * 0.5;
  maxBallSpeed = 9 + (level - 1) * 0.8;

  const angle = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 4);
  ball.dx = ball.speed * Math.sin(angle);
  ball.dy = -ball.speed * Math.cos(angle);
}

function updateHighScoreUI() {
  highScoreText.textContent = highScore;
}

// Inicia contagem de 3 segundos antes da ação
function startCountdown(callback) {
  isCountingDown = true;
  isPlaying = false;
  isPaused = false;
  btnPause.textContent = "⏸️ Pausar";
  btnStart.classList.add("hidden");
  overlay.classList.remove("hidden");
  
  let count = 3;
  overlayTitle.textContent = count;
  overlaySub.textContent = "Prepare-se!";

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      overlayTitle.textContent = count;
    } else {
      clearInterval(timer);
      overlay.classList.add("hidden");
      btnStart.classList.remove("hidden");
      isCountingDown = false;
      isPlaying = true;
      if (callback) callback();
    }
  }, 1000);
}

// Inicia uma nova partida zerando todos os parâmetros
function startGame() {
  if (isCountingDown) return;
  initAudio();
  
  score = 0;
  lives = 3;
  level = 1;
  paddle.width = DEFAULT_PADDLE_WIDTH;
  powerUps = [];
  
  if (modifierTimer) clearTimeout(modifierTimer);

  scoreText.textContent = score;
  levelText.textContent = level;
  updateHighScoreUI();
  renderLives();

  initBricks();
  resetBallAndPaddle();

  startCountdown(() => {
    if (animationId) cancelAnimationFrame(animationId);
    update();
  });
}

// Avança para a próxima fase
function nextLevel() {
  level++;
  levelText.textContent = level;
  initBricks();
  resetBallAndPaddle();
  startCountdown(() => {
    if (animationId) cancelAnimationFrame(animationId);
    update();
  });
}

/* ==========================================================================
   6. POWER-UPS, DEBUFFS E EFETOS VISUAIS
   ========================================================================== */

// Cria partículas de explosão ao quebrar um bloco
function createParticles(x, y, color) {
  for (let i = 0; i < 6; i++) {
    particles.push({
      x: x, y: y,
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,
      radius: Math.random() * 2 + 1,
      color: color,
      life: 15
    });
  }
}

// Gera esferas especiais (20% Verde para Aumentar | 15% Vermelha para Diminuir)
function spawnPowerUp(x, y) {
  const rand = Math.random();
  if (rand < 0.20) { 
    powerUps.push({ x: x, y: y, dy: 1.8 + (level * 0.1), type: 'expand' });
  } else if (rand < 0.35) { 
    powerUps.push({ x: x, y: y, dy: 1.8 + (level * 0.1), type: 'shrink' });
  }
}

// Aplica aumento temporário da raquete (6 segundos)
function applyPaddleExpand() {
  playSound('powerup');
  paddle.width = POWERUP_PADDLE_WIDTH;
  if (modifierTimer) clearTimeout(modifierTimer);
  modifierTimer = setTimeout(() => { paddle.width = DEFAULT_PADDLE_WIDTH; }, 6000);
}

// Aplica redução temporária da raquete (6 segundos)
function applyPaddleShrink() {
  playSound('debuff');
  paddle.width = DEBUFF_PADDLE_WIDTH;
  if (modifierTimer) clearTimeout(modifierTimer);
  modifierTimer = setTimeout(() => { paddle.width = DEFAULT_PADDLE_WIDTH; }, 6000);
}

/* ==========================================================================
   7. DETECÇÃO DE COLISÕES
   ========================================================================== */
function collisionDetection() {
  let activeBricks = 0;

  for (let c = 0; c < brickConfig.cols; c++) {
    for (let r = 0; r < brickConfig.rows; r++) {
      const b = bricks[c][r];
      if (b.hp > 0) {
        activeBricks++;
        // Colisão Bola vs Bloco
        if (
          ball.x + ball.radius > b.x &&
          ball.x - ball.radius < b.x + brickConfig.width &&
          ball.y + ball.radius > b.y &&
          ball.y - ball.radius < b.y + brickConfig.height
        ) {
          ball.dy = -ball.dy;
          b.hp--;
          playSound('brick');
          
          if (b.hp === 0) {
            score += 10 * b.maxHp * level;
            scoreText.textContent = score;

            // Grava novo recorde local caso ultrapassado
            if (score > highScore) {
              highScore = score;
              localStorage.setItem("breakout_highscore", highScore);
              updateHighScoreUI();
            }

            createParticles(b.x + brickConfig.width / 2, b.y + brickConfig.height / 2, brickColors[b.maxHp].top);
            spawnPowerUp(b.x + brickConfig.width / 2, b.y + brickConfig.height / 2);
          }
        }
      }
    }
  }

  // Passa de fase se limpar todos os blocos
  if (activeBricks === 0) nextLevel();
}

/* ==========================================================================
   8. LOOP PRINCIPAL E RENDERIZAÇÃO
   ========================================================================== */
function update() {
  if (!isPlaying) return;

  // Atualização da raquete
  if (rightPressed) paddle.x += paddle.speed;
  else if (leftPressed) paddle.x -= paddle.speed;
  keepPaddleInBounds();

  // Atualização da bola
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Rebatida nas paredes laterais
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.dx = Math.abs(ball.dx);
    if (Math.abs(ball.dy) < 1.5) ball.dy = ball.dy < 0 ? -2 : 2;
    playSound('hit');
  }

  if (ball.x + ball.radius > canvas.width) {
    ball.x = canvas.width - ball.radius;
    ball.dx = -Math.abs(ball.dx);
    if (Math.abs(ball.dy) < 1.5) ball.dy = ball.dy < 0 ? -2 : 2;
    playSound('hit');
  }

  // Rebatida no teto
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.dy = Math.abs(ball.dy);
    if (Math.abs(ball.dx) < 1.5) ball.dx = (Math.random() > 0.5 ? 1.5 : -1.5);
    playSound('hit');
  }

  // Rebatida na raquete com cálculo de ângulo conforme o ponto de impacto
  if (
    ball.y + ball.radius >= canvas.height - paddle.height - 10 &&
    ball.y - ball.radius <= canvas.height - 10 &&
    ball.x + ball.radius >= paddle.x &&
    ball.x - ball.radius <= paddle.x + paddle.width
  ) {
    ball.y = canvas.height - paddle.height - 10 - ball.radius;
    if (ball.speed < maxBallSpeed) ball.speed *= 1.02;

    let collidePoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    collidePoint = Math.max(-0.85, Math.min(0.85, collidePoint));
    let angle = collidePoint * (Math.PI / 3);

    ball.dx = ball.speed * Math.sin(angle);
    ball.dy = -ball.speed * Math.cos(angle);
    playSound('hit');
  }

  // Perda de bola (queda na borda inferior)
  if (ball.y - ball.radius > canvas.height) {
    lives--;
    renderLives();
    playSound('gameover');

    if (lives === 0) {
      gameOver();
      return;
    } else {
      resetBallAndPaddle();
      startCountdown(() => {
        if (animationId) cancelAnimationFrame(animationId);
        update();
      });
      return;
    }
  }

  collisionDetection();
  draw();
  animationId = requestAnimationFrame(update);
}

// Renderiza graficamente todos os componentes da tela
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenhar Blocos
  for (let c = 0; c < brickConfig.cols; c++) {
    for (let r = 0; r < brickConfig.rows; r++) {
      const b = bricks[c][r];
      if (b.hp > 0) {
        const brickX = c * (brickConfig.width + brickConfig.padding) + brickConfig.offsetLeft;
        const brickY = r * (brickConfig.height + brickConfig.padding) + brickConfig.offsetTop;
        b.x = brickX; b.y = brickY;

        const colorPalette = brickColors[b.hp] || brickColors[1];
        const gradient = ctx.createLinearGradient(brickX, brickY, brickX, brickY + brickConfig.height);
        gradient.addColorStop(0, colorPalette.top);
        gradient.addColorStop(1, colorPalette.bottom);

        ctx.beginPath();
        ctx.roundRect(brickX, brickY, brickConfig.width, brickConfig.height, 4);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();
      }
    }
  }

  // Desenhar Raquete
  const paddleGradient = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.width, 0);
  paddleGradient.addColorStop(0, "#43e97b");
  paddleGradient.addColorStop(1, "#38f9d7");
  ctx.beginPath();
  ctx.roundRect(paddle.x, canvas.height - paddle.height - 10, paddle.width, paddle.height, 6);
  ctx.fillStyle = paddleGradient;
  ctx.fill();
  ctx.closePath();

  // Desenhar Bola
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#ffffff";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.closePath();

  // Desenhar Partículas
  particles.forEach((p, index) => {
    p.x += p.dx; p.y += p.dy; p.life--;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    if (p.life <= 0) particles.splice(index, 1);
  });

  // Desenhar Esferas Especiais (Power-ups/Debuffs caindo)
  powerUps.forEach((pu, index) => {
    pu.y += pu.dy;
    
    ctx.beginPath();
    ctx.arc(pu.x, pu.y, 7, 0, Math.PI * 2);
    
    const color = pu.type === 'expand' ? "#43e97b" : "#ff0844";
    ctx.fillStyle = color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.closePath();

    // Detecção de Coleta da Esfera pela Raquete
    if (
      pu.y >= canvas.height - paddle.height - 10 &&
      pu.x >= paddle.x &&
      pu.x <= paddle.x + paddle.width
    ) {
      if (pu.type === 'expand') applyPaddleExpand();
      else if (pu.type === 'shrink') applyPaddleShrink();

      powerUps.splice(index, 1);
    } else if (pu.y > canvas.height) {
      powerUps.splice(index, 1);
    }
  });
}

// Finaliza a partida e exibe a tela de derrota
function gameOver() {
  isPlaying = false;
  overlayTitle.textContent = "Fim de Jogo!";
  overlaySub.innerHTML = `Pontuação final: <b>${score}</b><br>🏆 Recorde: <b>${highScore}</b>`;
  btnStart.classList.remove("hidden");
  overlay.classList.remove("hidden");
}

// Inicializa a pontuação máxima gravada no carregamento
updateHighScoreUI();