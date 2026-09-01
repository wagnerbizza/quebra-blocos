// ==============================================================================
// 🎮 QUEBRA-BLOCOS ARCADE PRO - LÓGICA E FÍSICA COMPLETA
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

// Inicializa ou retoma o contexto de áudio do navegador (exigido por políticas de navegadores)
function initAudio() {
  if (!audioCtx) {
    // Cria um novo contexto de áudio sintetizado se ele não existir
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    // Ativa o som caso o navegador o tenha colocado em estado de suspensão
    audioCtx.resume();
  }
}

// Sintetizador de efeitos sonoros sem uso de arquivos externos de áudio
function playSound(type) {
  try {
    initAudio(); // Garante áudio ativo
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Cria um oscilador (gerador de ondas sonoras) e um nó de ganho (volume)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime; // Marca o tempo preciso de início do som

    if (type === 'hit') {
      // Som de batida rápido e grave (Triangular)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'powerup_green' || type === 'powerup_blue') {
      // Som agudo ascendente para power-ups positivos (Senoide)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.18);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'powerup_red' || type === 'powerup_yellow') {
      // Som descendente áspero para debuffs (Dente de serra)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.18);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'count') {
      // Bip curto da contagem regressiva
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'go') {
      // Tom alto indicando o início do jogo ("JÁ!")
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
      dx: (Math.random() - 0.5) * 6, // Velocidade aleatória no eixo X
      dy: (Math.random() - 0.5) * 6, // Velocidade aleatória no eixo Y
      radius: Math.random() * 3 + 1,  // Raio variado de cada partícula
      color: color,                  // Cor herdada do bloco destruído
      life: 20                       // Tempo de vida em frames
    });
  }
}

// Desenha e reduz o tempo de vida das partículas na tela
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.dx; // Move no eixo X
    p.y += p.dy; // Move no eixo Y
    p.life--;    // Reduz tempo de vida

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 20; // Cria efeito de desvanecimento (fade-out)
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1.0; // Reseta a opacidade global do canvas

    if (p.life <= 0) {
      particles.splice(i, 1); // Remove partículas "mortas" da memória
    }
  }
}

// Variáveis Globais de Estado do Jogo
let score = 0;
// Recupera o recorde salvo no navegador ou define 0 por padrão
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
  x: (canvas.width - 75) / 2, // Centraliza a raquete horizontalmente
  y: canvas.height - 25,      // Posiciona próximo ao fundo
  speed: 7,                   // Velocidade de deslocamento lateral
  status: 'normal'            // Estado atual (normal, expanded, shrunk)
};

// Monitora o estado de pressionamento das teclas direcionais
const keys = { right: false, left: false };

// Objeto de propriedade da Bola
const ball = {
  x: canvas.width / 2,
  y: canvas.height - 40,
  radius: 7,
  baseSpeed: 4.5, // Velocidade base de início
  speed: 4.5,     // Velocidade dinâmica atual
  dx: 3.5,        // Direção/vetor X
  dy: -3.5        // Direção/vetor Y (negativo move para cima)
};

// Configurações da Grade de Blocos
const brickRowCount = 5;      // Linhas de blocos
const brickColumnCount = 8;   // Colunas de blocos
const brickPadding = 8;       // Espaço entre blocos
const brickOffsetTop = 40;    // Distância do topo
const brickOffsetLeft = 28;   // Distância da borda esquerda
const brickWidth = 65;        // Largura de cada bloco
const brickHeight = 18;       // Altura de cada bloco

let bricks = []; // Matriz de blocos

// Preenche e reinicia a matriz de blocos
function initBricks() {
  bricks = [];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']; // Cores das linhas
  for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
      bricks[c][r] = {
        x: 0,
        y: 0,
        status: 1, // 1 = visível/ativo, 0 = destruído
        color: colors[r % colors.length]
      };
    }
  }
}

// Array de Power-ups ativos caindo na tela
let powerups = [];

// Sorteia e cria um item de power-up quando um bloco é quebrado
function spawnPowerup(x, y) {
  // Aumenta a chance de queda conforme o nível sobe (máximo 35%)
  const dropChance = Math.min(0.35, 0.25 + level * 0.02);
  
  if (Math.random() < dropChance) {
    const rand = Math.random();
    let type = 'green';

    // Sorteio de tipos baseados em probabilidades definidas
    if (rand < 0.25) {
      type = 'red';     // 25% chance: Encolhe raquete
    } else if (rand < 0.70) {
      type = 'yellow';  // 45% chance: Bola mais rápida
    } else if (rand < 0.85) {
      type = 'blue';    // 15% chance: Bola mais lenta
    } else {
      type = 'green';   // 15% chance: Aumenta raquete
    }

    powerups.push({
      x: x,
      y: y,
      radius: 6,
      dy: 2, // Velocidade de queda do item
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
    paddle.width = paddle.largeWidth; // Expande raquete
    paddle.status = 'expanded';
    playSound('powerup_green');
  } else if (type === 'red') {
    paddle.width = Math.max(paddle.minWidth, paddle.width - 15); // Encolhe raquete
    if (paddle.width < paddle.baseWidth) paddle.status = 'shrunk';
    playSound('powerup_red');
  } else if (type === 'blue') {
    ball.speed = Math.max(3.0, ball.speed - 1.2); // Fica mais lenta
    updateBallVelocity();
    playSound('powerup_blue');
  } else if (type === 'yellow') {
    ball.speed = Math.min(9.5, ball.speed + 1.5); // Fica mais rápida
    updateBallVelocity();
    playSound('powerup_yellow');
  }

  // Previne que a raquete saia dos limites ao expandir perto da parede
  if (paddle.x + paddle.width > canvas.width) {
    paddle.x = canvas.width - paddle.width;
  }
}

// Eventos de teclado (pressionar teclas)
window.addEventListener('keydown', (e) => {
  initAudio();
  if (e.key === 'ArrowRight' || e.key === 'Right' || e.key === 'd' || e.key === 'D') keys.right = true;
  if (e.key === 'ArrowLeft' || e.key === 'Left' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.key === 'p' || e.key === 'P') togglePause(); // Tecla P pausa o jogo
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
  if (isCountingDown) return; // Impede pausar durante a contagem

  if (isPaused) {
    // Se estava pausado, faz a contagem regressiva antes de voltar a rodar
    startCountdown(() => {
      isPaused = false;
      pauseBtn.textContent = 'Pausar';
      loop();
    });
  } else {
    // Interrompe o loop do jogo e marca como pausado
    isPaused = true;
    pauseBtn.textContent = 'Continuar';
    cancelAnimationFrame(animationId);
  }
}

// Executa a contagem regressiva 3, 2, 1, JÁ!
function startCountdown(onComplete) {
  isCountingDown = true;
  countdownOverlay.classList.remove('hidden'); // Exibe a camada escura
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
      clearInterval(timer); // Finaliza o temporizador
      countdownOverlay.classList.add('hidden'); // Esconde o overlay
      isCountingDown = false;
      if (onComplete) onComplete(); // Executa o callback após o fim da contagem
    }
  }, 600);
}

// Reposiciona bola e raquete após perder vida ou subir de nível
function resetBallAndPaddle() {
  paddle.width = paddle.baseWidth;
  paddle.status = 'normal';
  paddle.x = (canvas.width - paddle.width) / 2;
  
  ball.speed = ball.baseSpeed + (level - 1) * 0.5; // Ajusta a velocidade base pelo nível
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 40;
  
  // Define direção aleatória inicial no eixo X
  ball.dx = (Math.random() > 0.5 ? 1 : -1) * (ball.speed * 0.7);
  ball.dy = -Math.abs(ball.speed * 0.7); // Sempre sobe no início
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
  livesEl.textContent = '❤️'.repeat(Math.max(0, lives)); // Repete os corações dinamicamente
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('breakout_highscore', highScore); // Salva no navegador
    highScoreEl.textContent = highScore;
  }
}

// Funções de Desenho no Canvas (Renderização)
function drawPaddle() {
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 5); // Desenha retângulo arredondado
  
  // Altera a cor da raquete dependendo dos power-ups
  if (paddle.status === 'expanded') {
    ctx.fillStyle = '#22c55e'; // Verde se expandida
  } else if (paddle.status === 'shrunk') {
    ctx.fillStyle = '#ef4444'; // Vermelho se encolhida
  } else {
    ctx.fillStyle = '#38bdf8'; // Azul padrão
  }
  
  ctx.fill();
  ctx.closePath();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2); // Desenha a bola como um círculo perfeito
  
  // Altera a cor da bola dependendo da velocidade
  if (ball.speed > 6.0) {
    ctx.fillStyle = '#f97316'; // Laranja se muito rápida
  } else if (ball.speed < 4.0) {
    ctx.fillStyle = '#38bdf8'; // Azul se lenta
  } else {
    ctx.fillStyle = '#f8fafc'; // Branco padrão
  }

  ctx.fill();
  ctx.closePath();
}

function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) { // Só desenha blocos ativos
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
    ctx.shadowBlur = 8;        // Efeito de brilho em volta do item
    ctx.shadowColor = color;
    ctx.closePath();
    ctx.shadowBlur = 0;        // Reseta o brilho
  });
}

// Lógica de Física e Colisões
function movePaddle() {
  if (keys.right) paddle.x += paddle.speed;
  if (keys.left) paddle.x -= paddle.speed;

  // Limites das paredes laterais
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
}

function moveBall() {
  ball.x += ball.dx; // Atualiza posição X
  ball.y += ball.dy; // Atualiza posição Y

  // Colisão com as paredes laterais (Esquerda / Direita)
  if (ball.x + ball.radius >= canvas.width) {
    ball.x = canvas.width - ball.radius;
    ball.dx = -Math.abs(ball.dx); // Inverte vetor X
    playSound('hit');
  } 
  else if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.dx = Math.abs(ball.dx); // Inverte vetor X
    playSound('hit');
  }

  // Colisão com o teto
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.dy = Math.abs(ball.dy); // Inverte vetor Y (manda para baixo)
    playSound('hit');
  }

  // Colisão angular inteligente com a Raquete
  if (
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + paddle.width &&
    ball.dy > 0
  ) {
    // Calcula o ponto de impacto relativo na raquete (-1 no canto esquerdo, 1 no canto direito)
    let collidePoint = ball.x - (paddle.x + paddle.width / 2);
    collidePoint = collidePoint / (paddle.width / 2);
    
    // Converte o ponto de colisão em um ângulo de rebate em radianos (máximo 60 graus)
    let angle = collidePoint * (Math.PI / 3);

    ball.dx = ball.speed * Math.sin(angle);
    ball.dy = -ball.speed * Math.cos(angle);
    ball.y = paddle.y - ball.radius;
    playSound('hit');
  }

  // Perder Vida (Bola caindo no fundo da tela)
  if (ball.y + ball.radius > canvas.height) {
    lives--;
    updateHUD();
    if (lives <= 0) {
      playSound('hit');
      saveLeaderboardScore(score); // Salva pontuação no Ranking
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
    p.y += p.dy; // Faz o item cair

    // Verifica se a raquete pegou a cápsula de power-up
    if (
      p.y + p.radius >= paddle.y &&
      p.x >= paddle.x &&
      p.x <= paddle.x + paddle.width
    ) {
      createExplosion(p.x, p.y, '#ffffff');
      applyPowerupEffect(p.type);
      powerups.splice(i, 1); // Remove item coletado
      continue;
    }

    // Remove se cair fora da tela sem ser coletado
    if (p.y - p.radius > canvas.height) {
      powerups.splice(i, 1);
    }
  }
}

// Colisão com os Blocos
function collisionDetection() {
  let activeBricks = 0;
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
        activeBricks++;
        // Detecção de sobreposição da caixa delimitadora do bloco com a bola
        if (
          ball.x + ball.radius > b.x &&
          ball.x - ball.radius < b.x + brickWidth &&
          ball.y + ball.radius > b.y &&
          ball.y - ball.radius < b.y + brickHeight
        ) {
          ball.dy = -ball.dy; // Rebate a bola
          b.status = 0;       // Destrói o bloco
          score += 10;        // Soma pontuação
          createExplosion(b.x + brickWidth / 2, b.y + brickHeight / 2, b.color); // Explosão
          updateHUD();
          playSound('hit');
          spawnPowerup(b.x + brickWidth / 2, b.y + brickHeight); // Tenta gerar item
        }
      }
    }
  }

  // Avançar de Nível ao limpar a tela inteira
  if (activeBricks === 0) {
    level++;
    ball.baseSpeed += 0.5; // Aumenta a dificuldade
    updateHUD();
    initBricks();
    resetBallAndPaddle();
    cancelAnimationFrame(animationId);
    startCountdown(() => {
      loop();
    });
  }
}

// 🏆 LÓGICA DO RANKING DO CAMPEONATO (LOCALSTORAGE)
const MAX_LEADERBOARD_ENTRIES = 5; // Limite de posições no ranking

// Lê os dados do ranking armazenados no navegador
function getLeaderboard() {
  return JSON.parse(localStorage.getItem('breakout_leaderboard')) || [];
}

// Solicita o nome e grava a pontuação no banco de dados local
function saveLeaderboardScore(newScore) {
  if (newScore <= 0) return;

  let leaderboard = getLeaderboard();
  
  // Exibe a caixa de diálogo pedindo o nome do jogador
  const playerName = prompt(`🎉 Fim de jogo! Você fez ${newScore} pontos.\nDigite seu nome para o Ranking:`) || "Jogador Anônimo";

  // Adiciona a pontuação atual
  leaderboard.push({ name: playerName.trim().substring(0, 12), score: newScore });
  // Ordena a lista da maior pontuação para a menor
  leaderboard.sort((a, b) => b.score - a.score);
  // Mantém apenas os 5 melhores registros
  leaderboard = leaderboard.slice(0, MAX_LEADERBOARD_ENTRIES);
  
  // Grava novamente no LocalStorage
  localStorage.setItem('breakout_leaderboard', JSON.stringify(leaderboard));
  showLeaderboard(); // Exibe a modal atualizada
}

// Renderiza o ranking dentro da janela Modal
function showLeaderboard() {
  const leaderboard = getLeaderboard();
  const listEl = document.getElementById('leaderboard-list');
  const modal = document.getElementById('leaderboard-modal');

  if (!listEl || !modal) return;

  listEl.innerHTML = '';
  if (leaderboard.length === 0) {
    listEl.innerHTML = '<li>Nenhuma pontuação salva ainda.</li>';
  } else {
    // Insere cada elemento no formato <li>
    leaderboard.forEach((entry) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${entry.name}</strong>: ${entry.score} pts`;
      listEl.appendChild(li);
    });
  }

  modal.classList.remove('hidden'); // Exibe a modal
}

// Botão para fechar a modal do ranking
document.getElementById('close-leaderboard-btn')?.addEventListener('click', () => {
  document.getElementById('leaderboard-modal')?.classList.add('hidden');
});

// Loop Principal de Atualização do Jogo
function loop() {
  if (isPaused || isCountingDown) return; // Interrompe caso o jogo esteja parado

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa a tela anterior

  // 1. Desenha todos os elementos estáticos e dinâmicos
  drawBricks();
  drawPaddle();
  drawBall();
  drawPowerups();
  updateParticles();

  // 2. Calcula posições e colisões para o próximo quadro
  movePaddle();
  moveBall();
  movePowerups();
  collisionDetection();

  // 3. Solicita ao navegador a execução do próximo frame (~60 FPS)
  animationId = requestAnimationFrame(loop);
}

// Inicialização da primeira partida
initBricks();
updateHUD();
startCountdown(() => {
  loop();
});