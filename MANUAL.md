# 📖 Manual Completo do Desenvolvedor - Quebra-Blocos Arcade Pro

Este manual detalha o funcionamento de cada seção e variável dos 3 arquivos do projeto.

---

## 📄 1. Estrutura HTML (`index.html`)

O HTML monta a árvore de elementos DOM (Document Object Model) da aplicação.

### **Seção `<head>`: Metadados e Estilos**
* **`<meta charset="UTF-8">`**: Garante o suporte a caracteres especiais e acentuação (PT-BR).
* **`<meta name="viewport" content="width=device-width, initial-scale=1.0">`**: Torna a página responsiva para telas de celulares e tablets.
* **`<link rel="stylesheet" href="style.css">`**: Conecta o arquivo CSS externo ao documento.

### **Seção `<body>`: A Interface do Jogo**
* **`<header class="hud">`**: Painel superior do jogo.
  * `#score`: Span que exibe os pontos atuais do jogador.
  * `#high-score`: Span que exibe o recorde local gravado no navegador.
  * `#level`: Span que exibe o nível/fase atual.
  * `#lives`: Span visual que exibe as vidas restantes (ícones de coração).
* **`<canvas id="gameCanvas" width="600" height="450">`**: 
  * A resolução interna da área de desenho é fixada em `600x450` pixels.
* **`<div class="controls">`**:
  * Botões interativos do painel de controle (`Pausar`, `Reiniciar`, `Ranking`).
* **`<div class="mobile-controls">`**:
  * Botões direcionais virtuais (`btn-left` e `btn-right`) ativados por eventos de toque na tela (`touchstart`/`touchend`).
* **`<div id="leaderboard-modal" class="modal hidden">`**:
  * A caixa de diálogo do Ranking Global. Inicia com a classe `hidden` (escondida) e é exibida alternando essa classe via JavaScript.

### **Importação dos Scripts (Firebase + Jogo)**
* **`firebase-app-compat.js`**: Biblioteca base para usar os serviços do Firebase.
* **`firebase-database-compat.js`**: Módulo específico do banco de dados em tempo real.
* **`script.js`**: Onde reside toda a inteligência do jogo (carregado por último para garantir que os elementos do HTML já existam na memória).

---

## 🎨 2. Estilização CSS (`style.css`)

O CSS aplica estilos visuais, animações e garante o layout responsivo.

### **Layout Global (`body`)**
* **`background-color: #0f172a`**: Define o fundo escuro azulado estilo *Dark Mode*.
* **`display: flex` / `flex-direction: column`**: Alinha o cabeçalho, o canvas e os botões verticalmente no centro da tela.
* **`user-select: none`**: Impede que o texto ou os botões fiquem selecionados ao clicar rapidamente.

### **Efeitos de Neon no Canvas (`#gameCanvas`)**
* **`border: 2px solid #38bdf8`**: Cria uma borda fina azul vibrante.
* **`box-shadow: 0 0 15px rgba(56, 189, 248, 0.2)`**: Aplica um efeito de brilho difuso neon ao redor do quadro do jogo.

### **Responsividade Mobile (`@media (max-width: 600px)`)**
* Redimensiona o Canvas dinamicamente para caber em telas pequenas.
* Exibe os botões de controle de toque (`.mobile-controls`) apenas em telas menores ou dispositivos móveis.

---

## ⚙️ 3. Lógica em JavaScript (`script.js`)

O motor de física, lógica de jogo e comunicação com a API do banco de dados.

### **A. Variáveis Principais de Estado**
* **`canvas` / `ctx`**: O contexto `2d` usado para executar comandos de pintura como `fillRect()`, `arc()`, e `fillText()`.
* **`score` / `lives` / `level`**: Variáveis que armazenam a pontuação atual, número de vidas (iniciando em 3) e o nível do jogador.
* **`ball`**: Objeto contendo coordenadas (`x`, `y`), raio (`radius`), velocidade total (`speed`) e vetores de direção (`dx`, `dy`).
* **`paddle`**: Objeto com posição (`x`, `y`), largura (`width`), altura (`height`) e velocidade de deslocamento (`speed`).

### **B. Estrutura e Matriz dos Blocos (`bricks`)**
Os blocos são organizados em uma matriz bidimensional (linhas x colunas):
* **Propriedades de cada bloco**:
  * `x`, `y`: Posição na tela.
  * `status`: Se for `1`, o bloco é desenhado e tem colisão; se for `0`, ele foi destruído.
  * `color`: Define a cor baseada na linha em que o bloco está posicionado.

### **C. O Loop Principal (`loop()`)**
O fluxo contínuo executado quadro a quadro:
1. **`ctx.clearRect(0, 0, canvas.width, canvas.height)`**: Apaga a tela por completo.
2. **`drawBricks()`**: Varre a matriz de blocos e desenha os que estão com `status === 1`.
3. **`drawPaddle()` & `drawBall()`**: Redesenha a raquete e a bolinha em suas posições atualizadas.
4. **`movePaddle()`**: Atualiza a posição X da raquete com base nas setas do teclado ou botões touch acionados.
5. **`moveBall()`**: Soma os vetores `dx` e `dy` às coordenadas atuais da bola.
6. **`collisionDetection()`**: Checa colisões entre bola, paredes, raquete e blocos.
7. **`requestAnimationFrame(loop)`**: Pede ao navegador para chamar a função `loop` novamente no próximo frame de renderização (mantendo ~60 FPS).

### **D. Física de Colisão**
* **Colisão com Paredes**: Se `ball.x + ball.dx` ultrapassar as bordas laterais, o vetor horizontal inverte (`ball.dx = -ball.dx`).
* **Colisão com o Teto**: Se a bola atinge a borda superior (`y <= 0`), inverte o vetor vertical (`ball.dy = -ball.dy`).
* **Queda (Perda de Vida)**: Se a bola passa da borda inferior (`y >= canvas.height`), o jogador perde 1 vida e a bola reseta a posição.
* **Rebatimento na Raquete**: 
  Calcula o ponto onde a bola bateu no bastão para projetar um ângulo de saída diferente:
  ```javascript
  let collidePoint = ball.x - (paddle.x + paddle.width / 2);
  collidePoint = collidePoint / (paddle.width / 2);
  let angle = collidePoint * (Math.PI / 3); // Ângulo máximo de 60º
  ball.dx = ball.speed * Math.sin(angle);
  ball.dy = -ball.speed * Math.cos(angle);